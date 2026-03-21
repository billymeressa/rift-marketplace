import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/client.js';
import { conversations, messages, users, listings } from '../db/schema.js';
import { eq, and, or, desc, isNull, inArray, sql } from 'drizzle-orm';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { sendPushNotification } from '../lib/notify.js';

const router = Router();

// ─── GET /messages/conversations — list my conversations ────────────────────
router.get('/conversations', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;

    const convRows = await db
      .select()
      .from(conversations)
      .where(or(
        eq(conversations.buyerId, userId),
        eq(conversations.sellerId, userId),
      ))
      .orderBy(desc(conversations.lastMessageAt));

    if (convRows.length === 0) {
      res.json({ data: [] });
      return;
    }

    // Collect all user IDs and listing IDs to batch-fetch
    const userIds = [...new Set(convRows.flatMap(c => [c.buyerId, c.sellerId]))];
    const listingIds = [...new Set(convRows.map(c => c.listingId))];

    const [usersRows, listingsRows] = await Promise.all([
      db.select().from(users).where(inArray(users.id, userIds)),
      db.select().from(listings).where(inArray(listings.id, listingIds)),
    ]);

    const usersMap = Object.fromEntries(usersRows.map(u => [u.id, u]));
    const listingsMap = Object.fromEntries(listingsRows.map(l => [l.id, l]));

    const convIds = convRows.map(c => c.id);

    // Batch fetch last message and unread count per conversation
    const [lastMessages, unreadCounts] = await Promise.all([
      db
        .select()
        .from(messages)
        .where(inArray(messages.conversationId, convIds))
        .orderBy(desc(messages.createdAt)),
      db
        .select({
          conversationId: messages.conversationId,
          count: sql<number>`count(*)::int`,
        })
        .from(messages)
        .where(and(
          inArray(messages.conversationId, convIds),
          sql`${messages.senderId} != ${userId}`,
          isNull(messages.readAt),
        ))
        .groupBy(messages.conversationId),
    ]);

    // Build lookup maps
    const lastMsgMap: Record<string, any> = {};
    for (const msg of lastMessages) {
      if (!lastMsgMap[msg.conversationId]) {
        lastMsgMap[msg.conversationId] = msg;
      }
    }
    const unreadMap: Record<string, number> = {};
    for (const row of unreadCounts) {
      unreadMap[row.conversationId] = row.count;
    }

    const result = convRows.map(conv => {
      const otherUserId = conv.buyerId === userId ? conv.sellerId : conv.buyerId;
      const otherUser = usersMap[otherUserId];
      const listing = listingsMap[conv.listingId];
      const lastMsg = lastMsgMap[conv.id];

      return {
        id: conv.id,
        listingId: conv.listingId,
        listingTitle: listing?.title ?? '',
        listingProduct: listing?.productCategory ?? '',
        otherUser: otherUser
          ? { id: otherUser.id, name: otherUser.name, phone: otherUser.phone }
          : null,
        unreadCount: unreadMap[conv.id] ?? 0,
        lastMessage: lastMsg
          ? { body: lastMsg.body, senderId: lastMsg.senderId, createdAt: lastMsg.createdAt.toISOString() }
          : null,
        lastMessageAt: conv.lastMessageAt.toISOString(),
        createdAt: conv.createdAt.toISOString(),
      };
    });

    res.json({ data: result });
  } catch (error) {
    console.error('List conversations error:', error);
    res.status(500).json({ error: 'Failed to list conversations' });
  }
});

