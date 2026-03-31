import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/client.js';
import { orders, listings, users, payments, trucks, drivers } from '../db/schema.js';
import { eq, and, or, desc, sql, SQL } from 'drizzle-orm';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { initializeChapaPayment, verifyChapaPayment, calculatePlatformFee, generateTxRef } from '../lib/chapa.js';
import { initializeStripePayment, verifyStripeSession, isSupportedByStripe } from '../lib/stripe.js';
import { initializeTelebirrPayment } from '../lib/telebirr.js';

const router = Router();

const createOrderSchema = z.object({
  listingId: z.string().uuid(),
  quantity: z.number().positive(),
  unit: z.string().min(1).max(15),
  pricePerUnit: z.number().positive(),
  currency: z.enum(['ETB', 'USD']).optional(),
  deliveryTerms: z.string().max(1000).optional(),
});

const counterOrderSchema = z.object({
  quantity: z.number().positive().optional(),
  pricePerUnit: z.number().positive().optional(),
  deliveryTerms: z.string().max(1000).optional(),
});

function addStatusEntry(history: any[], status: string, note?: string) {
  return [...history, { status, timestamp: new Date().toISOString(), note }];
}

function formatOrder(order: any) {
  return {
    ...order,
    quantity: Number(order.quantity),
    pricePerUnit: Number(order.pricePerUnit),
    totalPrice: Number(order.totalPrice),
    createdAt: order.createdAt instanceof Date ? order.createdAt.toISOString() : order.createdAt,
    updatedAt: order.updatedAt instanceof Date ? order.updatedAt.toISOString() : order.updatedAt,
    inspectionCompletedAt: order.inspectionCompletedAt instanceof Date ? order.inspectionCompletedAt.toISOString() : order.inspectionCompletedAt,
    escrowAutoReleaseAt: order.escrowAutoReleaseAt instanceof Date ? order.escrowAutoReleaseAt.toISOString() : order.escrowAutoReleaseAt,
    pickupConfirmedAt: order.pickupConfirmedAt instanceof Date ? order.pickupConfirmedAt.toISOString() : order.pickupConfirmedAt,
    assignedTruckId: order.assignedTruckId ?? null,
    assignedDriverId: order.assignedDriverId ?? null,
    sealNumber: order.sealNumber ?? null,
    sealPhotos: order.sealPhotos ?? [],
    pickupPhotos: order.pickupPhotos ?? [],
    sealIntact: order.sealIntact ?? null,
  };
}

