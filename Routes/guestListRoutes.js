import express from 'express';
import guestListController from '../controllers/guestListController.js';
import { authenticateAdmin, authorizeRole } from '../middleware/auth.js';

const router = express.Router();

router.post('/', guestListController.addToGuestList);

router.get(
  '/',
  authenticateAdmin,
  authorizeRole('admin', 'superadmin', 'moderator'),
  guestListController.getGuestList
);

router.put(
  '/:id',
  authenticateAdmin,
  authorizeRole('admin', 'superadmin', 'moderator'),
  guestListController.updateGuest
);

router.put(
  '/:id/checkin',
  authenticateAdmin,
  authorizeRole('admin', 'superadmin', 'moderator'),
  guestListController.checkInGuest
);

router.delete(
  '/:id',
  authenticateAdmin,
  authorizeRole('admin', 'superadmin'),
  guestListController.deleteGuest
);

export default router;
