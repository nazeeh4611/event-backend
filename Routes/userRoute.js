import express from 'express';
import {
  getPublicEvents,
  getEventDetails,
  createReservation,
  getCarouselEvents,
  searchEvents,
  getEventsByCategory,
  getFeaturedEvents,
  addToGuestList,
  checkReservationStatus,
  getUpcomingEvents,
  getAllCategories
} from '../controllers/userController.js';

const router = express.Router();

router.get('/carousel', getCarouselEvents);
router.get('/allevents', getPublicEvents);
router.get('/allevents/upcoming', getUpcomingEvents);
router.get('/allevents/search', searchEvents);
router.get('/allevents/featured', getFeaturedEvents);
router.get('/allevents/category/:category', getEventsByCategory);
router.get('/allevents/:id', getEventDetails);
router.get('/categories', getAllCategories);
router.post('/reservations', createReservation);
router.get('/reservations/status', checkReservationStatus);
router.post('/guestlist', addToGuestList);

export default router;