// POST /orders - Create order from a listing
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const data = createOrderSchema.parse(req.body);

    const [listing] = await db
      .select()
      .from(listings)
      .where(and(eq(listings.id, data.listingId), eq(listings.status, 'active')))
      .limit(1);

    if (!listing) {
      res.status(404).json({ error: 'Listing not found or not active' });
      return;
    }

    if (listing.userId === req.userId) {
      res.status(400).json({ error: 'Cannot place order on your own listing' });
      return;
    }

    // If listing is 'sell', current user is buyer. If 'buy', current user is seller.
    const buyerId = listing.type === 'sell' ? req.userId! : listing.userId;
    const sellerId = listing.type === 'sell' ? listing.userId : req.userId!;

    const totalPrice = data.quantity * data.pricePerUnit;

    const [order] = await db
      .insert(orders)
      .values({
        listingId: data.listingId,
        buyerId,
        sellerId,
        quantity: String(data.quantity),
        unit: data.unit,
        pricePerUnit: String(data.pricePerUnit),
        totalPrice: String(totalPrice),
        currency: data.currency ?? listing.currency,
        deliveryTerms: data.deliveryTerms,
        status: 'proposed',
        escrowStatus: 'none',
        statusHistory: addStatusEntry([], 'proposed'),
      })
      .returning();

    res.status(201).json(formatOrder(order));
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    console.error('Create order error:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// GET /orders - List my orders
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const offset = (page - 1) * limit;

    const conditions: SQL[] = [];
    const role = req.query.role as string;

    if (role === 'buyer') {
      conditions.push(eq(orders.buyerId, req.userId!));
    } else if (role === 'seller') {
      conditions.push(eq(orders.sellerId, req.userId!));
    } else {
      conditions.push(
        or(eq(orders.buyerId, req.userId!), eq(orders.sellerId, req.userId!))!
      );
    }

    if (req.query.status) {
      conditions.push(eq(orders.status, req.query.status as string));
    }

    const where = and(...conditions);

    const [items, countResult] = await Promise.all([
      db
        .select({
          id: orders.id,
          listingId: orders.listingId,
          buyerId: orders.buyerId,
          sellerId: orders.sellerId,
          quantity: orders.quantity,
          unit: orders.unit,
          pricePerUnit: orders.pricePerUnit,
          totalPrice: orders.totalPrice,
          currency: orders.currency,
          deliveryTerms: orders.deliveryTerms,
          status: orders.status,
          escrowStatus: orders.escrowStatus,
          statusHistory: orders.statusHistory,
          createdAt: orders.createdAt,
          updatedAt: orders.updatedAt,
          listingTitle: listings.title,
          listingProduct: listings.productCategory,
          buyerName: sql<string>`buyer.name`.as('buyer_name'),
          sellerName: sql<string>`seller.name`.as('seller_name'),
        })
        .from(orders)
        .leftJoin(listings, eq(orders.listingId, listings.id))
        .leftJoin(
          sql`${users} as buyer`,
          sql`buyer.id = ${orders.buyerId}`
        )
        .leftJoin(
          sql`${users} as seller`,
          sql`seller.id = ${orders.sellerId}`
        )
        .where(where)
        .orderBy(desc(orders.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(orders)
        .where(where),
    ]);

    const total = countResult[0]?.count ?? 0;

    res.json({
      data: items.map((item) => ({
        ...formatOrder(item),
        listing: { title: item.listingTitle, productCategory: item.listingProduct },
        buyer: { id: item.buyerId, name: item.buyerName },
        seller: { id: item.sellerId, name: item.sellerName },
      })),
      page,
      limit,
      total,
      hasMore: offset + limit < total,
    });
  } catch (error) {
    console.error('List orders error:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// GET /orders/:id - Order detail
router.get('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, req.params.id as string))
      .limit(1);

    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    if (order.buyerId !== req.userId && order.sellerId !== req.userId) {
      res.status(403).json({ error: 'Not authorized to view this order' });
      return;
    }

    // Fetch listing and user info
    const [[listing], [buyer], [seller]] = await Promise.all([
      db.select({ title: listings.title, productCategory: listings.productCategory })
        .from(listings).where(eq(listings.id, order.listingId)).limit(1),
      db.select({ id: users.id, name: users.name, phone: users.phone })
        .from(users).where(eq(users.id, order.buyerId)).limit(1),
      db.select({ id: users.id, name: users.name, phone: users.phone })
        .from(users).where(eq(users.id, order.sellerId)).limit(1),
    ]);

    res.json({
      ...formatOrder(order),
      listing,
      buyer,
      seller,
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// Helper to update order status with validation
async function transitionOrder(
  orderId: string,
  userId: string,
  allowedFrom: string[],
  requiredRole: 'buyer' | 'seller' | 'either',
  newStatus: string,
  updates: Record<string, any> = {},
  note?: string,
) {
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  if (!order) return { error: 'Order not found', status: 404 };

  if (requiredRole === 'buyer' && order.buyerId !== userId) {
    return { error: 'Only the buyer can perform this action', status: 403 };
  }
  if (requiredRole === 'seller' && order.sellerId !== userId) {
    return { error: 'Only the seller can perform this action', status: 403 };
  }
  if (requiredRole === 'either' && order.buyerId !== userId && order.sellerId !== userId) {
    return { error: 'Not authorized', status: 403 };
  }

  if (!allowedFrom.includes(order.status)) {
    return { error: `Cannot transition from '${order.status}' to '${newStatus}'`, status: 400 };
  }

  const history = Array.isArray(order.statusHistory) ? order.statusHistory : [];

  const [updated] = await db
    .update(orders)
    .set({
      status: newStatus,
      statusHistory: addStatusEntry(history as any[], newStatus, note),
      updatedAt: new Date(),
      ...updates,
    })
    .where(eq(orders.id, orderId))
    .returning();

  return { data: formatOrder(updated) };
}

// PUT /orders/:id/accept
router.put('/:id/accept', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const [order] = await db.select().from(orders).where(eq(orders.id, req.params.id as string)).limit(1);
    if (!order) { res.status(404).json({ error: 'Order not found' }); return; }

    // The receiving party accepts: if proposed by buyer, seller accepts. If countered, the other party accepts.
    const isReceiver = (order.status === 'proposed' && order.sellerId === req.userId) ||
                       (order.status === 'countered' && (order.buyerId === req.userId || order.sellerId === req.userId));

    if (!isReceiver) {
      res.status(403).json({ error: 'Only the receiving party can accept' });
      return;
    }

    const result = await transitionOrder(req.params.id as string, req.userId!, ['proposed', 'countered'], 'either', 'accepted');
    if (result.error) { res.status(result.status!).json({ error: result.error }); return; }
    res.json(result.data);
  } catch (error) {
    console.error('Accept order error:', error);
    res.status(500).json({ error: 'Failed to accept order' });
  }
});

// PUT /orders/:id/reject
router.put('/:id/reject', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const result = await transitionOrder(req.params.id as string, req.userId!, ['proposed', 'countered'], 'either', 'rejected');
    if (result.error) { res.status(result.status!).json({ error: result.error }); return; }
    res.json(result.data);
  } catch (error) {
    console.error('Reject order error:', error);
    res.status(500).json({ error: 'Failed to reject order' });
  }
});

// PUT /orders/:id/counter
router.put('/:id/counter', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const data = counterOrderSchema.parse(req.body);
    const updates: Record<string, any> = {};

    if (data.quantity != null) {
      updates.quantity = String(data.quantity);
    }
    if (data.pricePerUnit != null) {
      updates.pricePerUnit = String(data.pricePerUnit);
    }
    if (data.deliveryTerms != null) {
      updates.deliveryTerms = data.deliveryTerms;
    }

    // Recalculate total if quantity or price changed
    const [order] = await db.select().from(orders).where(eq(orders.id, req.params.id as string)).limit(1);
    if (order) {
      const qty = data.quantity ?? Number(order.quantity);
      const price = data.pricePerUnit ?? Number(order.pricePerUnit);
      updates.totalPrice = String(qty * price);
    }

    const result = await transitionOrder(req.params.id as string, req.userId!, ['proposed', 'countered'], 'either', 'countered', updates);
    if (result.error) { res.status(result.status!).json({ error: result.error }); return; }
    res.json(result.data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    console.error('Counter order error:', error);
    res.status(500).json({ error: 'Failed to counter order' });
  }
});

// PUT /orders/:id/pay - Initialize escrow payment (buyer only)
// Body: { gateway?: 'chapa' | 'stripe' }
// Auto-routing: ETB → Chapa, USD/EUR/etc → Stripe (buyer can override)
router.put('/:id/pay', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const orderId = req.params.id as string;
    const { gateway: requestedGateway } = req.body as { gateway?: 'chapa' | 'stripe' | 'telebirr' };

    const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!order) { res.status(404).json({ error: 'Order not found' }); return; }
    if (order.buyerId !== req.userId) { res.status(403).json({ error: 'Only the buyer can initiate payment' }); return; }
    if (order.status !== 'accepted') { res.status(400).json({ error: `Cannot pay order with status '${order.status}'` }); return; }

    // Fetch buyer + listing info
    const [[buyer], [listing]] = await Promise.all([
      db.select({ name: users.name }).from(users).where(eq(users.id, req.userId!)).limit(1),
      db.select({ title: listings.title, productCategory: listings.productCategory, quantity: listings.quantity, unit: listings.unit })
        .from(listings).where(eq(listings.id, order.listingId)).limit(1),
    ]);

    const amount = Number(order.totalPrice);
    const platformFee = calculatePlatformFee(amount);
    const txRef = generateTxRef(orderId);

    const baseUrl = process.env.RENDER_EXTERNAL_URL || process.env.API_BASE_URL || 'http://localhost:3000';
    const appUrl = process.env.EXPO_PUBLIC_APP_URL || 'https://t.me/NileXportBot/app';
    const returnUrl = `${appUrl}?order=${orderId}&payment=complete`;
    const cancelUrl = `${appUrl}?order=${orderId}&payment=cancelled`;

    // Smart gateway routing: explicit override > currency-based auto-select
    // ETB + no override → Chapa; USD/EUR/etc → Stripe; Telebirr = explicit only
    const gateway: 'chapa' | 'stripe' | 'telebirr' = requestedGateway
      ?? (isSupportedByStripe(order.currency) ? 'stripe' : 'chapa');

    let checkoutUrl: string;
    let stripeSessionId: string | undefined;

    if (gateway === 'stripe') {
      const result = await initializeStripePayment({
        amount,
        currency: order.currency,
        txRef,
        orderId,
        productTitle: listing?.title || listing?.productCategory || 'Agricultural Commodity',
        quantity: Number(order.quantity),
        unit: order.unit,
        successUrl: returnUrl,
        cancelUrl,
      });
      checkoutUrl = result.checkoutUrl;
      stripeSessionId = result.sessionId;
    } else if (gateway === 'telebirr') {
      const result = await initializeTelebirrPayment({
        amount,
        txRef,
        subject: listing?.title || listing?.productCategory || 'Agricultural Commodity',
        notifyUrl: `${baseUrl}/api/v1/payments/webhook/telebirr`,
        returnUrl,
      });
      checkoutUrl = result.checkoutUrl;
    } else {
      const result = await initializeChapaPayment({
        amount,
        currency: order.currency,
        buyerName: buyer?.name || 'Buyer',
        txRef,
        callbackUrl: `${baseUrl}/api/v1/payments/webhook/chapa`,
        returnUrl,
        title: `Order Payment — Nile Xport`,
      });
      checkoutUrl = result.checkoutUrl;
    }

    // Record pending payment
    await db.insert(payments).values({
      orderId,
      txRef,
      gateway,
      amount: String(amount),
      currency: order.currency,
      platformFee: String(platformFee),
      status: 'pending',
      stripeSessionId: stripeSessionId || null,
    });

    // Store txRef on order
    await db.update(orders)
      .set({ paymentTxRef: txRef, platformFeeAmount: String(platformFee), updatedAt: new Date() })
      .where(eq(orders.id, orderId));

    res.json({ checkoutUrl, txRef, gateway, amount, platformFee, currency: order.currency });
  } catch (error) {
    console.error('Pay order error:', error);
    res.status(500).json({ error: 'Failed to initialize payment' });
  }
});

