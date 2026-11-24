import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models.js';
import { auth } from '../middleware.js';

const router = Router();
const publicUser = (u) => ({ id: u._id, name: u.name, email: u.email, role: u.role, phone: u.phone, specialization: u.specialization, bio: u.bio, fee: u.fee, consultationModes: u.consultationModes, workingDays: u.workingDays, startTime: u.startTime, endTime: u.endTime, available: u.available });
const tokenFor = (u) => jwt.sign({ id: u._id }, process.env.JWT_SECRET || 'development-secret-change-me', { expiresIn: '7d' });

router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password || password.length < 8) return res.status(400).json({ message: 'Name, email and a password of at least 8 characters are required' });
    if (await User.exists({ email: email.toLowerCase() })) return res.status(409).json({ message: 'An account with that email already exists' });
    const role = process.env.ADMIN_EMAIL?.toLowerCase() === email.toLowerCase() ? 'admin' : 'patient';
    const user = await User.create({ name, email, phone, role, password: await bcrypt.hash(password, 12) });
    res.status(201).json({ token: tokenFor(user), user: publicUser(user) });
  } catch (e) { next(e); }
});

router.post('/login', async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.body.email?.toLowerCase() }).select('+password');
    if (!user || !await bcrypt.compare(req.body.password || '', user.password)) return res.status(401).json({ message: 'Email or password is incorrect' });
    res.json({ token: tokenFor(user), user: publicUser(user) });
  } catch (e) { next(e); }
});

router.get('/me', auth, (req, res) => res.json({ user: publicUser(req.user) }));
router.patch('/me', auth, async (req, res, next) => {
  try {
    const fields = ['name', 'phone', 'bio'];
    if (req.user.role === 'doctor') fields.push('specialization', 'fee', 'consultationModes', 'available', 'workingDays', 'startTime', 'endTime');
    for (const field of fields) if (req.body[field] !== undefined) req.user[field] = req.body[field];
    await req.user.save(); res.json({ user: publicUser(req.user) });
  } catch (e) { next(e); }
});
export default router;
