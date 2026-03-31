import { Router } from 'express';
import { db } from '../db/client.js';
import {
  conversations, messages, users, listings, orders,
  reviews, sellerVerifications, depositVerifications,
  feedback, otpCodes, trucks, drivers,
} from '../db/schema.js';
import { eq, desc, inArray, or, sql, and, ilike, count, lt, lte } from 'drizzle-orm';
import { adminMiddleware } from '../middleware/auth.js';

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

const router = Router();

// All admin routes require admin auth (X-Admin-Key header OR JWT with role='admin')
router.use(adminMiddleware);

// ─── GET /admin/stats ─────────────────────────────────────────────────────────
// Aggregated platform overview counts.

router.get('/stats', async (_req, res) => {
  try {
    const oneDayAgo  = new Date(Date.now() - 24  * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalUsersRow,
      newUsersRow,
      totalListingsRow,
      activeListingsRow,
      totalOrdersRow,
      pendingVerifRow,
      totalConvRow,
      activeConvRow,
    ] = await Promise.all([
      db.select({ n: sql<number>`count(*)::int` }).from(users),
      db.select({ n: sql<number>`count(*)::int` }).from(users)
        .where(sql`${users.createdAt} > ${oneDayAgo}`),
      db.select({ n: sql<number>`count(*)::int` }).from(listings),
      db.select({ n: sql<number>`count(*)::int` }).from(listings)
        .where(eq(listings.status, 'active')),
      db.select({ n: sql<number>`count(*)::int` }).from(orders),
      db.select({ n: sql<number>`count(*)::int` }).from(sellerVerifications)
        .where(eq(sellerVerifications.verificationStatus, 'pending')),
      db.select({ n: sql<number>`count(*)::int` }).from(conversations),
      db.select({ n: sql<number>`count(*)::int` }).from(conversations)
        .where(sql`${conversations.lastMessageAt} > ${sevenDaysAgo}`),
    ]);

    res.json({
      totalUsers:           totalUsersRow[0].n,
      newUsersToday:        newUsersRow[0].n,
      totalListings:        totalListingsRow[0].n,
      activeListings:       activeListingsRow[0].n,
      totalOrders:          totalOrdersRow[0].n,
      pendingVerifications: pendingVerifRow[0].n,
      totalConversations:   totalConvRow[0].n,
      activeConversations:  activeConvRow[0].n,
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ─── GET /admin/conversations ────────────────────────────────────────────────

router.get('/conversations', async (req, res) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page  as string) || 1);
    const limit  = Math.min(100, parseInt(req.query.limit as string) || 50);
    const offset = (page - 1) * limit;

    const convRows = await db
      .select()
      .from(conversations)
      .orderBy(desc(conversations.lastMessageAt))
      .limit(limit)
      .offset(offset);

    if (convRows.length === 0) { res.json({ data: [], page, limit }); return; }

    const userIds    = [...new Set(convRows.flatMap(c => [c.buyerId, c.sellerId]))];
    const listingIds = [...new Set(convRows.map(c => c.listingId))];
    const convIds    = convRows.map(c => c.id);

    const [usersRows, listingsRows, lastMessages] = await Promise.all([
      db.select({ id: users.id, name: users.name, phone: users.phone })
        .from(users).where(inArray(users.id, userIds)),
      db.select({ id: listings.id, title: listings.title, productCategory: listings.productCategory })
        .from(listings).where(inArray(listings.id, listingIds)),
      db.select()
        .from(messages)
        .where(inArray(messages.conversationId, convIds))
        .orderBy(desc(messages.createdAt)),
    ]);

    const usersMap    = Object.fromEntries(usersRows.map(u => [u.id, u]));
    const listingsMap = Object.fromEntries(listingsRows.map(l => [l.id, l]));
    const lastMsgMap: Record<string, any> = {};
    for (const msg of lastMessages) {
      if (!lastMsgMap[msg.conversationId]) lastMsgMap[msg.conversationId] = msg;
    }

    res.json({
      data: convRows.map(conv => ({
        id:            conv.id,
        buyer:         usersMap[conv.buyerId]  ?? null,
        seller:        usersMap[conv.sellerId] ?? null,
        listing:       listingsMap[conv.listingId] ?? null,
        lastMessage:   lastMsgMap[conv.id]
          ? { body: lastMsgMap[conv.id].body, senderId: lastMsgMap[conv.id].senderId, createdAt: lastMsgMap[conv.id].createdAt }
          : null,
        lastMessageAt: conv.lastMessageAt,
        createdAt:     conv.createdAt,
      })),
      page, limit,
    });
  } catch (err) {
    console.error('Admin list conversations error:', err);
    res.status(500).json({ error: 'Failed to list conversations' });
  }
});

// ─── GET /admin/conversations/:id ────────────────────────────────────────────

router.get('/conversations/:id', async (req, res) => {
  try {
    const [conv] = await db.select().from(conversations)
      .where(eq(conversations.id, req.params.id)).limit(1);

    if (!conv) { res.status(404).json({ error: 'Conversation not found' }); return; }

    const [usersRows, listingRows, msgRows] = await Promise.all([
      db.select({ id: users.id, name: users.name, phone: users.phone })
        .from(users).where(inArray(users.id, [conv.buyerId, conv.sellerId])),
      db.select({ id: listings.id, title: listings.title, productCategory: listings.productCategory })
        .from(listings).where(eq(listings.id, conv.listingId)).limit(1),
      db.select().from(messages).where(eq(messages.conversationId, conv.id))
        .orderBy(desc(messages.createdAt)).limit(500),
    ]);

    const usersMap = Object.fromEntries(usersRows.map(u => [u.id, u]));

    res.json({
      conversation: {
        id: conv.id,
        buyer:         usersMap[conv.buyerId]  ?? null,
        seller:        usersMap[conv.sellerId] ?? null,
        listing:       listingRows[0] ?? null,
        lastMessageAt: conv.lastMessageAt,
        createdAt:     conv.createdAt,
      },
      messages: msgRows.map(m => ({
        id:        m.id,
        sender:    usersMap[m.senderId] ?? { id: m.senderId },
        body:      m.body,
        type:      m.type,
        readAt:    m.readAt,
        createdAt: m.createdAt,
      })),
    });
  } catch (err) {
    console.error('Admin get conversation error:', err);
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

// ─── GET /admin/users ─────────────────────────────────────────────────────────

router.get('/users', async (req, res) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page  as string) || 1);
    const limit  = Math.min(200, parseInt(req.query.limit as string) || 50);
    const offset = (page - 1) * limit;

    const rows = await db
      .select({
        id: users.id, name: users.name, phone: users.phone,
        role: users.role, preferredLanguage: users.preferredLanguage,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);

    res.json({ data: rows, page, limit });
  } catch (err) {
    console.error('Admin list users error:', err);
    res.status(500).json({ error: 'Failed to list users' });
  }
});

// ─── DELETE /admin/users/:id ──────────────────────────────────────────────────

router.delete('/users/:id', async (req, res) => {
  try {
    const userId = req.params.id as string;

    const [user] = await db.select({ phone: users.phone, role: users.role })
      .from(users).where(eq(users.id, userId)).limit(1);

    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    if (user.role === 'admin') {
      res.status(403).json({ error: 'Cannot delete an admin account' });
      return;
    }

    await db.transaction(async (tx) => {
      const userListings = await tx.select({ id: listings.id }).from(listings)
        .where(eq(listings.userId, userId));
      const listingIds = userListings.map(l => l.id);

      const userConversations = await tx.select({ id: conversations.id }).from(conversations)
        .where(or(
          eq(conversations.buyerId, userId),
          eq(conversations.sellerId, userId),
          ...(listingIds.length > 0 ? [inArray(conversations.listingId, listingIds)] : [])
        ));

      if (userConversations.length > 0) {
        const convIds = userConversations.map(c => c.id);
        await tx.delete(messages).where(inArray(messages.conversationId, convIds));
        await tx.delete(conversations).where(inArray(conversations.id, convIds));
      }

      await tx.delete(reviews).where(or(eq(reviews.reviewerId, userId), eq(reviews.revieweeId, userId)));
      await tx.delete(orders).where(or(eq(orders.buyerId, userId), eq(orders.sellerId, userId)));
      await tx.delete(listings).where(eq(listings.userId, userId));
      await tx.delete(depositVerifications).where(eq(depositVerifications.userId, userId));
      await tx.delete(sellerVerifications).where(eq(sellerVerifications.userId, userId));
      await tx.delete(feedback).where(eq(feedback.userId, userId));
      if (user.phone) {
        await tx.delete(otpCodes).where(eq(otpCodes.phone, user.phone));
      }
      await tx.delete(users).where(eq(users.id, userId));
    });

    res.json({ message: 'Account permanently deleted' });
  } catch (err) {
    console.error('Admin delete user error:', err);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

// ─── GET /admin/listings ──────────────────────────────────────────────────────
// Browse all listings (any status) with seller info.

router.get('/listings', async (req, res) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page  as string) || 1);
    const limit  = Math.min(100, parseInt(req.query.limit as string) || 50);
    const offset = (page - 1) * limit;
    const status = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;

    const conditions = [];
    if (status) conditions.push(eq(listings.status, status));
    if (search) {
      conditions.push(
        or(
          ilike(listings.title, `%${search}%`),
          ilike(listings.productCategory, `%${search}%`)
        )!
      );
    }

    const [rows, totalRow] = await Promise.all([
      db.select({
        id: listings.id,
        userId: listings.userId,
        type: listings.type,
        productCategory: listings.productCategory,
        title: listings.title,
        region: listings.region,
        quantity: listings.quantity,
        unit: listings.unit,
        price: listings.price,
        currency: listings.currency,
        status: listings.status,
        createdAt: listings.createdAt,
        userName: users.name,
        userPhone: users.phone,
      })
        .from(listings)
        .leftJoin(users, eq(listings.userId, users.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(listings.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ n: sql<number>`count(*)::int` })
        .from(listings)
        .where(conditions.length > 0 ? and(...conditions) : undefined),
    ]);

    res.json({ data: rows, total: totalRow[0].n, page, limit });
  } catch (err) {
    console.error('Admin list listings error:', err);
    res.status(500).json({ error: 'Failed to list listings' });
  }
});

// ─── PATCH /admin/listings/:id/status ────────────────────────────────────────
// Set any listing to active or closed.

router.patch('/listings/:id/status', async (req, res) => {
  try {
    const { status } = req.body as { status: 'active' | 'closed' };
    if (!['active', 'closed'].includes(status)) {
      res.status(400).json({ error: 'status must be active or closed' });
      return;
    }

    const [updated] = await db
      .update(listings)
      .set({ status, updatedAt: new Date() })
      .where(eq(listings.id, req.params.id))
      .returning({ id: listings.id, status: listings.status });

    if (!updated) { res.status(404).json({ error: 'Listing not found' }); return; }
    res.json(updated);
  } catch (err) {
    console.error('Admin update listing status error:', err);
    res.status(500).json({ error: 'Failed to update listing' });
  }
});

// ─── GET /admin/verifications ─────────────────────────────────────────────────
// List seller verification requests with user info.

router.get('/verifications', async (req, res) => {
  try {
    const statusFilter = (req.query.status as string) || 'pending';
    const page   = Math.max(1, parseInt(req.query.page  as string) || 1);
    const limit  = Math.min(100, parseInt(req.query.limit as string) || 50);
    const offset = (page - 1) * limit;

    const rows = await db
      .select({
        id: sellerVerifications.id,
        userId: sellerVerifications.userId,
        businessName: sellerVerifications.businessName,
        businessType: sellerVerifications.businessType,
        tradeLicenseRef: sellerVerifications.tradeLicenseRef,
        verificationStatus: sellerVerifications.verificationStatus,
        reviewNote: sellerVerifications.reviewNote,
        reviewedAt: sellerVerifications.reviewedAt,
        createdAt: sellerVerifications.createdAt,
        userName: users.name,
        userPhone: users.phone,
      })
      .from(sellerVerifications)
      .leftJoin(users, eq(sellerVerifications.userId, users.id))
      .where(eq(sellerVerifications.verificationStatus, statusFilter))
      .orderBy(desc(sellerVerifications.createdAt))
      .limit(limit)
      .offset(offset);

    res.json({ data: rows, page, limit });
  } catch (err) {
    console.error('Admin list verifications error:', err);
    res.status(500).json({ error: 'Failed to list verifications' });
  }
});

// ─── PATCH /admin/verifications/:id ──────────────────────────────────────────
// Approve or reject a seller verification.

router.patch('/verifications/:id', async (req, res) => {
  try {
    const { status, note } = req.body as { status: 'approved' | 'rejected'; note?: string };
    if (!['approved', 'rejected'].includes(status)) {
      res.status(400).json({ error: 'status must be approved or rejected' });
      return;
    }

    const [updated] = await db
      .update(sellerVerifications)
      .set({
        verificationStatus: status,
        reviewNote: note ?? null,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(sellerVerifications.id, req.params.id))
      .returning({
        id: sellerVerifications.id,
        userId: sellerVerifications.userId,
        verificationStatus: sellerVerifications.verificationStatus,
        reviewNote: sellerVerifications.reviewNote,
      });

    if (!updated) { res.status(404).json({ error: 'Verification not found' }); return; }
    res.json(updated);
  } catch (err) {
    console.error('Admin update verification error:', err);
    res.status(500).json({ error: 'Failed to update verification' });
  }
});

// ─── GET /admin/orders ────────────────────────────────────────────────────────

router.get('/orders', async (req, res) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page  as string) || 1);
    const limit  = Math.min(100, parseInt(req.query.limit as string) || 50);
    const offset = (page - 1) * limit;

    const conditions: any[] = [];
    if (req.query.status)       conditions.push(eq(orders.status,       req.query.status as string));
    if (req.query.escrowStatus) conditions.push(eq(orders.escrowStatus, req.query.escrowStatus as string));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const buyer  = { id: sql<string>`buyer.id`,  name: sql<string>`buyer.name`,  phone: sql<string>`buyer.phone` };
    const seller = { id: sql<string>`seller.id`, name: sql<string>`seller.name`, phone: sql<string>`seller.phone` };

    const [rows, totalRow] = await Promise.all([
      db
        .select({
          id:               orders.id,
          listingId:        orders.listingId,
          buyerId:          orders.buyerId,
          sellerId:         orders.sellerId,
          quantity:         orders.quantity,
          unit:             orders.unit,
          pricePerUnit:     orders.pricePerUnit,
          totalPrice:       orders.totalPrice,
          currency:         orders.currency,
          status:           orders.status,
          escrowStatus:     orders.escrowStatus,
          inspectorId:      orders.inspectorId,
          inspectionStatus: orders.inspectionStatus,
          assignedTruckId:  orders.assignedTruckId,
          assignedDriverId: orders.assignedDriverId,
          escrowAutoReleaseAt: orders.escrowAutoReleaseAt,
          createdAt:        orders.createdAt,
          updatedAt:        orders.updatedAt,
          listingTitle:     listings.title,
          listingProduct:   listings.productCategory,
          buyerName:  sql<string>`buyer.name`.as('buyer_name'),
          sellerName: sql<string>`seller.name`.as('seller_name'),
          inspectorName: sql<string>`inspector.name`.as('inspector_name'),
          truckPlate:    sql<string>`t.plate_number`.as('truck_plate'),
        })
        .from(orders)
        .leftJoin(listings, eq(orders.listingId, listings.id))
        .leftJoin(sql`${users} as buyer`,    sql`buyer.id = ${orders.buyerId}`)
        .leftJoin(sql`${users} as seller`,   sql`seller.id = ${orders.sellerId}`)
        .leftJoin(sql`${users} as inspector`,sql`inspector.id = ${orders.inspectorId}`)
        .leftJoin(sql`${trucks} as t`,       sql`t.id = ${orders.assignedTruckId}`)
        .where(where)
        .orderBy(desc(orders.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ n: sql<number>`count(*)::int` }).from(orders).where(where),
    ]);

    const total = totalRow[0].n;

    res.json({
      data: rows.map(r => ({
        ...formatOrder(r),
        listing:   { title: r.listingTitle, productCategory: r.listingProduct },
        buyer:     { id: r.buyerId,   name: r.buyerName },
        seller:    { id: r.sellerId,  name: r.sellerName },
        inspector: r.inspectorId ? { id: r.inspectorId, name: r.inspectorName } : null,
        truck:     r.assignedTruckId ? { plateNumber: r.truckPlate } : null,
        needsAction: (
          (r.status === 'payment_held' && !r.inspectorId) ||
          (r.inspectionStatus === 'passed' && !r.assignedTruckId) ||
          (r.status === 'disputed')
        ),
      })),
      page, limit, total,
      hasMore: offset + limit < total,
    });
  } catch (err) {
    console.error('Admin list orders error:', err);
    res.status(500).json({ error: 'Failed to list orders' });
  }
});