// GET /orders/:id/payment-status - Poll payment status (buyer only)
router.get('/:id/payment-status', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const orderId = req.params.id as string;
    const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!order) { res.status(404).json({ error: 'Order not found' }); return; }
    if (order.buyerId !== req.userId && order.sellerId !== req.userId) {
      res.status(403).json({ error: 'Not authorized' }); return;
    }

    // If already confirmed by webhook, return current status
    if (order.escrowStatus === 'held') {
      res.json({ paymentStatus: 'success', orderStatus: order.status, escrowStatus: order.escrowStatus });
      return;
    }

    if (!order.paymentTxRef) {
      res.json({ paymentStatus: 'not_initiated', orderStatus: order.status, escrowStatus: order.escrowStatus });
      return;
    }

    // Look up payment record to know which gateway was used
    const [payment] = await db.select().from(payments).where(eq(payments.txRef, order.paymentTxRef)).limit(1);

    let verifyResult: { status: 'success' | 'failed' | 'pending'; ref?: string; raw?: any };

    if (payment?.gateway === 'stripe' && payment.stripeSessionId) {
      const r = await verifyStripeSession(payment.stripeSessionId);
      verifyResult = { status: r.status, ref: r.paymentIntentId };
    } else {
      const r = await verifyChapaPayment(order.paymentTxRef);
      verifyResult = { status: r.status, ref: r.chapaRef, raw: r.raw };
    }

    if (verifyResult.status === 'success') {
      const history = Array.isArray(order.statusHistory) ? order.statusHistory : [];
      const gateway = payment?.gateway || 'chapa';
      const [updated] = await db.update(orders)
        .set({
          status: 'payment_held',
          escrowStatus: 'held',
          statusHistory: addStatusEntry(history, 'payment_held', `Payment confirmed via ${gateway}`),
          updatedAt: new Date(),
        })
        .where(eq(orders.id, orderId))
        .returning();

      await db.update(payments)
        .set({ status: 'success', chapaRef: verifyResult.ref || null, chapaResponse: verifyResult.raw || null, updatedAt: new Date() })
        .where(eq(payments.txRef, order.paymentTxRef));

      res.json({ paymentStatus: 'success', orderStatus: updated.status, escrowStatus: updated.escrowStatus });
    } else {
      res.json({ paymentStatus: verifyResult.status, orderStatus: order.status, escrowStatus: order.escrowStatus });
    }
  } catch (error) {
    console.error('Payment status error:', error);
    res.status(500).json({ error: 'Failed to check payment status' });
  }
});

