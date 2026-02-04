import express from 'express';
import reservationController from '../controllers/reservationController.js';
import { authenticateAdmin, authorizeRole } from '../middleware/auth.js';

const router = express.Router();

router.post('/', reservationController.createReservation);

router.get(
  '/',
  authenticateAdmin,
  authorizeRole('admin', 'superadmin', 'moderator'),
  reservationController.getReservations
);

router.put(
  '/:id/status',
  authenticateAdmin,
  authorizeRole('admin', 'superadmin', 'moderator'),
  reservationController.updateReservationStatus
);

export default router;
