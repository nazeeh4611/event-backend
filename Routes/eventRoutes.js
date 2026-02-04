import express from 'express';
import eventController from '../controllers/eventController.js';
import { authenticateAdmin, authorizeRole } from '../middleware/auth.js';

const router = express.Router();

router.get('/', eventController.getAllEvents);
router.get('/carousel', eventController.getCarouselEvents);
router.get('/:id', eventController.getEventById);

router.post(
  '/',
  authenticateAdmin,
  authorizeRole('admin', 'superadmin'),
  eventController.createEvent
);

router.put(
  '/:id',
  authenticateAdmin,
  authorizeRole('admin', 'superadmin'),
  eventController.updateEvent
);

router.delete(
  '/:id',
  authenticateAdmin,
  authorizeRole('superadmin'),
  eventController.deleteEvent
);

router.put(
  '/carousel/order',
  authenticateAdmin,
  authorizeRole('admin', 'superadmin'),
  eventController.updateCarouselOrder
);

router.put('/carousel/order',
authenticateAdmin,
 authorizeRole('admin', 'superadmin'), 
 eventController.updateCarouselOrder);

export default router;
