import { ProcessingJobRepository } from '../../repositories';
import { ImageRepository } from '../../repositories';
import { ImageMetadataRepository } from '../../repositories';
import { ImageEmbeddingRepository } from '../../repositories';
import { VisionService } from '../vision/visionService';
import { EmbeddingService } from '../embeddings/embeddingService';
import { ProcessingJob, JobType, JobStatus } from '../../models/ProcessingJob';
import { config } from '../../config/env';
import { ImageFetcher } from '../../utils/imageFetcher';

export class JobService {
  private jobRepo: ProcessingJobRepository;
  private imageRepo: ImageRepository;
  private imageMetadataRepo: ImageMetadataRepository;
  private imageEmbeddingRepo: ImageEmbeddingRepository;
  private visionService: VisionService;
  private embeddingService: EmbeddingService;

  constructor() {
    this.jobRepo = new ProcessingJobRepository();
    this.imageRepo = new ImageRepository();
    this.imageMetadataRepo = new ImageMetadataRepository();
    this.imageEmbeddingRepo = new ImageEmbeddingRepository();
    this.visionService = new VisionService();
    this.embeddingService = new EmbeddingService();
  }

  /**
   * Create a new job
   */
  async createJob(jobType: JobType, entityType: string, entityId: string): Promise<ProcessingJob> {
    // Check if a similar job already exists and is not completed
    const existingJobs = await this.jobRepo.findByTarget(entityType, entityId);
    const pendingOrRunning = existingJobs.find(
      j => j.status === 'pending' || j.status === 'running'
    );

    if (pendingOrRunning) {
      return pendingOrRunning;
    }

    return this.jobRepo.create({
      job_type: jobType,
      target_entity_type: entityType,
      target_entity_id: entityId
    });
  }

