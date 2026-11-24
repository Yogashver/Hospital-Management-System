import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { Appointment, BookingSlot, User } from '../models.js';
import { auth, allow } from '../middleware.js';
const router = Router();
router.use(auth, allow('admin'));
router.get('/summary', async (_req, res, next) => {
  try {
    const [patients, doctors, appointments, pending, completed] = await Promise.all([
      User.countDocuments({ role: 'patient' }), User.countDocuments({ role: 'doctor' }), Appointment.countDocuments(),
      Appointment.countDocuments({ status: 'pending' }), Appointment.countDocuments({ status: 'completed' })
    ]);
    res.json({ patients, doctors, appointments, pending, completed });
  } catch (e) { next(e); }
});
router.get('/users', async (req, res, next) => {
  try { const filter = req.query.role ? { role: req.query.role } : {}; res.json({ users: await User.find(filter).select('-password').sort({ createdAt: -1 }) }); }
  catch (e) { next(e); }
});
router.patch('/users/:id', async (req, res, next) => {
  try {
    const fields = ['name', 'phone', 'role', 'specialization', 'bio', 'fee', 'available', 'consultationModes'];
    const updates = Object.fromEntries(fields.filter((key) => req.body[key] !== undefined).map((key) => [key, req.body[key]]));
    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true }).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' }); res.json({ user });
  } catch (e) { next(e); }
});
router.delete('/users/:id', async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user._id.equals(req.user._id)) return res.status(400).json({ message: 'You cannot delete your own admin account' });
    const linked = await Appointment.find({ $or: [{ patient: user._id }, { doctor: user._id }] }).select('_id');
    await Promise.all([Appointment.deleteMany({ _id: { $in: linked.map((a) => a._id) } }), BookingSlot.deleteMany({ appointment: { $in: linked.map((a) => a._id) } }), user.deleteOne()]);
    res.json({ message: 'User and their appointments deleted' });
  } catch (e) { next(e); }
});
export default router;