// POST /orders/:id/assign-inspector (admin only)
router.post('/:id/assign-inspector', authMiddleware, async (req: AuthRequest, res) => {
  try {
    if (req.userRole !== 'admin') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }

    const { inspectorId } = z.object({ inspectorId: z.string().uuid() }).parse(req.body);

    const [order] = await db.select().from(orders).where(eq(orders.id, req.params.id as string)).limit(1);
    if (!order) { res.status(404).json({ error: 'Order not found' }); return; }
    if (order.status !== 'payment_held') {
      res.status(400).json({ error: `Order must be in 'payment_held' status to assign inspector` });
      return;
    }

    // Verify inspector exists
    const [inspector] = await db.select({ id: users.id }).from(users).where(eq(users.id, inspectorId)).limit(1);
    if (!inspector) { res.status(404).json({ error: 'Inspector user not found' }); return; }

    const history = Array.isArray(order.statusHistory) ? order.statusHistory : [];
    const [updated] = await db.update(orders)
      .set({
        inspectorId,
        inspectionStatus: 'pending',
        statusHistory: addStatusEntry(history, 'inspector_assigned', `Inspector assigned`),
        updatedAt: new Date(),
      })
      .where(eq(orders.id, req.params.id as string))
      .returning();

    res.json(formatOrder(updated));
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    console.error('Assign inspector error:', error);
    res.status(500).json({ error: 'Failed to assign inspector' });
  }
});