  /**
   * Process a single image (vision analysis + embedding)
   */
  async processImage(imageId: string): Promise<void> {
    // Create or get existing job
    const job = await this.createJob('image_processing', 'image', imageId);

    // Check if already has valid metadata and embedding
    const existingMetadata = await this.imageMetadataRepo.findByImageId(imageId);
    const existingEmbedding = await this.imageEmbeddingRepo.findByImageIdAndModel(
      imageId,
      config.EMBEDDING_MODEL
    );

    if (existingMetadata && existingEmbedding && existingMetadata.validation_status === 'valid') {
      console.log(`[JOB] Image ${imageId} already has valid metadata and embedding`);
      await this.jobRepo.markCompleted(job.id);
      return;
    }

    // Mark job as started
    await this.jobRepo.markStarted(job.id);

    try {
      // Get image
      const image = await this.imageRepo.findById(imageId);
      if (!image) {
        throw new Error(`Image ${imageId} not found`);
      }

      // Update status to processing
      await this.imageRepo.updateStatus(imageId, 'processing');

      let visionResult: any;
      let validationStatus: 'valid' | 'invalid' | 'low_confidence' = 'valid';

      // If metadata doesn't exist or is invalid, run vision analysis
      if (!existingMetadata || existingMetadata.validation_status !== 'valid') {
        // Fetch image from source URL
        if (!image.source_url) {
          throw new Error(`Image ${imageId} has no source_url`);
        }

        console.log(`[JOB] Fetching image from ${image.source_url}`);
        const { buffer, mimeType } = await ImageFetcher.fetch(image.source_url);

        // Analyze image with vision service
        console.log(`[JOB] Analyzing image ${imageId} with vision model`);
        visionResult = await this.visionService.analyzeImage(buffer, mimeType);

        // Determine validation status based on confidence
        if (visionResult.confidence < config.CONFIDENCE_THRESHOLD) {
          validationStatus = 'low_confidence';
          console.log(`[JOB] Image ${imageId} has low confidence: ${visionResult.confidence}`);
        }

        // Store metadata
        console.log(`[JOB] Storing metadata for image ${imageId}`);
        await this.imageMetadataRepo.create({
          image_id: imageId,
          subject: visionResult.subject,
          category: visionResult.category,
          attributes: visionResult.attributes,
          caption: visionResult.caption,
          confidence: visionResult.confidence,
          validation_status: validationStatus,
          raw_ai_response: visionResult
        });
      } else {
        // Use existing metadata
        visionResult = existingMetadata;
        validationStatus = existingMetadata.validation_status;
        console.log(`[JOB] Using existing metadata for image ${imageId}`);
      }

      // If confidence is high enough and no embedding exists, generate embedding
      if (validationStatus === 'valid' && !existingEmbedding) {
        console.log(`[JOB] Generating embedding for image ${imageId}`);
        const embedding = await this.embeddingService.generateImageEmbedding(visionResult.caption);

        await this.imageEmbeddingRepo.create({
          image_id: imageId,
          embedding,
          embedding_model: config.EMBEDDING_MODEL
        });
      } else if (existingEmbedding) {
        console.log(`[JOB] Image ${imageId} already has embedding`);
      } else {
        console.log(`[JOB] Skipping embedding generation for image ${imageId} due to low confidence`);
      }

      // Mark as completed
      await this.jobRepo.markCompleted(job.id);
      await this.imageRepo.updateStatus(imageId, validationStatus === 'valid' ? 'completed' : 'needs_review');

      console.log(`[JOB] Successfully processed image ${imageId}`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      console.error(`[JOB] Error processing image ${imageId}:`, errorMessage);

      // Increment attempts
      await this.jobRepo.incrementAttempts(job.id);

      // Check if we should retry
      const updatedJob = await this.jobRepo.findById(job.id);
      if (updatedJob && updatedJob.attempts < config.MAX_RETRY_ATTEMPTS) {
        await this.jobRepo.updateStatus(job.id, 'retrying', errorMessage);
      } else {
        await this.jobRepo.updateStatus(job.id, 'failed', errorMessage);
        await this.imageRepo.updateStatus(imageId, 'failed');
      }

      throw error;
    }
  }

  /**
   * Process all pending images (batch job)
   */
  async processAllImages(): Promise<ProcessingJob> {
    // Create a batch job
    const batchJob = await this.createJob('batch_processing', 'batch', 'all_images');
    await this.jobRepo.markStarted(batchJob.id);

    try {
      // Get all pending images
      const pendingImages = await this.imageRepo.findByStatus('pending');

      console.log(`[BATCH JOB] Processing ${pendingImages.length} pending images`);

      // Process each image
      for (const image of pendingImages) {
        try {
          await this.processImage(image.id);
        } catch (error) {
          console.error(`[BATCH JOB] Failed to process image ${image.id}:`, error);
          // Continue with next image
        }
      }

      await this.jobRepo.markCompleted(batchJob.id);
      return batchJob;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.jobRepo.updateStatus(batchJob.id, 'failed', errorMessage);
      throw error;
    }
  }

  /**
   * Generate embedding for an image (if metadata exists)
   */
  async generateImageEmbedding(imageId: string): Promise<void> {
    const job = await this.createJob('image_embedding', 'image', imageId);

    // Check if embedding already exists
    const existingEmbedding = await this.imageEmbeddingRepo.findByImageIdAndModel(
      imageId,
      config.EMBEDDING_MODEL
    );

    if (existingEmbedding) {
      await this.jobRepo.markCompleted(job.id);
      return;
    }

    await this.jobRepo.markStarted(job.id);

    try {
      // Get image metadata
      const metadata = await this.imageMetadataRepo.findByImageId(imageId);
      if (!metadata) {
        throw new Error(`No metadata found for image ${imageId}`);
      }

      if (metadata.validation_status !== 'valid') {
        throw new Error(`Image metadata is not valid for image ${imageId}`);
      }

      // Generate embedding from caption
      const embedding = await this.embeddingService.generateImageEmbedding(metadata.caption);

      // Store embedding
      await this.imageEmbeddingRepo.create({
        image_id: imageId,
        embedding,
        embedding_model: config.EMBEDDING_MODEL
      });

      await this.jobRepo.markCompleted(job.id);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.jobRepo.incrementAttempts(job.id);

      const updatedJob = await this.jobRepo.findById(job.id);
      if (updatedJob && updatedJob.attempts < config.MAX_RETRY_ATTEMPTS) {
        await this.jobRepo.updateStatus(job.id, 'retrying', errorMessage);
      } else {
        await this.jobRepo.updateStatus(job.id, 'failed', errorMessage);
      }

      throw error;
    }
  }

  /**
   * Generate embeddings for all images that have valid metadata but no embeddings
   * This is useful for processing seeded data
   */
  async generateEmbeddingsForAllImages(): Promise<void> {
    console.log('[JOB] Starting batch embedding generation for all images');

    // Get all images with valid metadata
    const allMetadata = await this.imageMetadataRepo.findAll();

    for (const metadata of allMetadata) {
      if (metadata.validation_status === 'valid') {
        try {
          await this.generateImageEmbedding(metadata.image_id);
          console.log(`[JOB] Generated embedding for image ${metadata.image_id}`);
        } catch (error) {
          console.error(`[JOB] Failed to generate embedding for image ${metadata.image_id}:`, error);
          // Continue with next image
        }
      }
    }

    console.log('[JOB] Batch embedding generation completed');
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string): Promise<ProcessingJob | null> {
    return this.jobRepo.findById(jobId);
  }

  /**
   * Get all pending jobs
   */
  async getPendingJobs(): Promise<ProcessingJob[]> {
    return this.jobRepo.findByStatus('pending');
  }

  /**
   * Get all running jobs
   */
  async getRunningJobs(): Promise<ProcessingJob[]> {
    return this.jobRepo.findByStatus('running');
  }
}
