import { Router } from 'express';
import { ImageController } from '../controllers/imageController';

const router = Router();
const imageController = new ImageController();

router.post('/', (req, res, next) => imageController.createImage(req, res, next));
router.get('/', (req, res, next) => imageController.getImages(req, res, next));
router.get('/:id', (req, res, next) => imageController.getImage(req, res, next));
router.post('/:id/process', (req, res, next) => imageController.processImage(req, res, next));

export default router;
