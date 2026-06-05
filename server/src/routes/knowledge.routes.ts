import { Router } from 'express';
import { requireAuth, requireLocation } from '../middleware/auth';
import { scrapeAndBuild, listKBs, getKB, updateKB, deleteKB } from '../controllers/knowledge.controller';

const router = Router();

router.use(requireAuth);
router.use(requireLocation);

router.get('/', listKBs);
router.post('/scrape', scrapeAndBuild);
router.get('/:id', getKB);
router.patch('/:id', updateKB);
router.delete('/:id', deleteKB);

export default router;
