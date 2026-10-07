import { Router } from 'express';
import { JobController } from '../controllers/jobController';

const router = Router();
const jobController = new JobController();

router.post('/images/process', (req, res, next) => jobController.processAllImages(req, res, next));
router.post('/embeddings/generate', (req, res, next) => jobController.generateEmbeddings(req, res, next));
router.get('/:id', (req, res, next) => jobController.getJob(req, res, next));

export default router;
