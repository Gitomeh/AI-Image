import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../../config/env';
import { VisionResponseSchema, VisionResponse } from '../../schemas/visionSchema';
import { AIUsageLogRepository } from '../../repositories';
import { CreateAIUsageLogInput } from '../../models/AIUsageLog';

export class VisionService {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private usageLogRepo: AIUsageLogRepository;

  constructor() {
    this.genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: config.VISION_MODEL });
    this.usageLogRepo = new AIUsageLogRepository();
  }

  async analyzeImage(imageData: Buffer | string, mimeType: string = 'image/jpeg'): Promise<VisionResponse> {
    const startTime = Date.now();
    let success = false;
    let inputTokens: number | undefined;
    let outputTokens: number | undefined;
    let errorMessage: string | undefined;

    try {
      const prompt = `
        Analyze this image and provide structured information in JSON format.
        Your response must be a valid JSON object with these exact fields:
        - subject: The main subject of the image (e.g., "red fox", "gray wolf")
        - category: The general category (e.g., "animal", "landscape", "person")
        - attributes: An array of 3-5 key attributes (e.g., ["orange fur", "wild", "forest"])
        - caption: A brief descriptive caption (10-20 words)
        - confidence: A number between 0 and 1 representing your confidence in the classification

        Example response:
        {
          "subject": "red fox",
          "category": "animal",
          "attributes": ["orange fur", "wild", "forest", "pointed ears"],
          "caption": "A red fox standing in a forest with orange fur",
          "confidence": 0.94
        }

        Provide ONLY the JSON, no additional text.
      `;

      const imagePart = {
        inlineData: {
          data: imageData.toString('base64'),
          mimeType
        }
      };

      const result = await this.model.generateContent([prompt, imagePart]);
      const responseText = result.response.text();
      
      // Clean the response to extract JSON
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in AI response');
      }

      const jsonResponse = JSON.parse(jsonMatch[0]);
      
      // Validate against Zod schema
      const validatedResponse = VisionResponseSchema.parse(jsonResponse);
      
      // Extract token usage if available
      if (result.response.usageMetadata) {
        inputTokens = result.response.usageMetadata.promptTokenCount;
        outputTokens = result.response.usageMetadata.candidatesTokenCount;
      }

      success = true;

      // Log the successful AI call
      await this.logUsage('vision_analysis', {
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        success: true
      });

      return validatedResponse;

    } catch (error) {
      success = false;
      errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Log the failed AI call
      await this.logUsage('vision_analysis', {
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        success: false,
        error_message: errorMessage
      });

      throw new Error(`Vision analysis failed: ${errorMessage}`);
    }
  }

  async analyzeImageFromUrl(imageUrl: string): Promise<VisionResponse> {
    // For URL-based images, we'd need to fetch the image first
    // This is a placeholder - actual implementation would fetch the image
    throw new Error('URL-based image analysis not yet implemented. Please provide image data directly.');
  }

  private async logUsage(operation: string, metadata: Omit<CreateAIUsageLogInput, 'model' | 'operation'>): Promise<void> {
    try {
      await this.usageLogRepo.create({
        operation,
        model: config.VISION_MODEL,
        ...metadata
      });
    } catch (error) {
      // Log usage errors shouldn't break the main flow
      console.error('Failed to log AI usage:', error);
    }
  }

  calculateEstimatedCost(inputTokens?: number, outputTokens?: number): number {
    // Gemini Flash pricing (approximate, as of 2024)
    // These are placeholder rates - actual rates should be verified
    const inputCostPer1k = 0.000125; // $0.125 per 1M input tokens
    const outputCostPer1k = 0.000375; // $0.375 per 1M output tokens

    const inputCost = (inputTokens || 0) / 1000 * inputCostPer1k;
    const outputCost = (outputTokens || 0) / 1000 * outputCostPer1k;

    return inputCost + outputCost;
  }
}
