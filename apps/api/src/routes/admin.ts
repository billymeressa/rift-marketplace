import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../db/client.js';
import { conversations, messages, users, listings } from '../db/schema.js';
import { eq, desc, inArray, or } from 'drizzle-orm';

const router = Router();

// ─── Admin auth middleware ────────────────────────────────────────────────────
// Protect every admin route with a secret key set in ADMIN_SECRET env var.
// Pass it as:  X-Admin-Key: <your-secret>

function adminAuth(req: Request, res: Response, next: NextFunction): void {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    res.status(503).json({ error: 'Admin access not configured on this server' });
    return;
  }
  if (req.headers['x-admin-key'] !== secret) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}

router.use(adminAuth);

// ─── GET /admin/conversations ────────────────────────────────────────────────
// List all conversations with participants, listing title, and last message.
// Supports ?page=1&limit=50

router.get('/conversations', async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page  as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 50);
    const offset = (page - 1) * limit;

    const convRows = await db
      .select()
      .from(conversations)
      .orderBy(desc(conversations.lastMessageAt))
      .limit(limit)
      .offset(offset);

    if (convRows.length === 0) {
      res.json({ data: [], page, limit });
      return;
    }

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

    const data = convRows.map(conv => ({
      id:            conv.id,
      buyer:         usersMap[conv.buyerId]  ?? null,
      seller:        usersMap[conv.sellerId] ?? null,
      listing:       listingsMap[conv.listingId] ?? null,
      lastMessage:   lastMsgMap[conv.id]
        ? { body: lastMsgMap[conv.id].body, senderId: lastMsgMap[conv.id].senderId, createdAt: lastMsgMap[conv.id].createdAt }
        : null,
      lastMessageAt: conv.lastMessageAt,
      createdAt:     conv.createdAt,
    }));

    res.json({ data, page, limit });
  } catch (err) {
    console.error('Admin list conversations error:', err);
    res.status(500).json({ error: 'Failed to list conversations' });
  }
});

// ─── GET /admin/conversations/:id ────────────────────────────────────────────
// Full message thread for a conversation — all messages with sender info.

router.get('/conversations/:id', async (req, res) => {
  try {
    const conversationId = req.params.id as string;

    const [conv] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, conversationId))
      .limit(1);

    if (!conv) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }

    const [usersRows, listingRows, msgRows] = await Promise.all([
      db.select({ id: users.id, name: users.name, phone: users.phone })
        .from(users)
        .where(inArray(users.id, [conv.buyerId, conv.sellerId])),
      db.select({ id: listings.id, title: listings.title, productCategory: listings.productCategory })
        .from(listings)
        .where(eq(listings.id, conv.listingId))
        .limit(1),
      db.select()
        .from(messages)
        .where(eq(messages.conversationId, conversationId))
        .orderBy(desc(messages.createdAt))
        .limit(500),
    ]);

    const usersMap = Object.fromEntries(usersRows.map(u => [u.id, u]));

    res.json({
      conversation: {
        id:            conv.id,
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
// List all users. Supports ?page=1&limit=50

router.get('/users', async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page  as string) || 1);
    const limit = Math.min(200, parseInt(req.query.limit as string) || 50);
    const offset = (page - 1) * limit;

    const rows = await db
      .select({
        id: users.id, name: users.name, phone: users.phone,
        preferredLanguage: users.preferredLanguage,
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

export default router;
