import { Request, Response, NextFunction } from 'express';
import { JobService } from '../services/jobs/jobService';
import { AppError } from '../middleware/errorHandler';

export class JobController {
  private jobService: JobService;

  constructor() {
    this.jobService = new JobService();
  }

  async processAllImages(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Start batch processing job (async)
      this.jobService.processAllImages().catch(error => {
        console.error('Batch processing failed:', error);
      });

      res.json({
        message: 'Batch image processing started',
        status: 'processing'
      });
    } catch (error) {
      next(error);
    }
  }

  async generateEmbeddings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Start batch embedding generation (async)
      this.jobService.generateEmbeddingsForAllImages().catch(error => {
        console.error('Batch embedding generation failed:', error);
      });

      res.json({
        message: 'Batch embedding generation started',
        status: 'processing'
      });
    } catch (error) {
      next(error);
    }
  }

  async getJob(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const job = await this.jobService.getJobStatus(id);

      if (!job) {
        throw new AppError(404, 'Job not found', 'NOT_FOUND');
      }

      res.json(job);
    } catch (error) {
      next(error);
    }
  }
}
