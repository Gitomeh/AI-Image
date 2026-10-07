import { Request, Response, NextFunction } from 'express';
import { PostRepository } from '../repositories';
import { PostEmbeddingRepository } from '../repositories';
import { EmbeddingService } from '../services/embeddings/embeddingService';
import { MatchingService } from '../services/matching/matchingService';
import { ImageSuggestionRepository } from '../repositories';
import { CreatePostSchema } from '../schemas/visionSchema';
import { AppError } from '../middleware/errorHandler';
import { config } from '../config/env';

export class PostController {
  private postRepo: PostRepository;
  private postEmbeddingRepo: PostEmbeddingRepository;
  private embeddingService: EmbeddingService;
  private matchingService: MatchingService;
  private imageSuggestionRepo: ImageSuggestionRepository;

  constructor() {
    this.postRepo = new PostRepository();
    this.postEmbeddingRepo = new PostEmbeddingRepository();
    this.embeddingService = new EmbeddingService();
    this.matchingService = new MatchingService();
    this.imageSuggestionRepo = new ImageSuggestionRepository();
  }

  async createPost(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validate input
      const validatedInput = CreatePostSchema.parse(req.body);

      // Create post
      const post = await this.postRepo.create(validatedInput);

      res.status(201).json(post);
    } catch (error) {
      next(error);
    }
  }

  async getPosts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const offset = parseInt(req.query.offset as string) || 0;

      const posts = await this.postRepo.findAll(limit, offset);

      res.json(posts);
    } catch (error) {
      next(error);
    }
  }

  async getPost(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const post = await this.postRepo.findById(id);

      if (!post) {
        throw new AppError(404, 'Post not found', 'NOT_FOUND');
      }

      res.json(post);
    } catch (error) {
      next(error);
    }
  }

  async getPostImages(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      // Check if post exists
      const post = await this.postRepo.findById(id);
      if (!post) {
        throw new AppError(404, 'Post not found', 'NOT_FOUND');
      }

      // Get or generate post embedding
      let postEmbedding = await this.postEmbeddingRepo.findByPostIdAndModel(
        id,
        config.EMBEDDING_MODEL
      );

      if (!postEmbedding) {
        // Generate embedding
        const embedding = await this.embeddingService.generatePostEmbedding(post.content);
        postEmbedding = await this.postEmbeddingRepo.create({
          post_id: id,
          embedding,
          embedding_model: config.EMBEDDING_MODEL
        });
      }

      // Get existing suggestions or generate new ones
      let suggestions = await this.imageSuggestionRepo.findByPostId(id);

      if (suggestions.length === 0) {
        // Generate new suggestions
        const matchingResult = await this.matchingService.findMatchesForPost(
          postEmbedding.embedding
        );

        // Store suggestions
        for (const candidate of matchingResult.candidates) {
          await this.imageSuggestionRepo.create({
            post_id: id,
            image_id: candidate.imageId,
            similarity_score: candidate.similarityScore,
            confidence: candidate.confidence,
            guard_decision: candidate.guardDecision,
            rejection_reason: candidate.rejectionReason,
            rank: candidate.rank
          });
        }

        suggestions = await this.imageSuggestionRepo.findByPostId(id);
      }

      // Format response
      const formattedSuggestions = suggestions.map(s => ({
        imageId: s.image_id,
        rank: s.rank,
        similarityScore: s.similarity_score,
        confidence: s.confidence,
        guardDecision: s.guard_decision,
        rejectionReason: s.rejection_reason
      }));

      res.json(formattedSuggestions);
    } catch (error) {
      next(error);
    }
  }
}