// POST /orders/:id/inspection (inspector only)
router.post('/:id/inspection', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const data = z.object({
      result: z.enum(['passed', 'failed']),
      notes: z.string().max(2000).optional(),
      photos: z.array(z.string()).optional(),
      sealNumber: z.string().max(50).optional(),
      sealPhotos: z.array(z.string()).optional(),
    }).parse(req.body);

    const [order] = await db.select().from(orders).where(eq(orders.id, req.params.id as string)).limit(1);
    if (!order) { res.status(404).json({ error: 'Order not found' }); return; }

    if (order.inspectorId !== req.userId) {
      res.status(403).json({ error: 'Only the assigned inspector can submit an inspection' });
      return;
    }
    if (order.inspectionStatus !== 'pending') {
      res.status(400).json({ error: `Inspection is not pending (current: ${order.inspectionStatus})` });
      return;
    }

    const history = Array.isArray(order.statusHistory) ? order.statusHistory : [];
    const now = new Date();

    if (data.result === 'passed') {
      const noteWithSeal = data.sealNumber
        ? `${data.notes ? data.notes + ' | ' : ''}Seal: ${data.sealNumber}`
        : data.notes;
      const [updated] = await db.update(orders)
        .set({
          inspectionStatus: 'passed',
          inspectionNotes: data.notes ?? null,
          inspectionPhotos: data.photos ?? [],
          inspectionCompletedAt: now,
          sealNumber: data.sealNumber ?? null,
          sealPhotos: data.sealPhotos ?? [],
          statusHistory: addStatusEntry(history, 'inspection_passed', noteWithSeal),
          updatedAt: now,
        })
        .where(eq(orders.id, req.params.id as string))
        .returning();
      res.json(formatOrder(updated));
    } else {
      const [updated] = await db.update(orders)
        .set({
          inspectionStatus: 'failed',
          inspectionNotes: data.notes ?? null,
          inspectionPhotos: data.photos ?? [],
          inspectionCompletedAt: now,
          status: 'inspection_failed',
          escrowStatus: 'refunded',
          statusHistory: addStatusEntry(history, 'inspection_failed', data.notes),
          updatedAt: now,
        })
        .where(eq(orders.id, req.params.id as string))
        .returning();
      res.json(formatOrder(updated));
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    console.error('Inspection error:', error);
    res.status(500).json({ error: 'Failed to submit inspection' });
  }
});

