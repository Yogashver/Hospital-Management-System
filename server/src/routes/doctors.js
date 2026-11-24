import { Router } from 'express';
import { User } from '../models.js';
import { auth, allow } from '../middleware.js';
const router = Router();
router.get('/', async (req, res, next) => {
  try {
    const query = { role: 'doctor', available: true };
    if (req.query.specialization) query.specialization = new RegExp(req.query.specialization, 'i');
    if (req.query.search) query.name = new RegExp(req.query.search, 'i');
    const doctors = await User.find(query).select('name email phone specialization bio fee consultationModes workingDays startTime endTime available');
    res.json({ doctors });
  } catch (e) { next(e); }
});
router.post('/', auth, allow('admin'), async (req, res, next) => {
  try {
    const { name, email, password, specialization, fee, bio, phone } = req.body;
    if (!name || !email || !password || !specialization) return res.status(400).json({ message: 'Name, email, password and specialization are required' });
    const bcrypt = await import('bcryptjs');
    const doctor = await User.create({ name, email, phone, specialization, fee: Number(fee) || 0, bio, role: 'doctor', password: await bcrypt.default.hash(password, 12) });
    res.status(201).json({ doctor: { id: doctor._id, name: doctor.name, email: doctor.email, specialization: doctor.specialization, fee: doctor.fee } });
  } catch (e) { next(e); }
});
export default router;
