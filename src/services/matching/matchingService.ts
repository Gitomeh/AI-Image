import { ImageEmbeddingRepository } from '../../repositories';
import { ImageMetadataRepository } from '../../repositories';
import { ImageRepository } from '../../repositories';
import { EmbeddingService } from '../embeddings/embeddingService';
import { MismatchGuardService, GuardInput } from '../mismatchGuard/mismatchGuardService';
import { ImageEmbedding } from '../../models/ImageEmbedding';
import { ImageMetadata } from '../../models/ImageMetadata';
import { Image } from '../../models/Image';
import { config } from '../../config/env';

export interface RankedCandidate {
  imageId: string;
  rank: number;
  similarityScore: number;
  confidence: number;
  subject: string;
  category: string;
  guardDecision: 'accepted' | 'rejected' | 'no_confident_match';
  rejectionReason?: string;
}

export interface MatchingResult {
  matched: boolean;
  candidates: RankedCandidate[];
  topMatch?: RankedCandidate;
  noMatchReason?: string;
}

export class MatchingService {
  private imageEmbeddingRepo: ImageEmbeddingRepository;
  private imageMetadataRepo: ImageMetadataRepository;
  private imageRepo: ImageRepository;
  private embeddingService: EmbeddingService;
  private mismatchGuard: MismatchGuardService;

  constructor() {
    this.imageEmbeddingRepo = new ImageEmbeddingRepository();
    this.imageMetadataRepo = new ImageMetadataRepository();
    this.imageRepo = new ImageRepository();
    this.embeddingService = new EmbeddingService();
    this.mismatchGuard = new MismatchGuardService();
  }

  /**
   * Find the best matching images for a post
   */
  async findMatchesForPost(
    postEmbedding: number[],
    postSubject?: string,
    postCategory?: string
  ): Promise<MatchingResult> {
    // Get all image embeddings
    const imageEmbeddings = await this.imageEmbeddingRepo.findAll();

    if (imageEmbeddings.length === 0) {
      return {
        matched: false,
        candidates: [],
        noMatchReason: 'No image embeddings found in database'
      };
    }

    // Calculate similarity scores for all images
    const candidates: Array<{
      imageEmbedding: ImageEmbedding;
      similarityScore: number;
    }> = imageEmbeddings.map(ie => ({
      imageEmbedding: ie,
      similarityScore: this.embeddingService.cosineSimilarity(
        postEmbedding,
        ie.embedding
      )
    }));

    // Sort by similarity score (descending)
    candidates.sort((a, b) => b.similarityScore - a.similarityScore);

    // Apply mismatch guard to each candidate
    const rankedCandidates: RankedCandidate[] = [];
    const rejectionReasons: string[] = [];

    for (let i = 0; i < candidates.length; i++) {
      const { imageEmbedding, similarityScore } = candidates[i];

      // Get image metadata
      const metadata = await this.imageMetadataRepo.findByImageId(imageEmbedding.image_id);
      if (!metadata) {
        rejectionReasons.push(`Image ${imageEmbedding.image_id} has no metadata`);
        continue;
      }

      // Evaluate with mismatch guard
      const guardResult = await this.mismatchGuard.evaluate({
        postSubject,
        postCategory,
        imageMetadata: metadata,
        similarityScore
      });

      const rankedCandidate: RankedCandidate = {
        imageId: imageEmbedding.image_id,
        rank: i + 1,
        similarityScore,
        confidence: metadata.confidence,
        subject: metadata.subject,
        category: metadata.category,
        guardDecision: guardResult.accepted ? 'accepted' : 'rejected',
        rejectionReason: guardResult.accepted ? undefined : guardResult.reason
      };

      rankedCandidates.push(rankedCandidate);

      if (!guardResult.accepted) {
        rejectionReasons.push(guardResult.reason);
      }
    }

    // Find the first accepted candidate
    const topAccepted = rankedCandidates.find(c => c.guardDecision === 'accepted');

    if (!topAccepted) {
      return {
        matched: false,
        candidates: rankedCandidates,
        noMatchReason: rejectionReasons.length > 0 
          ? rejectionReasons.join('; ')
          : 'No candidates passed the mismatch guard'
      };
    }

    return {
      matched: true,
      candidates: rankedCandidates,
      topMatch: topAccepted
    };
  }

  /**
   * Get ranked candidates for a post (with limit)
   */
  async getRankedCandidatesForPost(
    postEmbedding: number[],
    limit: number = 10,
    postSubject?: string,
    postCategory?: string
  ): Promise<RankedCandidate[]> {
    const result = await this.findMatchesForPost(postEmbedding, postSubject, postCategory);
    return result.candidates.slice(0, limit);
  }

  /**
   * Get only accepted candidates for a post
   */
  async getAcceptedCandidatesForPost(
    postEmbedding: number[],
    postSubject?: string,
    postCategory?: string
  ): Promise<RankedCandidate[]> {
    const result = await this.findMatchesForPost(postEmbedding, postSubject, postCategory);
    return result.candidates.filter(c => c.guardDecision === 'accepted');
  }
}
