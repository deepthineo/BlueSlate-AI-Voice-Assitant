import { Router } from 'express';
import multer from 'multer';
import { requireAuth, requireLocation } from '../middleware/auth';
import { scrapeAndBuild, listKBs, getKB, updateKB, deleteKB, extractFile } from '../controllers/knowledge.controller';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }); // 10 MB max

router.use(requireAuth);
router.use(requireLocation);

router.get('/', listKBs);
router.post('/scrape', scrapeAndBuild);
router.post('/extract', upload.single('file'), extractFile);
router.get('/:id', getKB);
router.patch('/:id', updateKB);
router.delete('/:id', deleteKB);

export default router;
