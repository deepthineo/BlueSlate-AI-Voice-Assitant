import { Router } from 'express';
import { requireAuth, requireLocation } from '../middleware/auth';
import { getCalls, getCall, getCallStats } from '../controllers/calls.controller';

const router = Router();

router.use(requireAuth);
router.use(requireLocation);

router.get('/', getCalls);
router.get('/stats', getCallStats);
router.get('/:id', getCall);

export default router;
