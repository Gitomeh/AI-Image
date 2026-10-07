import { Router } from 'express';
import { SuggestionController } from '../controllers/suggestionController';

const router = Router();
const suggestionController = new SuggestionController();

router.get('/', (req, res, next) => suggestionController.getSuggestions(req, res, next));
router.get('/:id', (req, res, next) => suggestionController.getSuggestion(req, res, next));
router.post('/:id/approve', (req, res, next) => suggestionController.approveSuggestion(req, res, next));
router.post('/:id/reject', (req, res, next) => suggestionController.rejectSuggestion(req, res, next));

export default router;
