import { Router } from 'express';
import { PostController } from '../controllers/postController';

const router = Router();
const postController = new PostController();

router.post('/', (req, res, next) => postController.createPost(req, res, next));
router.get('/', (req, res, next) => postController.getPosts(req, res, next));
router.get('/:id', (req, res, next) => postController.getPost(req, res, next));
router.get('/:id/images', (req, res, next) => postController.getPostImages(req, res, next));

export default router;
