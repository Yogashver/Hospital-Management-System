# CarePoint — Doctor Appointment System

MERN starter for patient, doctor, and administrator appointment workflows.

## Run locally

1. Install Node.js and MongoDB (or use a MongoDB Atlas connection string).
2. Copy `server/.env.example` to `server/.env` and set `MONGO_URI` and a long `JWT_SECRET`.
3. From the root run `npm run install:all`, then `npm run dev`.
4. Open the Vite URL printed in the terminal. The API runs on port 5000.

The first registered user is a patient. To bootstrap an administrator, set `ADMIN_EMAIL` in the server environment; only a registration for that email gets the admin role. Doctor accounts can be created by an admin.

## API

`/api/auth` handles registration and login; `/api/doctors` lists and manages doctors; `/api/appointments` handles patient booking and appointment actions; `/api/admin` provides administrator summaries and user management. All protected endpoints use bearer JWTs and server-side role checks. Booking requests reject overlapping active appointments for the same doctor and time window.

This starter does not include payments, video conferencing, email delivery, or clinical-record storage. Configure HTTPS, secure secrets, backups, rate limits, and production CORS before deployment.
