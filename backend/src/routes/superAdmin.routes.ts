import { Router } from 'express';
import {
  listOrganisations,
  createOrganisation,
  getOrganisation,
  updateOrganisation,
  deleteOrganisation,
  getDashboard,
} from '../controllers/superAdmin.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireSuperAdmin } from '../middleware/role.middleware';

const router = Router();

// All super-admin routes require authentication + super_admin role
router.use(authenticate, requireSuperAdmin);

router.get('/dashboard', getDashboard);
router.get('/organisations', listOrganisations);
router.post('/organisations', createOrganisation);
router.get('/organisations/:id', getOrganisation);
router.patch('/organisations/:id', updateOrganisation);
router.delete('/organisations/:id', deleteOrganisation);

export default router;
