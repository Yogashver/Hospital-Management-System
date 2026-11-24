import jwt from 'jsonwebtoken';
import { User } from './models.js';

export async function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Please sign in' });
  try {
    const { id } = jwt.verify(token, process.env.JWT_SECRET || 'development-secret-change-me');
    req.user = await User.findById(id);
    if (!req.user) return res.status(401).json({ message: 'Account not found' });
    next();
  } catch { return res.status(401).json({ message: 'Invalid or expired session' }); }
}

export const allow = (...roles) => (req, res, next) => roles.includes(req.user.role)
  ? next() : res.status(403).json({ message: 'You do not have access to this action' });
