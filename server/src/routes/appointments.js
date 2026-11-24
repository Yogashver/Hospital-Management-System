import { Router } from 'express';
import { Appointment, BookingSlot, User } from '../models.js';
import { auth, allow } from '../middleware.js';
const router = Router();
const activeStatuses = ['pending', 'confirmed'];
const populate = (query) => query.populate('patient', 'name email phone').populate('doctor', 'name email specialization fee');
const updateStates = { doctor: ['confirmed', 'rejected', 'completed'], patient: ['cancelled'] };

const appointmentFilter = (user) => user.role === 'admin' ? {} : user.role === 'doctor' ? { doctor: user._id } : { patient: user._id };
const validateTime = (time) => /^([01]\d|2[0-3]):(00|30)$/.test(time);

router.get('/', auth, async (req, res, next) => {
  try {
    const filter = appointmentFilter(req.user);
    if (req.query.status) filter.status = req.query.status;
    res.json({ appointments: await populate(Appointment.find(filter).sort({ date: 1, time: 1 })) });
  } catch (e) { next(e); }
});
router.get('/availability', async (req, res, next) => {
  try {
    const { doctor, date } = req.query;
    if (!doctor || !date || Number.isNaN(Date.parse(date))) return res.status(400).json({ message: 'Doctor and date are required' });
    const start = new Date(`${date}T00:00:00`); const end = new Date(`${date}T23:59:59.999`);
    const booked = await Appointment.find({ doctor, date: { $gte: start, $lte: end }, status: { $in: activeStatuses } }).select('time');
    const provider = await User.findOne({ _id: doctor, role: 'doctor', available: true }).select('workingDays startTime endTime');
    if (!provider) return res.status(404).json({ message: 'Doctor is not available' });
    const dayNumber = new Date(`${date}T12:00:00`).getDay();
    if (!provider.workingDays.includes(dayNumber)) return res.json({ slots: [] });
    const toMinutes = (value) => { const [h, m] = value.split(':').map(Number); return h * 60 + m; };
    const open = toMinutes(provider.startTime); const close = toMinutes(provider.endTime);
    let slots = [];
    for (let minute = open; minute + 30 <= close; minute += 30) slots.push(`${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`);
    if (date === new Date().toISOString().slice(0, 10)) {
      const now = new Date(); const currentMinute = now.getHours() * 60 + now.getMinutes();
      slots = slots.filter((slot) => toMinutes(slot) > currentMinute);
    }
    res.json({ slots: slots.filter((slot) => !booked.some((appointment) => appointment.time === slot)) });
  } catch (e) { next(e); }
});
router.post('/', auth, allow('patient'), async (req, res, next) => {
  try {
    const { doctor: doctorId, date: dateInput, time, mode, reason } = req.body;
    const date = new Date(dateInput);
    if (!doctorId || Number.isNaN(date.getTime()) || !validateTime(time) || !['online', 'offline'].includes(mode)) return res.status(400).json({ message: 'Choose a valid doctor, date, time and consultation type' });
    if (date < new Date(new Date().setHours(0, 0, 0, 0))) return res.status(400).json({ message: 'Appointments must be booked for a future date' });
    const doctor = await User.findOne({ _id: doctorId, role: 'doctor', available: true });
    if (!doctor) return res.status(404).json({ message: 'Doctor is not available' });
    if (!doctor.consultationModes.includes(mode)) return res.status(400).json({ message: 'This doctor does not offer that consultation type' });
    const day = new Date(dateInput).toISOString().slice(0, 10);
    const dayNumber = new Date(`${day}T12:00:00`).getDay();
    const toMinutes = (value) => { const [h, m] = value.split(':').map(Number); return h * 60 + m; };
    const requestedMinute = toMinutes(time); const opening = toMinutes(doctor.startTime); const closing = toMinutes(doctor.endTime);
    if (!doctor.workingDays.includes(dayNumber) || requestedMinute < opening || requestedMinute + 30 > closing || (requestedMinute - opening) % 30 !== 0) return res.status(400).json({ message: 'That time is outside the doctor’s working schedule' });
    if (day === new Date().toISOString().slice(0, 10) && requestedMinute <= new Date().getHours() * 60 + new Date().getMinutes()) return res.status(400).json({ message: 'Choose a future time' });
    if (await Appointment.exists({ doctor: doctorId, date: { $gte: new Date(`${day}T00:00:00`), $lte: new Date(`${day}T23:59:59.999`) }, time, status: { $in: activeStatuses } })) return res.status(409).json({ message: 'That time was just booked. Choose another slot.' });
    const appointment = await Appointment.create({ patient: req.user._id, doctor: doctorId, date: new Date(dateInput), time, mode, reason });
    try {
      await BookingSlot.create({ doctor: doctorId, day, time, appointment: appointment._id });
    } catch (e) {
      await Appointment.findByIdAndDelete(appointment._id);
      if (e.code === 11000) return res.status(409).json({ message: 'That time was just booked. Choose another slot.' });
      throw e;
    }
    res.status(201).json({ appointment: await populate(Appointment.findById(appointment._id)) });
  } catch (e) { next(e); }
});
router.patch('/:id/status', auth, async (req, res, next) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });
    const isAdmin = req.user.role === 'admin';
    const owner = req.user.role === 'doctor' ? appointment.doctor.equals(req.user._id) : appointment.patient.equals(req.user._id);
    const allowed = updateStates[req.user.role]?.includes(req.body.status);
    if ((!owner && !isAdmin) || (!allowed && !isAdmin)) return res.status(403).json({ message: 'You cannot make that appointment change' });
    if (isAdmin && !['pending', 'confirmed', 'completed', 'cancelled', 'rejected'].includes(req.body.status)) return res.status(400).json({ message: 'Invalid status' });
    appointment.status = req.body.status; await appointment.save();
    if (['cancelled', 'rejected'].includes(appointment.status)) await BookingSlot.deleteOne({ appointment: appointment._id });
    res.json({ appointment: await populate(Appointment.findById(appointment._id)) });
  } catch (e) { next(e); }
});
router.delete('/:id', auth, allow('admin'), async (req, res, next) => {
  try { const result = await Appointment.findByIdAndDelete(req.params.id); if (!result) return res.status(404).json({ message: 'Appointment not found' }); await BookingSlot.deleteOne({ appointment: result._id }); res.json({ message: 'Appointment deleted' }); }
  catch (e) { next(e); }
});
export default router;