// POST /orders/:id/assign-truck (admin only)
router.post('/:id/assign-truck', authMiddleware, async (req: AuthRequest, res) => {
  try {
    if (req.userRole !== 'admin') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }

    const { truckId, driverId } = z.object({
      truckId: z.string().uuid(),
      driverId: z.string().uuid(),
    }).parse(req.body);

    const [order] = await db.select().from(orders).where(eq(orders.id, req.params.id as string)).limit(1);
    if (!order) { res.status(404).json({ error: 'Order not found' }); return; }

    if (order.inspectionStatus !== 'passed') {
      res.status(400).json({ error: `Order inspection must have passed (current: ${order.inspectionStatus ?? 'none'})` });
      return;
    }
    if (order.status !== 'payment_held') {
      res.status(400).json({ error: `Order must be in 'payment_held' status (current: ${order.status})` });
      return;
    }

    // Verify truck and driver exist
    const [[truck], [driver]] = await Promise.all([
      db.select({ id: trucks.id, plateNumber: trucks.plateNumber }).from(trucks).where(eq(trucks.id, truckId)).limit(1),
      db.select({ id: drivers.id, name: drivers.name }).from(drivers).where(eq(drivers.id, driverId)).limit(1),
    ]);
    if (!truck) { res.status(404).json({ error: 'Truck not found' }); return; }
    if (!driver) { res.status(404).json({ error: 'Driver not found' }); return; }

    const history = Array.isArray(order.statusHistory) ? order.statusHistory : [];
    const [updated] = await db.update(orders)
      .set({
        assignedTruckId: truckId,
        assignedDriverId: driverId,
        statusHistory: addStatusEntry(history, 'truck_assigned', `Truck assigned: ${truck.plateNumber}, Driver: ${driver.name}`),
        updatedAt: new Date(),
      })
      .where(eq(orders.id, req.params.id as string))
      .returning();

    res.json(formatOrder(updated));
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    console.error('Assign truck error:', error);
    res.status(500).json({ error: 'Failed to assign truck' });
  }
});

// PUT /orders/:id/ship - Seller confirms driver pickup (seller only)
router.put('/:id/ship', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const data = z.object({
      pickupPhotos: z.array(z.string()).optional(),
    }).parse(req.body);

    const [order] = await db.select().from(orders).where(eq(orders.id, req.params.id as string)).limit(1);
    if (!order) { res.status(404).json({ error: 'Order not found' }); return; }
    if (order.sellerId !== req.userId) { res.status(403).json({ error: 'Only the seller can confirm driver pickup' }); return; }
    if (order.status !== 'payment_held') {
      res.status(400).json({ error: `Cannot confirm pickup for order with status '${order.status}'` });
      return;
    }

    // Block shipping if inspection was assigned and didn't pass
    if (order.inspectionStatus && order.inspectionStatus !== 'passed') {
      res.status(400).json({ error: `Cannot confirm pickup: inspection status is '${order.inspectionStatus}'` });
      return;
    }

    // Truck must have been assigned by platform
    if (!order.assignedTruckId) {
      res.status(400).json({ error: 'A truck must be assigned by the platform before confirming pickup' });
      return;
    }

    const history = Array.isArray(order.statusHistory) ? order.statusHistory : [];
    const now = new Date();
    const autoReleaseAt = new Date(now.getTime() + 72 * 60 * 60 * 1000); // NOW + 72hr

    const [updated] = await db.update(orders)
      .set({
        status: 'shipped',
        pickupConfirmedAt: now,
        pickupPhotos: data.pickupPhotos ?? [],
        escrowAutoReleaseAt: autoReleaseAt,
        statusHistory: addStatusEntry(history, 'shipped', 'Driver pickup confirmed by seller'),
        updatedAt: now,
      })
      .where(eq(orders.id, req.params.id as string))
      .returning();

    res.json(formatOrder(updated));
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    console.error('Ship order error:', error);
    res.status(500).json({ error: 'Failed to confirm pickup' });
  }
});

