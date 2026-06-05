import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { getLocations, getLocation, createLocation, updateLocation, deleteLocation } from '../controllers/locations.controller';

const router = Router();

router.use(requireAuth);

router.get('/', getLocations);
router.post('/', createLocation);
router.get('/:id', getLocation);
router.patch('/:id', updateLocation);
router.delete('/:id', deleteLocation);

export default router;
