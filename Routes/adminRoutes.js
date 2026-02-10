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

const adminRoutes = express.Router();

adminRoutes.post('/login', loginAdmin);
adminRoutes.get('/dashboard', authenticateAdmin, getDashboardStats);

adminRoutes.get('/hosters', authenticateAdmin, getAllHosters);
adminRoutes.get('/hosters/:id', authenticateAdmin, getHosterById);
adminRoutes.put('/hosters/:id/status', authenticateAdmin, updateHosterStatus);

adminRoutes.get('/events', authenticateAdmin, getAllEvents);
adminRoutes.put('/events/:id/status', authenticateAdmin, updateEventStatus);
adminRoutes.get('/events/:eventId/reservations', authenticateAdmin, getEventReservations);
adminRoutes.get('/events/:eventId/guests', authenticateAdmin, getEventGuests);

adminRoutes.get('/carousel', getCarouselEvents);
adminRoutes.put('/carousel/order', authenticateAdmin, updateCarouselOrder);

export default adminRoutes;