// ─── GET /messages/conversations/:id — get messages ─────────────────────────
router.get('/conversations/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const conversationId = req.params.id as string;

    const [conv] = await db
      .select()
      .from(conversations)
      .where(and(
        eq(conversations.id, conversationId),
        or(
          eq(conversations.buyerId, userId),
          eq(conversations.sellerId, userId),
        )
      ))
      .limit(1);

    if (!conv) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }

    const before = req.query.before as string | undefined;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

    const rows = await db
      .select()
      .from(messages)
      .where(before
        ? and(eq(messages.conversationId, conversationId), sql`${messages.createdAt} < ${before}`)
        : eq(messages.conversationId, conversationId)
      )
      .orderBy(desc(messages.createdAt))
      .limit(limit);

    // Mark messages from the other user as read
    await db
      .update(messages)
      .set({ readAt: new Date() })
      .where(and(
        eq(messages.conversationId, conversationId),
        sql`${messages.senderId} != ${userId}`,
        isNull(messages.readAt),
      ));

    res.json({
      data: rows.map(m => ({
        ...m,
        readAt: m.readAt?.toISOString() ?? null,
        createdAt: m.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// ─── POST /messages/conversations — start or find a conversation ────────────
const startConversationSchema = z.object({
  listingId: z.string().uuid(),
  message: z.string().min(1).max(2000),
});

router.post('/conversations', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const data = startConversationSchema.parse(req.body);

    const [listing] = await db
      .select()
      .from(listings)
      .where(eq(listings.id, data.listingId))
      .limit(1);

    if (!listing) {
      res.status(404).json({ error: 'Listing not found' });
      return;
    }
    if (listing.userId === userId) {
      res.status(400).json({ error: 'Cannot message yourself' });
      return;
    }

    // Buyer = initiator for buy listings' owner, seller for sell listings' owner
    const isBuyListing = listing.type === 'buy';
    const buyerId = isBuyListing ? listing.userId : userId;
    const sellerId = isBuyListing ? userId : listing.userId;

    let [conv] = await db
      .select()
      .from(conversations)
      .where(and(
        eq(conversations.buyerId, buyerId),
        eq(conversations.sellerId, sellerId),
        eq(conversations.listingId, data.listingId),
      ))
      .limit(1);

    if (!conv) {
      [conv] = await db
        .insert(conversations)
        .values({ buyerId, sellerId, listingId: data.listingId })
        .returning();
    }

    const [msg] = await db
      .insert(messages)
      .values({ conversationId: conv.id, senderId: userId, body: data.message })
      .returning();

    await db
      .update(conversations)
      .set({ lastMessageAt: new Date() })
      .where(eq(conversations.id, conv.id));

    // Push notification
    const recipientId = userId === buyerId ? sellerId : buyerId;
    const [recipient, sender] = await Promise.all([
      db.select().from(users).where(eq(users.id, recipientId)).limit(1).then(r => r[0]),
      db.select().from(users).where(eq(users.id, userId)).limit(1).then(r => r[0]),
    ]);

    if (recipient?.pushToken) {
      sendPushNotification(
        recipient.pushToken,
        sender?.name || 'New message',
        data.message.length > 100 ? data.message.slice(0, 100) + '...' : data.message,
        { conversationId: conv.id, type: 'message' }
      ).catch(() => {});
    }

    res.status(201).json({
      conversationId: conv.id,
      message: {
        id: msg.id,
        conversationId: msg.conversationId,
        senderId: msg.senderId,
        body: msg.body,
        type: msg.type,
        readAt: null,
        createdAt: msg.createdAt.toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    console.error('Start conversation error:', error);
    res.status(500).json({ error: 'Failed to start conversation' });
  }
});

// ─── POST /messages/conversations/:id — send a message ──────────────────────
const sendMessageSchema = z.object({
  body: z.string().min(1).max(2000),
  type: z.enum(['text', 'image']).default('text'),
});

router.post('/conversations/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const conversationId = req.params.id as string;
    const data = sendMessageSchema.parse(req.body);

    const [conv] = await db
      .select()
      .from(conversations)
      .where(and(
        eq(conversations.id, conversationId),
        or(
          eq(conversations.buyerId, userId),
          eq(conversations.sellerId, userId),
        )
      ))
      .limit(1);

    if (!conv) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }

    const [msg] = await db
      .insert(messages)
      .values({ conversationId, senderId: userId, body: data.body, type: data.type })
      .returning();

    await db
      .update(conversations)
      .set({ lastMessageAt: new Date() })
      .where(eq(conversations.id, conversationId));

    // Push notification
    const recipientId = userId === conv.buyerId ? conv.sellerId : conv.buyerId;
    const [recipient, sender] = await Promise.all([
      db.select().from(users).where(eq(users.id, recipientId)).limit(1).then(r => r[0]),
      db.select().from(users).where(eq(users.id, userId)).limit(1).then(r => r[0]),
    ]);

    if (recipient?.pushToken) {
      sendPushNotification(
        recipient.pushToken,
        sender?.name || 'New message',
        data.body.length > 100 ? data.body.slice(0, 100) + '...' : data.body,
        { conversationId, type: 'message' }
      ).catch(() => {});
    }

    res.status(201).json({
      id: msg.id,
      conversationId: msg.conversationId,
      senderId: msg.senderId,
      body: msg.body,
      type: msg.type,
      readAt: null,
      createdAt: msg.createdAt.toISOString(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// ─── GET /messages/unread-count ──────────────────────────────────────────────
router.get('/unread-count', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;

    const convRows = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(or(
        eq(conversations.buyerId, userId),
        eq(conversations.sellerId, userId),
      ));

    if (convRows.length === 0) {
      res.json({ count: 0 });
      return;
    }

    const convIds = convRows.map(c => c.id);
    const [result] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(messages)
      .where(and(
        inArray(messages.conversationId, convIds),
        sql`${messages.senderId} != ${userId}`,
        isNull(messages.readAt),
      ));

    res.json({ count: result?.count ?? 0 });
  } catch (error) {
    console.error('Unread count error:', error);
    res.status(500).json({ error: 'Failed to get unread count' });
  }
});

export default router;
