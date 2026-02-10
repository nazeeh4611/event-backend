import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import cloudinary from 'cloudinary';

import { setupDefaultAdmin } from './controllers/adminController.js';

import adminRoutes from './Routes/adminRoutes.js';
import hosterRoutes from './Routes/hosterRoutes.js';
import userRoutes from './Routes/userRoute.js';

dotenv.config();

const app = express();

// ✅ Railway proxy support (cookies / auth)
app.set('trust proxy', 1);

// ✅ body parsers
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ✅ CORS
const allowedOrigins = [
  'https://www.eventra.club',
  'https://eventra.club',
  'https://eventra-uae.vercel.app',
  'http://localhost:5173'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS blocked: ' + origin));
    }
  },
  methods: ['GET','POST','PUT','DELETE','PATCH'],
  allowedHeaders: ['Content-Type','Authorization'],
  credentials: true
}));

// ✅ Cloudinary
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// ✅ Health routes
app.get('/', (req, res) => {
  res.send('Eventra API running ✅');
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// ✅ Mongo connect
if (!process.env.MONGODB_URI) {
  console.error('❌ MONGODB_URI missing');
  process.exit(1);
}

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => {
    console.error('❌ MongoDB error:', err);
    process.exit(1);
  });

// ✅ Routes
app.use('/api/admin', adminRoutes);
app.use('/api/hoster', hosterRoutes);
app.use('/api', userRoutes);

// ✅ 404 fallback
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// ✅ Start server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
