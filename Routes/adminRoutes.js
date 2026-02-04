import express from 'express';
import {
  registerAdmin,
  loginAdmin,
  getDashboardStats,
  getAllAdmins,
  updateAdmin,
  deleteAdmin
} from '../controllers/adminController.js';
import { authenticateAdmin, authorizeRole } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', authenticateAdmin, authorizeRole('superadmin'), registerAdmin);
router.post('/login', loginAdmin);
router.get('/dashboard', authenticateAdmin, getDashboardStats);
router.get('/admins', authenticateAdmin, authorizeRole('superadmin'), getAllAdmins);
router.put('/admins/:id', authenticateAdmin, updateAdmin);
router.delete('/admins/:id', authenticateAdmin, authorizeRole('superadmin'), deleteAdmin);

export default router;