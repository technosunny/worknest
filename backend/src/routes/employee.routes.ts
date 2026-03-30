import { Router } from 'express';
import {
  getProfile,
  updateProfile,
  changePassword,
  checkIn,
  checkOut,
  getAttendanceHistory,
  getTodayAttendance,
} from '../controllers/employee.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireEmployee } from '../middleware/role.middleware';
import { requireOrgScope } from '../middleware/orgScope.middleware';
import { uploadSelfie } from '../middleware/upload.middleware';

const router = Router();

// All employee routes require authentication + employee role (or higher) + orgScope
router.use(authenticate, requireEmployee, requireOrgScope);

router.get('/profile', getProfile);
router.patch('/profile', updateProfile);
router.post('/change-password', changePassword);
router.post('/check-in', uploadSelfie, checkIn);
router.post('/check-out', checkOut);
router.get('/attendance', getAttendanceHistory);
router.get('/attendance/today', getTodayAttendance);

export default router;
