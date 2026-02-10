import express from 'express';
import reservationController from '../controllers/reservationController.js';
import { authenticateAdmin, authorizeRole } from '../middleware/auth.js';

const router = express.Router();

router.post('/', reservationController.createReservation);

router.get('/', authenticateAdmin, reservationController.getReservations);

router.put('/:id/status', authenticateAdmin, reservationController.updateReservationStatus);

export default router;