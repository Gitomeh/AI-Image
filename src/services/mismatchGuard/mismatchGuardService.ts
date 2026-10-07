import { config } from '../../config/env';
import { ImageMetadata } from '../../models/ImageMetadata';

// Allow config to be mocked in tests
export const getConfig = () => config;

export interface GuardResult {
  accepted: boolean;
  reason: string;
  similarityScore: number;
  confidence: number;
}

export interface GuardInput {
  postSubject?: string;
  postCategory?: string;
  imageMetadata: ImageMetadata;
  similarityScore: number;
}

export class MismatchGuardService {
  /**
   * The central safety mechanism that combines multiple factors to determine
   * if an image suggestion should be accepted or rejected.
   */
  async evaluate(input: GuardInput): Promise<GuardResult> {
    const { imageMetadata, similarityScore } = input;

    // Check 1: Similarity threshold
    const cfg = getConfig();
    if (similarityScore < cfg.SIMILARITY_THRESHOLD) {
      return {
        accepted: false,
        reason: `Similarity score ${similarityScore.toFixed(2)} is below threshold ${cfg.SIMILARITY_THRESHOLD}`,
        similarityScore,
        confidence: imageMetadata.confidence
      };
    }

    // Check 2: AI confidence threshold
    if (imageMetadata.confidence < cfg.CONFIDENCE_THRESHOLD) {
      return {
        accepted: false,
        reason: `AI confidence ${imageMetadata.confidence.toFixed(2)} is below threshold ${cfg.CONFIDENCE_THRESHOLD}`,
        similarityScore,
        confidence: imageMetadata.confidence
      };
    }

    // Check 3: Validation status
    if (imageMetadata.validation_status === 'invalid') {
      return {
        accepted: false,
        reason: 'Image metadata validation status is invalid',
        similarityScore,
        confidence: imageMetadata.confidence
      };
    }

    if (imageMetadata.validation_status === 'low_confidence') {
      return {
        accepted: false,
        reason: 'Image metadata has low confidence validation status',
        similarityScore,
        confidence: imageMetadata.confidence
      };
    }

    // Check 4: Subject compatibility (if post subject is provided)
    if (input.postSubject) {
      const subjectMatch = this.checkSubjectCompatibility(
        input.postSubject,
        imageMetadata.subject
      );

      if (!subjectMatch.compatible) {
        return {
          accepted: false,
          reason: subjectMatch.reason,
          similarityScore,
          confidence: imageMetadata.confidence
        };
      }
    }

    // Check 5: Category compatibility (if post category is provided)
    if (input.postCategory) {
      const categoryMatch = this.checkCategoryCompatibility(
        input.postCategory,
        imageMetadata.category
      );

      if (!categoryMatch.compatible) {
        return {
          accepted: false,
          reason: categoryMatch.reason,
          similarityScore,
          confidence: imageMetadata.confidence
        };
      }
    }

    // All checks passed
    return {
      accepted: true,
      reason: 'Candidate passed similarity, confidence and subject compatibility checks',
      similarityScore,
      confidence: imageMetadata.confidence
    };
  }

  /**
   * Check if the image subject is compatible with the post subject
   * This handles cases like: fox vs wolf (similar but different subjects)
   */
  private checkSubjectCompatibility(postSubject: string, imageSubject: string): 
    { compatible: boolean; reason: string } {
    
    const normalizedPost = postSubject.toLowerCase().trim();
    const normalizedImage = imageSubject.toLowerCase().trim();

    // Exact match
    if (normalizedPost === normalizedImage) {
      return { compatible: true, reason: '' };
    }

    // Check for known mismatches
    const mismatches = [
      { a: 'fox', b: 'wolf' },
      { a: 'wolf', b: 'fox' },
      { a: 'fox', b: 'dog' },
      { a: 'wolf', b: 'dog' },
      { a: 'dog', b: 'fox' },
      { a: 'dog', b: 'wolf' }
    ];

    for (const mismatch of mismatches) {
      if (normalizedPost.includes(mismatch.a) && normalizedImage.includes(mismatch.b)) {
        return {
          compatible: false,
          reason: `Subject mismatch: expected ${mismatch.a}, detected ${mismatch.b}`
        };
      }
    }

    // Check for partial matches (e.g., "red fox" vs "fox")
    if (normalizedPost.includes(normalizedImage) || normalizedImage.includes(normalizedPost)) {
      return { compatible: true, reason: '' };
    }

    // Default: allow if no specific mismatch found
    // This is conservative - we might want to be stricter
    return { compatible: true, reason: '' };
  }

  /**
   * Check if the image category is compatible with the post category
   */
  private checkCategoryCompatibility(postCategory: string, imageCategory: string):
    { compatible: boolean; reason: string } {
    
    const normalizedPost = postCategory.toLowerCase().trim();
    const normalizedImage = imageCategory.toLowerCase().trim();

    // Exact match
    if (normalizedPost === normalizedImage) {
      return { compatible: true, reason: '' };
    }

    // Some categories might be compatible (e.g., "animal" vs "wildlife")
    const compatibleCategories = [
      ['animal', 'wildlife'],
      ['wildlife', 'animal'],
      ['nature', 'landscape'],
      ['landscape', 'nature']
    ];

    for (const pair of compatibleCategories) {
      if (normalizedPost === pair[0] && normalizedImage === pair[1]) {
        return { compatible: true, reason: '' };
      }
    }

    // Default: reject if categories don't match
    return {
      compatible: false,
      reason: `Category mismatch: expected ${postCategory}, detected ${imageCategory}`
    };
  }

  /**
   * Determine if no confident match should be returned
   * This is used when all candidates fail the guard
   */
  noConfidentMatch(reasons: string[]): { matched: false; message: string; reasons: string[] } {
    return {
      matched: false,
      message: 'No confident match',
      reasons
    };
  }
}
