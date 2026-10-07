import { Request, Response, NextFunction } from 'express';
import { ImageSuggestionRepository } from '../repositories';
import { ReviewRepository } from '../repositories';
import { ReviewActionSchema } from '../schemas/visionSchema';
import { AppError } from '../middleware/errorHandler';

export class SuggestionController {
  private suggestionRepo: ImageSuggestionRepository;
  private reviewRepo: ReviewRepository;

  constructor() {
    this.suggestionRepo = new ImageSuggestionRepository();
    this.reviewRepo = new ReviewRepository();
  }

  async getSuggestions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const offset = parseInt(req.query.offset as string) || 0;

      // Get all reviews (which have suggestion info)
      const reviews = await this.reviewRepo.findAll(limit, offset);

      // Get suggestion details for each review
      const suggestionsWithReviews = await Promise.all(
        reviews.map(async (review) => {
          const suggestion = await this.suggestionRepo.findById(review.suggestion_id);
          return {
            ...suggestion,
            review: review
          };
        })
      );

      res.json(suggestionsWithReviews);
    } catch (error) {
      next(error);
    }
  }

  async getSuggestion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const suggestion = await this.suggestionRepo.findById(id);

      if (!suggestion) {
        throw new AppError(404, 'Suggestion not found', 'NOT_FOUND');
      }

      // Get review if exists
      const review = await this.reviewRepo.findBySuggestionId(id);

      res.json({
        ...suggestion,
        review
      });
    } catch (error) {
      next(error);
    }
  }

  async approveSuggestion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      // Validate input
      const validatedInput = ReviewActionSchema.parse(req.body);

      // Check if suggestion exists
      const suggestion = await this.suggestionRepo.findById(id);
      if (!suggestion) {
        throw new AppError(404, 'Suggestion not found', 'NOT_FOUND');
      }

      // Create or update review
      const review = await this.reviewRepo.create({
        suggestion_id: id,
        review_status: validatedInput.review_status,
        reviewer: validatedInput.reviewer,
        reason: validatedInput.reason
      });

      res.json({
        message: 'Suggestion reviewed successfully',
        review
      });
    } catch (error) {
      next(error);
    }
  }

  async rejectSuggestion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      // Validate input
      const validatedInput = ReviewActionSchema.parse(req.body);

      // Check if suggestion exists
      const suggestion = await this.suggestionRepo.findById(id);
      if (!suggestion) {
        throw new AppError(404, 'Suggestion not found', 'NOT_FOUND');
      }

      // Create or update review
      const review = await this.reviewRepo.create({
        suggestion_id: id,
        review_status: validatedInput.review_status,
        reviewer: validatedInput.reviewer,
        reason: validatedInput.reason
      });

      res.json({
        message: 'Suggestion reviewed successfully',
        review
      });
    } catch (error) {
      next(error);
    }
  }
}
