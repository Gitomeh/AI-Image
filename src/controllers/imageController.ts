import { Request, Response, NextFunction } from 'express';
import { ImageRepository } from '../repositories';
import { JobService } from '../services/jobs/jobService';
import { CreateImageSchema } from '../schemas/visionSchema';
import { AppError } from '../middleware/errorHandler';

export class ImageController {
  private imageRepo: ImageRepository;
  private jobService: JobService;

  constructor() {
    this.imageRepo = new ImageRepository();
    this.jobService = new JobService();
  }

  async createImage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validate input
      const validatedInput = CreateImageSchema.parse(req.body);

      // Create image
      const image = await this.imageRepo.create(validatedInput);

      res.status(201).json(image);
    } catch (error) {
      next(error);
    }
  }

  async getImages(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const offset = parseInt(req.query.offset as string) || 0;

      const images = await this.imageRepo.findAll(limit, offset);

      res.json(images);
    } catch (error) {
      next(error);
    }
  }

  async getImage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const image = await this.imageRepo.findById(id);

      if (!image) {
        throw new AppError(404, 'Image not found', 'NOT_FOUND');
      }

      res.json(image);
    } catch (error) {
      next(error);
    }
  }

  async processImage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      // Check if image exists
      const image = await this.imageRepo.findById(id);
      if (!image) {
        throw new AppError(404, 'Image not found', 'NOT_FOUND');
      }

      // Start processing job (async)
      this.jobService.processImage(id).catch(error => {
        console.error(`Failed to process image ${id}:`, error);
      });

      res.json({
        message: 'Image processing started',
        imageId: id,
        status: 'processing'
      });
    } catch (error) {
      next(error);
    }
  }
}
