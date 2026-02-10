import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import cloudinary from 'cloudinary';
import { setupDefaultAdmin } from './controllers/adminController.js';
import eventRoutes from './Routes/eventRoutes.js';
import reservationRoutes from './Routes/reservationRoutes.js';
import guestListRoutes from './Routes/guestListRoutes.js';
import adminRoutes from './Routes/adminRoutes.js';

dotenv.config();

const app = express();

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const allowedOrigins = [
  'www.eventra.club',
  'https://www.eventra.club',
  'https://eventra.club',
  'http://localhost:5173',
  'https://eventra-uae.vercel.app'
];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('MongoDB connected');
    await setupDefaultAdmin();
  })
  .catch((err) => {
    console.error('MongoDB connection failed:', err);
    process.exit(1);
  });

app.use('/api/events', eventRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/guestlist', guestListRoutes);
app.use('/api/admin', adminRoutes);

const PORT = process.env.PORT || 5005;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));