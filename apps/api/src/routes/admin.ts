import { Router } from 'express';
import { db } from '../db/client.js';
import {
  conversations, messages, users, listings, orders,
  reviews, sellerVerifications, depositVerifications,
  feedback, otpCodes,
} from '../db/schema.js';
import { eq, desc, inArray, or, sql, and, ilike, count } from 'drizzle-orm';
import { adminMiddleware } from '../middleware/auth.js';

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

export default router;
