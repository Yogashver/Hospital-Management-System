import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, select: false },
  phone: { type: String, default: '' },
  role: { type: String, enum: ['patient', 'doctor', 'admin'], default: 'patient' },
  specialization: { type: String, default: '' },
  bio: { type: String, default: '' },
  fee: { type: Number, default: 0 },
  consultationModes: { type: [String], default: ['offline', 'online'] },
  workingDays: { type: [Number], default: [1, 2, 3, 4, 5] },
  startTime: { type: String, default: '09:00' },
  endTime: { type: String, default: '18:00' },
  available: { type: Boolean, default: true }
}, { timestamps: true });

const appointmentSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  time: { type: String, required: true },
  mode: { type: String, enum: ['online', 'offline'], required: true },
  reason: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'confirmed', 'completed', 'cancelled', 'rejected'], default: 'pending' }
}, { timestamps: true });
appointmentSchema.index({ doctor: 1, date: 1, time: 1, status: 1 });

export const User = mongoose.models.User || mongoose.model('User', userSchema);
export const Appointment = mongoose.models.Appointment || mongoose.model('Appointment', appointmentSchema);

const bookingSlotSchema = new mongoose.Schema({
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  day: { type: String, required: true },
  time: { type: String, required: true },
  appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', required: true }
}, { timestamps: true });
bookingSlotSchema.index({ doctor: 1, day: 1, time: 1 }, { unique: true });
export const BookingSlot = mongoose.models.BookingSlot || mongoose.model('BookingSlot', bookingSlotSchema);
