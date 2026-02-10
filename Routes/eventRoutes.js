import express from 'express';
import multer from 'multer';
import eventController from '../controllers/eventController.js';
import { authenticateAdmin, authorizeRole } from '../middleware/auth.js';

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }
});

router.get('/', authenticateAdmin, eventController.getAllEvents);
router.get('/carousel', eventController.getCarouselEvents);
router.get('/all', authenticateAdmin, authorizeRole('superadmin'), eventController.getAllEventsForSuperadmin);

router.put('/:id/carousel', authenticateAdmin, authorizeRole('superadmin'), eventController.updateCarouselStatus);

router.post('/', authenticateAdmin, authorizeRole('hoster'), upload.array('images',10), eventController.createEvent);

router.put('/:id', authenticateAdmin, eventController.updateEvent);

router.delete('/:id', authenticateAdmin, eventController.deleteEvent);

router.put('/carousel/order', authenticateAdmin, authorizeRole('superadmin'), eventController.updateCarouselOrder);

router.get('/:id', authenticateAdmin, eventController.getEventById);

export default router;