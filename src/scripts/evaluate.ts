import { pool } from '../db/connection';
import { EvaluationItemRepository } from '../repositories';
import { PostRepository } from '../repositories';
import { PostEmbeddingRepository } from '../repositories';
import { ImageEmbeddingRepository } from '../repositories';
import { ImageSuggestionRepository } from '../repositories';
import { EmbeddingService } from '../services/embeddings/embeddingService';
import { MatchingService } from '../services/matching/matchingService';
import { config } from '../config/env';

interface EvaluationResult {
  postId: string;
  expectedImageId: string;
  actualImageId?: string;
  correct: boolean;
  noMatch: boolean;
  reason?: string;
}

async function evaluate() {
  console.log('AI IMAGE MATCHING EVALUATION');
  console.log('============================');
  console.log('');

  try {
    const evaluationRepo = new EvaluationItemRepository();
    const postRepo = new PostRepository();
    const postEmbeddingRepo = new PostEmbeddingRepository();
    const imageEmbeddingRepo = new ImageEmbeddingRepository();
    const imageSuggestionRepo = new ImageSuggestionRepository();
    const embeddingService = new EmbeddingService();
    const matchingService = new MatchingService();

    // Clear previous evaluation results
    await evaluationRepo.clearResults();

    // Get all evaluation items
    const evaluationItems = await evaluationRepo.findAll();
    
    if (evaluationItems.length === 0) {
      console.log('No evaluation items found. Run seed script first.');
      return;
    }

    console.log(`Found ${evaluationItems.length} evaluation items`);
    console.log('');

    const results: EvaluationResult[] = [];
    let correctCount = 0;
    let incorrectCount = 0;
    let noMatchCount = 0;

    for (const item of evaluationItems) {
      console.log(`Evaluating post: ${item.post_id}`);
      
      // Get post
      const post = await postRepo.findById(item.post_id);
      if (!post) {
        console.log(`  ✗ Post not found`);
        results.push({
          postId: item.post_id,
          expectedImageId: item.expected_image_id,
          correct: false,
          noMatch: true,
          reason: 'Post not found'
        });
        noMatchCount++;
        continue;
      }

      // Get or generate post embedding
      let postEmbedding = await postEmbeddingRepo.findByPostIdAndModel(
        item.post_id,
        config.EMBEDDING_MODEL
      );

      if (!postEmbedding) {
        console.log(`  Generating post embedding...`);
        try {
          const embedding = await embeddingService.generatePostEmbedding(post.content);
          postEmbedding = await postEmbeddingRepo.create({
            post_id: item.post_id,
            embedding,
            embedding_model: config.EMBEDDING_MODEL
          });
        } catch (error) {
          console.log(`  ✗ Failed to generate embedding: ${error instanceof Error ? error.message : 'Unknown error'}`);
          results.push({
            postId: item.post_id,
            expectedImageId: item.expected_image_id,
            correct: false,
            noMatch: true,
            reason: 'Failed to generate embedding'
          });
          noMatchCount++;
          continue;
        }
      }

      // Check if image embeddings exist
      const imageEmbeddings = await imageEmbeddingRepo.findAll();
      if (imageEmbeddings.length === 0) {
        console.log(`  ✗ No image embeddings found. Run image processing first.`);
        results.push({
          postId: item.post_id,
          expectedImageId: item.expected_image_id,
          correct: false,
          noMatch: true,
          reason: 'No image embeddings found'
        });
        noMatchCount++;
        continue;
      }

      // Clear existing suggestions for this post
      await imageSuggestionRepo.deleteByPostId(item.post_id);

      // Run matching
      console.log(`  Running matching...`);
      const matchingResult = await matchingService.findMatchesForPost(
        postEmbedding.embedding
      );

      if (!matchingResult.matched || !matchingResult.topMatch) {
        console.log(`  ✗ No confident match`);
        console.log(`    Reason: ${matchingResult.noMatchReason}`);
        results.push({
          postId: item.post_id,
          expectedImageId: item.expected_image_id,
          correct: false,
          noMatch: true,
          reason: matchingResult.noMatchReason
        });
        noMatchCount++;
        
        await evaluationRepo.updateResult(item.id, 'no_match');
        continue;
      }

      const topMatch = matchingResult.topMatch;
      const actualImageId = topMatch.imageId;
      const isCorrect = actualImageId === item.expected_image_id;

      if (isCorrect) {
        console.log(`  ✓ Correct match: ${actualImageId}`);
        correctCount++;
        await evaluationRepo.updateResult(item.id, 'correct');
      } else {
        console.log(`  ✗ Incorrect match: expected ${item.expected_image_id}, got ${actualImageId}`);
        incorrectCount++;
        await evaluationRepo.updateResult(item.id, 'incorrect');
      }

      results.push({
        postId: item.post_id,
        expectedImageId: item.expected_image_id,
        actualImageId,
        correct: isCorrect,
        noMatch: false
      });

      console.log(`    Similarity: ${topMatch.similarityScore.toFixed(3)}`);
      console.log(`    Confidence: ${topMatch.confidence.toFixed(3)}`);
      console.log(`    Subject: ${topMatch.subject}`);
      console.log('');
    }

    // Calculate precision
    const total = evaluationItems.length;
    const precision = total > 0 ? (correctCount / total) * 100 : 0;

    console.log('============================');
    console.log('EVALUATION RESULTS');
    console.log('============================');
    console.log(`Total evaluation posts: ${total}`);
    console.log(`Correct top-1 matches: ${correctCount}`);
    console.log(`Incorrect matches: ${incorrectCount}`);
    console.log(`No confident matches: ${noMatchCount}`);
    console.log(`Top-1 precision: ${precision.toFixed(1)}%`);
    console.log('');

    // Mismatch guard statistics
    const allSuggestions = await imageSuggestionRepo.findAll();
    const accepted = allSuggestions.filter((s: any) => s.guard_decision === 'accepted').length;
    const rejected = allSuggestions.filter((s: any) => s.guard_decision === 'rejected').length;
    const noConfident = allSuggestions.filter((s: any) => s.guard_decision === 'no_confident_match').length;

    console.log('Mismatch Guard Statistics:');
    console.log(`  Accepted: ${accepted}`);
    console.log(`  Rejected: ${rejected}`);
    console.log(`  No Confident Match: ${noConfident}`);
    console.log('');

  } catch (error) {
    console.error('Evaluation failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

evaluate().catch(console.error);
