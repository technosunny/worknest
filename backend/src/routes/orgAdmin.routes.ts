import { Router } from 'express';
import {
  listEmployees,
  createEmployee,
  getEmployee,
  updateEmployee,
  deactivateEmployee,
  bulkImportEmployees,
  getOrgDashboard,
  getOrgSettings,
  updateOrgSettings,
  listAttendance,
  attendanceReport,
  todayAttendance,
} from '../controllers/orgAdmin.controller';
import { uploadRoster, getRoster } from '../controllers/roster.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireOrgAdmin } from '../middleware/role.middleware';
import { requireOrgScope } from '../middleware/orgScope.middleware';
import { uploadCsv } from '../middleware/upload.middleware';

const router = Router();

// All org-admin routes require authentication + org_admin role + orgScope
router.use(authenticate, requireOrgAdmin, requireOrgScope);

router.get('/attendance/today', todayAttendance);
router.get('/attendance/report', attendanceReport);
router.get('/attendance', listAttendance);
router.get('/dashboard', getOrgDashboard);
router.get('/settings', getOrgSettings);
router.patch('/settings', updateOrgSettings);
router.get('/employees', listEmployees);
router.post('/employees', createEmployee);
router.post('/employees/bulk-import', uploadCsv, bulkImportEmployees);
router.get('/employees/:id', getEmployee);
router.patch('/employees/:id', updateEmployee);
router.delete('/employees/:id', deactivateEmployee);
router.post('/roster/upload', uploadCsv, uploadRoster);
router.get('/roster', getRoster);

export default router;
