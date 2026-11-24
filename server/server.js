import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import mongoose from 'mongoose';
import authRoutes from './src/routes/auth.js';
import doctorRoutes from './src/routes/doctors.js';
import appointmentRoutes from './src/routes/appointments.js';
import adminRoutes from './src/routes/admin.js';
import { BookingSlot } from './src/models.js';

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json());
app.use(morgan('dev'));
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/admin', adminRoutes);
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || 'Server error' });
});

const port = process.env.PORT || 5000;
mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/doctor_appointments')
  .then(async () => { await BookingSlot.init(); app.listen(port, () => console.log(`API listening on ${port}`)); })
  .catch((err) => { console.error('MongoDB connection failed:', err.message); process.exit(1); });
