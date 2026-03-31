import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/client.js';
import { trucks, drivers } from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';
import { authMiddleware, adminMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Helper: middleware that accepts either admin key OR authenticated JWT with admin role
function adminOrAuth(req: AuthRequest, res: any, next: any) {
  const secret = process.env.ADMIN_SECRET;
  if (secret && req.headers['x-admin-key'] === secret) {
    req.userRole = 'admin';
    return next();
  }
  return authMiddleware(req, res, next);
}

// GET /logistics/trucks — list all trucks (admin)
router.get('/trucks', adminOrAuth, async (req: AuthRequest, res) => {
  try {
    if (req.userRole !== 'admin') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }

    const rows = await db.select().from(trucks).orderBy(desc(trucks.createdAt));
    res.json({ data: rows });
  } catch (error) {
    console.error('List trucks error:', error);
    res.status(500).json({ error: 'Failed to fetch trucks' });
  }
});

// POST /logistics/trucks — add truck (admin)
router.post('/trucks', adminOrAuth, async (req: AuthRequest, res) => {
  try {
    if (req.userRole !== 'admin') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }

    const data = z.object({
      plateNumber: z.string().min(1).max(20),
      make: z.string().max(50).optional(),
      model: z.string().max(50).optional(),
      capacityKg: z.number().positive().optional(),
      status: z.enum(['active', 'inactive']).optional(),
    }).parse(req.body);

    const [truck] = await db
      .insert(trucks)
      .values({
        plateNumber: data.plateNumber,
        make: data.make ?? null,
        model: data.model ?? null,
        capacityKg: data.capacityKg != null ? String(data.capacityKg) : null,
        status: data.status ?? 'active',
      })
      .returning();

    res.status(201).json(truck);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    console.error('Create truck error:', error);
    res.status(500).json({ error: 'Failed to create truck' });
  }
});

// GET /logistics/drivers — list all drivers (admin)
router.get('/drivers', adminOrAuth, async (req: AuthRequest, res) => {
  try {
    if (req.userRole !== 'admin') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }

    const rows = await db.select().from(drivers).orderBy(desc(drivers.createdAt));
    res.json({ data: rows });
  } catch (error) {
    console.error('List drivers error:', error);
    res.status(500).json({ error: 'Failed to fetch drivers' });
  }
});

// POST /logistics/drivers — add driver (admin)
router.post('/drivers', adminOrAuth, async (req: AuthRequest, res) => {
  try {
    if (req.userRole !== 'admin') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }

    const data = z.object({
      name: z.string().min(1).max(100),
      phone: z.string().min(1).max(20),
      licenseNumber: z.string().max(50).optional(),
      truckId: z.string().uuid().optional(),
      status: z.enum(['active', 'inactive', 'suspended']).optional(),
    }).parse(req.body);

    // Verify truck exists if provided
    if (data.truckId) {
      const [truck] = await db.select({ id: trucks.id }).from(trucks).where(eq(trucks.id, data.truckId)).limit(1);
      if (!truck) {
        res.status(404).json({ error: 'Truck not found' });
        return;
      }
    }

    const [driver] = await db
      .insert(drivers)
      .values({
        name: data.name,
        phone: data.phone,
        licenseNumber: data.licenseNumber ?? null,
        truckId: data.truckId ?? null,
        status: data.status ?? 'active',
      })
      .returning();

    res.status(201).json(driver);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    console.error('Create driver error:', error);
    res.status(500).json({ error: 'Failed to create driver' });
  }
});

// PATCH /logistics/trucks/:id — update truck status
router.patch('/trucks/:id', adminOrAuth, async (req: AuthRequest, res) => {
  try {
    if (req.userRole !== 'admin') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }

    const data = z.object({
      status: z.enum(['active', 'inactive']),
    }).parse(req.body);

    const [updated] = await db
      .update(trucks)
      .set({ status: data.status })
      .where(eq(trucks.id, req.params.id))
      .returning();

    if (!updated) { res.status(404).json({ error: 'Truck not found' }); return; }
    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    console.error('Update truck error:', error);
    res.status(500).json({ error: 'Failed to update truck' });
  }
});

// GET /logistics/drivers/:id — get driver with truck info
router.get('/drivers/:id', adminOrAuth, async (req: AuthRequest, res) => {
  try {
    if (req.userRole !== 'admin') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }

    const [driver] = await db.select().from(drivers).where(eq(drivers.id, req.params.id)).limit(1);
    if (!driver) { res.status(404).json({ error: 'Driver not found' }); return; }

    let truck = null;
    if (driver.truckId) {
      const [t] = await db.select().from(trucks).where(eq(trucks.id, driver.truckId)).limit(1);
      truck = t ?? null;
    }

    res.json({ ...driver, truck });
  } catch (error) {
    console.error('Get driver error:', error);
    res.status(500).json({ error: 'Failed to fetch driver' });
  }
});

// PATCH /logistics/drivers/:id — update driver status
router.patch('/drivers/:id', adminOrAuth, async (req: AuthRequest, res) => {
  try {
    if (req.userRole !== 'admin') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }

    const data = z.object({
      status: z.enum(['active', 'inactive', 'suspended']),
    }).parse(req.body);

    const [updated] = await db
      .update(drivers)
      .set({ status: data.status })
      .where(eq(drivers.id, req.params.id))
      .returning();

    if (!updated) { res.status(404).json({ error: 'Driver not found' }); return; }
    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    console.error('Update driver error:', error);
    res.status(500).json({ error: 'Failed to update driver' });
  }
});

export default router;
