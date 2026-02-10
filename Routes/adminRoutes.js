import express from 'express';
import multer from 'multer';
import {
  loginAdmin,
  getDashboardStats,
  getAllHosters,
  getHosterById,
  updateHosterStatus,
  getAllEvents,
  updateEventStatus,
  getEventReservations,
  getEventGuests,
  getCarouselEvents,
  updateCarouselOrder
} from '../controllers/adminController.js';
import { authenticateAdmin } from '../middleware/auth.js';

const router = express.Router();

router.post('/login', loginAdmin);
router.get('/dashboard', authenticateAdmin, getDashboardStats);

router.get('/hosters', authenticateAdmin, getAllHosters);
router.get('/hosters/:id', authenticateAdmin, getHosterById);
router.put('/hosters/:id/status', authenticateAdmin, updateHosterStatus);

router.get('/events', authenticateAdmin, getAllEvents);
router.put('/events/:id/status', authenticateAdmin, updateEventStatus);
router.get('/events/:eventId/reservations', authenticateAdmin, getEventReservations);
router.get('/events/:eventId/guests', authenticateAdmin, getEventGuests);

router.get('/carousel', getCarouselEvents);
router.put('/carousel/order', authenticateAdmin, updateCarouselOrder);

export default router;