// ─── GET /admin/orders/:id ────────────────────────────────────────────────────

router.get('/orders/:id', async (req, res) => {
  try {
    const [order] = await db.select().from(orders).where(eq(orders.id, req.params.id)).limit(1);
    if (!order) { res.status(404).json({ error: 'Order not found' }); return; }

    const [[listing], [buyer], [seller]] = await Promise.all([
      db.select({ title: listings.title, productCategory: listings.productCategory })
        .from(listings).where(eq(listings.id, order.listingId)).limit(1),
      db.select({ id: users.id, name: users.name, phone: users.phone })
        .from(users).where(eq(users.id, order.buyerId)).limit(1),
      db.select({ id: users.id, name: users.name, phone: users.phone })
        .from(users).where(eq(users.id, order.sellerId)).limit(1),
    ]);

    let inspector = null;
    if (order.inspectorId) {
      const [ins] = await db.select({ id: users.id, name: users.name, phone: users.phone })
        .from(users).where(eq(users.id, order.inspectorId)).limit(1);
      inspector = ins ?? null;
    }

    let truck = null;
    let driver = null;
    if (order.assignedTruckId) {
      const [t] = await db.select().from(trucks).where(eq(trucks.id, order.assignedTruckId)).limit(1);
      truck = t ?? null;
    }
    if (order.assignedDriverId) {
      const [d] = await db.select().from(drivers).where(eq(drivers.id, order.assignedDriverId)).limit(1);
      driver = d ?? null;
    }

    res.json({
      ...formatOrder(order),
      listing,
      buyer,
      seller,
      inspector,
      truck,
      driver,
    });
  } catch (err) {
    console.error('Admin get order error:', err);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// ─── GET /admin/inspectors ────────────────────────────────────────────────────

router.get('/inspectors', async (_req, res) => {
  try {
    const rows = await db
      .select({ id: users.id, name: users.name, phone: users.phone, createdAt: users.createdAt })
      .from(users)
      .where(eq(users.role, 'inspector'))
      .orderBy(desc(users.createdAt));

    res.json({ data: rows });
  } catch (err) {
    console.error('Admin list inspectors error:', err);
    res.status(500).json({ error: 'Failed to fetch inspectors' });
  }
});

// ─── POST /admin/orders/:id/assign-inspector ──────────────────────────────────

router.post('/orders/:id/assign-inspector', async (req, res) => {
  try {
    const { inspectorId } = req.body as { inspectorId: string };
    if (!inspectorId) { res.status(400).json({ error: 'inspectorId required' }); return; }

    const [order] = await db.select().from(orders).where(eq(orders.id, req.params.id)).limit(1);
    if (!order) { res.status(404).json({ error: 'Order not found' }); return; }
    if (order.status !== 'payment_held') {
      res.status(400).json({ error: `Order must be in 'payment_held' status` }); return;
    }

    const [inspector] = await db.select({ id: users.id }).from(users).where(eq(users.id, inspectorId)).limit(1);
    if (!inspector) { res.status(404).json({ error: 'Inspector not found' }); return; }

    const history = Array.isArray(order.statusHistory) ? order.statusHistory : [];
    const [updated] = await db.update(orders)
      .set({
        inspectorId,
        inspectionStatus: 'pending',
        statusHistory: addStatusEntry(history, 'inspector_assigned', 'Inspector assigned by admin'),
        updatedAt: new Date(),
      })
      .where(eq(orders.id, req.params.id))
      .returning();

    res.json(formatOrder(updated));
  } catch (err) {
    console.error('Admin assign inspector error:', err);
    res.status(500).json({ error: 'Failed to assign inspector' });
  }
});

// ─── POST /admin/orders/:id/assign-truck ──────────────────────────────────────

router.post('/orders/:id/assign-truck', async (req, res) => {
  try {
    const { truckId, driverId } = req.body as { truckId: string; driverId: string };
    if (!truckId || !driverId) { res.status(400).json({ error: 'truckId and driverId required' }); return; }

    const [order] = await db.select().from(orders).where(eq(orders.id, req.params.id)).limit(1);
    if (!order) { res.status(404).json({ error: 'Order not found' }); return; }
    if (order.inspectionStatus !== 'passed') {
      res.status(400).json({ error: `Inspection must have passed (current: ${order.inspectionStatus ?? 'none'})` }); return;
    }

    const [[truck], [driver]] = await Promise.all([
      db.select({ id: trucks.id, plateNumber: trucks.plateNumber }).from(trucks).where(eq(trucks.id, truckId)).limit(1),
      db.select({ id: drivers.id, name: drivers.name }).from(drivers).where(eq(drivers.id, driverId)).limit(1),
    ]);
    if (!truck)  { res.status(404).json({ error: 'Truck not found' });  return; }
    if (!driver) { res.status(404).json({ error: 'Driver not found' }); return; }

    const history = Array.isArray(order.statusHistory) ? order.statusHistory : [];
    const [updated] = await db.update(orders)
      .set({
        assignedTruckId: truckId,
        assignedDriverId: driverId,
        statusHistory: addStatusEntry(history, 'truck_assigned', `Truck: ${truck.plateNumber}, Driver: ${driver.name}`),
        updatedAt: new Date(),
      })
      .where(eq(orders.id, req.params.id))
      .returning();

    res.json(formatOrder(updated));
  } catch (err) {
    console.error('Admin assign truck error:', err);
    res.status(500).json({ error: 'Failed to assign truck' });
  }
});

// ─── POST /admin/orders/:id/release-escrow ────────────────────────────────────

router.post('/orders/:id/release-escrow', async (req, res) => {
  try {
    const [order] = await db.select().from(orders).where(eq(orders.id, req.params.id)).limit(1);
    if (!order) { res.status(404).json({ error: 'Order not found' }); return; }
    if (order.status !== 'disputed') {
      res.status(400).json({ error: `Order must be in 'disputed' status (current: ${order.status})` }); return;
    }

    const history = Array.isArray(order.statusHistory) ? order.statusHistory : [];
    const [updated] = await db.update(orders)
      .set({
        status: 'completed',
        escrowStatus: 'released',
        statusHistory: addStatusEntry(history, 'completed', 'Manually released by admin'),
        updatedAt: new Date(),
      })
      .where(eq(orders.id, req.params.id))
      .returning();

    res.json(formatOrder(updated));
  } catch (err) {
    console.error('Admin release escrow error:', err);
    res.status(500).json({ error: 'Failed to release escrow' });
  }
});

// ─── POST /admin/orders/:id/refund-escrow ─────────────────────────────────────

router.post('/orders/:id/refund-escrow', async (req, res) => {
  try {
    const [order] = await db.select().from(orders).where(eq(orders.id, req.params.id)).limit(1);
    if (!order) { res.status(404).json({ error: 'Order not found' }); return; }
    if (order.status !== 'disputed') {
      res.status(400).json({ error: `Order must be in 'disputed' status (current: ${order.status})` }); return;
    }

    const history = Array.isArray(order.statusHistory) ? order.statusHistory : [];
    const [updated] = await db.update(orders)
      .set({
        status: 'cancelled',
        escrowStatus: 'refunded',
        statusHistory: addStatusEntry(history, 'cancelled', 'Refunded by admin'),
        updatedAt: new Date(),
      })
      .where(eq(orders.id, req.params.id))
      .returning();

    res.json(formatOrder(updated));
  } catch (err) {
    console.error('Admin refund escrow error:', err);
    res.status(500).json({ error: 'Failed to refund escrow' });
  }
});

// ─── GET /admin/escrow/summary ────────────────────────────────────────────────

router.get('/escrow/summary', async (_req, res) => {
  try {
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const [heldRow, disputedRow, autoRelRow, totalHeldRow] = await Promise.all([
      db.select({ n: sql<number>`count(*)::int` }).from(orders).where(eq(orders.escrowStatus, 'held')),
      db.select({ n: sql<number>`count(*)::int` }).from(orders).where(eq(orders.status, 'disputed')),
      db.select({ n: sql<number>`count(*)::int` }).from(orders).where(
        and(
          eq(orders.status, 'shipped'),
          eq(orders.escrowStatus, 'held'),
          lte(orders.escrowAutoReleaseAt, in24h)
        )
      ),
      db.select({ total: sql<number>`coalesce(sum(total_price::numeric), 0)` })
        .from(orders).where(eq(orders.escrowStatus, 'held')),
    ]);

    res.json({
      totalHeld:          Number(totalHeldRow[0].total),
      countHeld:          heldRow[0].n,
      countDisputed:      disputedRow[0].n,
      countAutoReleasing: autoRelRow[0].n,
    });
  } catch (err) {
    console.error('Admin escrow summary error:', err);
    res.status(500).json({ error: 'Failed to fetch escrow summary' });
  }
});

// ─── POST /admin/escrow/auto-release ─────────────────────────────────────────

router.post('/escrow/auto-release', async (_req, res) => {
  try {
    const now = new Date();
    const overdueOrders = await db.select().from(orders).where(
      and(
        eq(orders.status, 'shipped'),
        eq(orders.escrowStatus, 'held'),
        lte(orders.escrowAutoReleaseAt, now)
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
  } catch (err) {
    console.error('Admin auto-release error:', err);
    res.status(500).json({ error: 'Failed to run auto-release' });
  }
});

export default router;
