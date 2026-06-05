import { Router } from 'express';
import { requireAuth, requireLocation } from '../middleware/auth';
import { getLeads, getLead, patchLead, getStats } from '../controllers/leads.controller';

const router = Router();

router.use(requireAuth);
router.use(requireLocation);

router.get('/', getLeads);
router.get('/stats', getStats);
router.get('/:id', getLead);
router.patch('/:id', patchLead);

export default router;
