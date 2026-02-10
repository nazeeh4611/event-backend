import express from 'express';
import {
  getPublicEvents,
  getEventDetails,
  createReservation,
  getCarouselEvents,
  searchEvents,
  getEventsByCategory,
  getFeaturedEvents
} from '../controllers/userController.js';

const router = express.Router();

router.get('/events', getPublicEvents);
router.get('/events/search', searchEvents);
router.get('/events/category/:category', getEventsByCategory);
router.get('/events/featured', getFeaturedEvents);
router.get('/events/:id', getEventDetails);
router.post('/reservations', createReservation);
router.get('/carousel', getCarouselEvents);

export default router;