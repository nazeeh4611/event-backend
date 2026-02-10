import express from 'express';
import multer from 'multer';
import {
  registerHoster,
  loginHoster,
  getHosterDashboard,
  createEvent,
  getHosterEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  getHosterReservations,
  updateReservationStatus,
  getHosterGuests,
  addGuest,
  updateGuest,
  checkInGuest,
  deleteGuest,
  getHosterProfile,
  updateHosterProfile
} from '../controllers/hosterController.js';
import { authenticateHoster } from '../middleware/auth.js';

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }
});

router.post('/register', registerHoster);
router.post('/login', loginHoster);

router.get('/dashboard', authenticateHoster, getHosterDashboard);

router.post('/events', authenticateHoster, upload.array('images', 10), createEvent);
router.get('/events', authenticateHoster, getHosterEvents);
router.get('/events/:id', authenticateHoster, getEventById);
router.put('/events/:id', authenticateHoster, upload.array('images', 10), updateEvent);
router.delete('/events/:id', authenticateHoster, deleteEvent);

router.get('/reservations', authenticateHoster, getHosterReservations);
router.put('/reservations/:id/status', authenticateHoster, updateReservationStatus);

router.get('/guests', authenticateHoster, getHosterGuests);
router.post('/guests', authenticateHoster, addGuest);
router.put('/guests/:id', authenticateHoster, updateGuest);
router.put('/guests/:id/checkin', authenticateHoster, checkInGuest);
router.delete('/guests/:id', authenticateHoster, deleteGuest);

router.get('/profile', authenticateHoster, getHosterProfile);
router.put('/profile', authenticateHoster, updateHosterProfile);

export default router;