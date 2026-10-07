import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../../config/env';
import { AIUsageLogRepository } from '../../repositories';
import { CreateAIUsageLogInput } from '../../models/AIUsageLog';

export class EmbeddingService {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private usageLogRepo: AIUsageLogRepository;

  constructor() {
    this.genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: config.EMBEDDING_MODEL });
    this.usageLogRepo = new AIUsageLogRepository();
  }

  async generateEmbedding(text: string): Promise<number[]> {
    let success = false;
    let inputTokens: number | undefined;
    let errorMessage: string | undefined;

    try {
      const result = await this.model.embedContent(text);
      const embedding = result.embedding.values;
      
      // Extract token usage if available
      if (result.usageMetadata) {
        inputTokens = result.usageMetadata.promptTokenCount;
      }

      success = true;

      // Log the successful AI call
      await this.logUsage('text_embedding', {
        input_tokens: inputTokens,
        success: true
      });

      return embedding;

    } catch (error) {
      success = false;
      errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Log the failed AI call
      await this.logUsage('text_embedding', {
        input_tokens: inputTokens,
        success: false,
        error_message: errorMessage
      });

      throw new Error(`Embedding generation failed: ${errorMessage}`);
    }
  }

  async generateImageEmbedding(caption: string): Promise<number[]> {
    return this.generateEmbedding(caption);
  }

  async generatePostEmbedding(content: string): Promise<number[]> {
    // For longer content, we might want to use a summary or extract key sentences
    // For now, we'll use the full content (truncated if too long)
    const maxLength = 10000; // Approximate token limit
    const truncatedContent = content.length > maxLength 
      ? content.substring(0, maxLength) 
      : content;
    
    return this.generateEmbedding(truncatedContent);
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  cosineSimilarity(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) {
      throw new Error('Embeddings must have the same length');
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }

    if (norm1 === 0 || norm2 === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  /**
   * Calculate Euclidean distance between two embeddings
   */
  euclideanDistance(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) {
      throw new Error('Embeddings must have the same length');
    }

    let sum = 0;
    for (let i = 0; i < embedding1.length; i++) {
      const diff = embedding1[i] - embedding2[i];
      sum += diff * diff;
    }

    return Math.sqrt(sum);
  }

  private async logUsage(operation: string, metadata: Omit<CreateAIUsageLogInput, 'model' | 'operation'>): Promise<void> {
    try {
      await this.usageLogRepo.create({
        operation,
        model: config.EMBEDDING_MODEL,
        ...metadata
      });
    } catch (error) {
      // Log usage errors shouldn't break the main flow
      console.error('Failed to log AI usage:', error);
    }
  }

  calculateEstimatedCost(inputTokens?: number): number {
    // Gemini text-embedding pricing (approximate)
    const costPer1k = 0.00002; // $0.02 per 1M tokens (placeholder)
    return (inputTokens || 0) / 1000 * costPer1k;
  }
}
