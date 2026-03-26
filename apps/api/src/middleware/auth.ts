import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  userId?: string;
  userPhone?: string;
  userRole?: string;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authorization required' });
    return;
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: string;
      phone: string;
      role?: string;
    };
    req.userId = payload.userId;
    req.userPhone = payload.phone;
    req.userRole = payload.role ?? 'user';
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function adminMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  // Accept either X-Admin-Key header OR a JWT token with role='admin'
  const secret = process.env.ADMIN_SECRET;
  if (secret && req.headers['x-admin-key'] === secret) {
    next();
    return;
  }

  // Try JWT-based admin auth
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    const token = header.slice(7);
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET!) as {
        userId: string;
        phone: string;
        role?: string;
      };
      if (payload.role === 'admin') {
        req.userId = payload.userId;
        req.userPhone = payload.phone;
        req.userRole = 'admin';
        next();
        return;
      }
    } catch {
      // fall through to 401
    }
  }

  res.status(401).json({ error: 'Admin access required' });
}
