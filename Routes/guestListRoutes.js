import express from 'express';
import guestListController from '../controllers/guestListController.js';
import { authenticateAdmin, authorizeRole } from '../middleware/auth.js';

const router = express.Router();

router.post('/', authenticateAdmin, authorizeRole('hoster', 'superadmin'), guestListController.addToGuestList);

router.get('/', authenticateAdmin, guestListController.getGuestList);

router.put('/:id', authenticateAdmin, guestListController.updateGuest);

router.put('/:id/checkin', authenticateAdmin, guestListController.checkInGuest);

router.delete('/:id', authenticateAdmin, guestListController.deleteGuest);

export default router;