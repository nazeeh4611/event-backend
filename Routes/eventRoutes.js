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

router.get('/', eventController.getAllEvents);
router.get('/carousel', eventController.getCarouselEvents);

router.post('/', authenticateAdmin, authorizeRole('admin','superadmin'), upload.array('images',10), eventController.createEvent);

router.put('/:id', authenticateAdmin, authorizeRole('admin','superadmin'), upload.array('images',10), eventController.updateEvent);

router.delete('/:id', authenticateAdmin, authorizeRole('superadmin'), eventController.deleteEvent);

router.put('/carousel/order', authenticateAdmin, authorizeRole('admin','superadmin'), eventController.updateCarouselOrder);

// ✅ LAST
router.get('/:id', eventController.getEventById);

export default router;