// PUT /orders/:id/confirm-delivery - Buyer confirms receipt, releases escrow
router.put('/:id/confirm-delivery', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { photos, sealIntact } = z.object({
      sealIntact: z.enum(['yes', 'no']),
      photos: z.array(z.string()).optional(),
    }).parse(req.body);

    const [order] = await db.select().from(orders).where(eq(orders.id, req.params.id as string)).limit(1);
    if (!order) { res.status(404).json({ error: 'Order not found' }); return; }
    if (order.buyerId !== req.userId) { res.status(403).json({ error: 'Only the buyer can confirm delivery' }); return; }
    if (order.status !== 'shipped') {
      res.status(400).json({ error: `Cannot confirm delivery for order with status '${order.status}'` });
      return;
    }

    const history = Array.isArray(order.statusHistory) ? order.statusHistory : [];
    const now = new Date();

    if (sealIntact === 'no') {
      // Broken seal — open dispute, keep escrow held
      const [updated] = await db.update(orders)
        .set({
          status: 'disputed',
          sealIntact: 'no',
          deliveryPhotos: photos && photos.length > 0 ? photos : order.deliveryPhotos,
          statusHistory: addStatusEntry(history, 'disputed', 'Buyer reported broken seal on delivery'),
          updatedAt: now,
        })
        .where(eq(orders.id, req.params.id as string))
        .returning();
      res.json(formatOrder(updated));
    } else {
      // Seal intact — complete order, release escrow
      const [updated] = await db.update(orders)
        .set({
          status: 'completed',
          sealIntact: 'yes',
          escrowStatus: 'released',
          escrowAutoReleaseAt: null,
          deliveryPhotos: photos && photos.length > 0 ? photos : order.deliveryPhotos,
          statusHistory: addStatusEntry(history, 'completed', 'Delivery confirmed by buyer — seal intact'),
          updatedAt: now,
        })
        .where(eq(orders.id, req.params.id as string))
        .returning();
      res.json(formatOrder(updated));
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    console.error('Confirm delivery error:', error);
    res.status(500).json({ error: 'Failed to confirm delivery' });
  }
});

// GET /orders/auto-release-check (admin only or cron)
router.get('/auto-release-check', authMiddleware, async (req: AuthRequest, res) => {
  try {
    if (req.userRole !== 'admin') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }

    const now = new Date();
    const overdueOrders = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.status, 'shipped'),
          eq(orders.escrowStatus, 'held'),
          sql`${orders.escrowAutoReleaseAt} < ${now}`
        )
      );

    let released = 0;
    for (const order of overdueOrders) {
      const history = Array.isArray(order.statusHistory) ? order.statusHistory : [];
      await db.update(orders)
        .set({
          status: 'completed',
          escrowStatus: 'released',
          statusHistory: addStatusEntry(history as any[], 'completed', 'Auto-released after 72hr delivery window'),
          updatedAt: now,
        })
        .where(eq(orders.id, order.id));
      released++;
    }

    res.json({ released, message: `Auto-released ${released} order(s)` });
  } catch (error) {
    console.error('Auto-release check error:', error);
    res.status(500).json({ error: 'Failed to run auto-release check' });
  }
});

// PUT /orders/:id/dispute - Open dispute
router.put('/:id/dispute', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { reason } = z.object({ reason: z.string().min(1).max(1000) }).parse(req.body);
    const result = await transitionOrder(
      req.params.id as string, req.userId!, ['shipped', 'delivered'], 'either', 'disputed',
      {}, reason
    );
    if (result.error) { res.status(result.status!).json({ error: result.error }); return; }
    res.json(result.data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    console.error('Dispute order error:', error);
    res.status(500).json({ error: 'Failed to open dispute' });
  }
});

// PUT /orders/:id/cancel - Cancel order
router.put('/:id/cancel', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const [order] = await db.select().from(orders).where(eq(orders.id, req.params.id as string)).limit(1);
    if (!order) { res.status(404).json({ error: 'Order not found' }); return; }

    const updates: Record<string, any> = {};
    if (order.escrowStatus === 'held') {
      updates.escrowStatus = 'refunded';
    }

    const result = await transitionOrder(
      req.params.id as string, req.userId!, ['proposed', 'countered', 'accepted'], 'either', 'cancelled', updates
    );
    if (result.error) { res.status(result.status!).json({ error: result.error }); return; }
    res.json(result.data);
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({ error: 'Failed to cancel order' });
  }
});

export default router;
