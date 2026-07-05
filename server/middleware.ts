import jwt from 'jsonwebtoken';
import { requestContext } from './utils/logger';

export const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key_12345';

export const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = (authHeader && authHeader.split(' ')[1]) || req.cookies?.token;
  
  if (!token) return res.status(401).json({ error: 'Access denied, token missing' });

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    const ctx = requestContext.getStore();
    if (ctx) ctx.userId = user.role === 'ADMIN' ? `ADMIN (${user.name || user.email || 'Admin'})` : user.id;
    next();
  });
};

export const optionalAuthenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = (authHeader && authHeader.split(' ')[1]) || req.cookies?.token;
  
  if (!token) return next();

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (!err) {
      req.user = user;
      const ctx = requestContext.getStore();
      if (ctx) ctx.userId = user.role === 'ADMIN' ? `ADMIN (${user.name || user.email || 'Admin'})` : user.id;
    }
    next();
  });
};

export const isAdmin = (req: any, res: any, next: any) => {
  if (req.user && req.user.role === 'ADMIN') {
    next();
  } else {
    res.status(403).json({ error: 'Access denied, admin only' });
  }
};
