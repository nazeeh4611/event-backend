import express from 'express';
import multer from 'multer';
import { authenticateHoster } from '../middleware/auth.js';
import {
  registerHoster,
  loginHoster,
  getHosterDashboard,
  createEvent,
  getHosterEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  updateEventStatus,
  getHosterReservations,
  updateReservationStatus,
  getHosterGuests,
  addGuest,
  updateGuest,
  checkInGuest,
  deleteGuest,
  getHosterProfile,
  updateHosterProfile,
  verifyCurrentPassword
} from '../controllers/hosterController.js';

const router = express.Router();
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
});

router.post('/register', registerHoster);
router.post('/login', loginHoster);

router.use(authenticateHoster);

router.get('/dashboard', getHosterDashboard);
router.get('/profile', getHosterProfile);
router.put('/profile', updateHosterProfile);
router.post('/profile/verify-password', verifyCurrentPassword);
router.get('/events', getHosterEvents);
router.get('/events/:id', getEventById);
router.post('/events', upload.array('images', 10), createEvent);
router.put('/events/:id', upload.array('images', 10), updateEvent);
router.delete('/events/:id', deleteEvent);
router.put('/events/:id/status', updateEventStatus);
router.get('/reservations', getHosterReservations);
router.put('/reservations/:id', updateReservationStatus);
router.get('/guests', getHosterGuests);
router.post('/guests', addGuest);
router.put('/guests/:id', updateGuest);
router.put('/guests/:id/checkin', checkInGuest);
router.delete('/guests/:id', deleteGuest);

export default router;