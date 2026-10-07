import { describe, it, expect } from 'vitest';
import { VisionResponseSchema, CreateImageSchema, CreatePostSchema, ReviewActionSchema } from './visionSchema';

describe('VisionResponseSchema', () => {
  it('should validate a correct vision response', () => {
    const validResponse = {
      subject: 'red fox',
      category: 'animal',
      attributes: ['orange fur', 'wild', 'forest'],
      caption: 'A red fox in the forest',
      confidence: 0.94
    };

    const result = VisionResponseSchema.safeParse(validResponse);
    expect(result.success).toBe(true);
  });

  it('should reject response with missing subject', () => {
    const invalidResponse = {
      category: 'animal',
      attributes: ['orange fur'],
      caption: 'A fox',
      confidence: 0.9
    };

    const result = VisionResponseSchema.safeParse(invalidResponse);
    expect(result.success).toBe(false);
  });

  it('should reject response with confidence > 1', () => {
    const invalidResponse = {
      subject: 'fox',
      category: 'animal',
      attributes: ['fur'],
      caption: 'A fox',
      confidence: 1.5
    };

    const result = VisionResponseSchema.safeParse(invalidResponse);
    expect(result.success).toBe(false);
  });

  it('should reject response with confidence < 0', () => {
    const invalidResponse = {
      subject: 'fox',
      category: 'animal',
      attributes: ['fur'],
      caption: 'A fox',
      confidence: -0.1
    };

    const result = VisionResponseSchema.safeParse(invalidResponse);
    expect(result.success).toBe(false);
  });

  it('should reject response with empty attributes array', () => {
    const invalidResponse = {
      subject: 'fox',
      category: 'animal',
      attributes: [],
      caption: 'A fox',
      confidence: 0.9
    };

    const result = VisionResponseSchema.safeParse(invalidResponse);
    expect(result.success).toBe(false);
  });
});

describe('CreateImageSchema', () => {
  it('should validate a correct image creation request', () => {
    const validInput = {
      filename: 'fox.jpg',
      source_url: 'https://example.com/fox.jpg'
    };

    const result = CreateImageSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('should reject request with missing filename', () => {
    const invalidInput = {
      source_url: 'https://example.com/fox.jpg'
    };

    const result = CreateImageSchema.safeParse(invalidInput);
    expect(result.success).toBe(false);
  });

  it('should reject request with invalid URL', () => {
    const invalidInput = {
      filename: 'fox.jpg',
      source_url: 'not-a-url'
    };

    const result = CreateImageSchema.safeParse(invalidInput);
    expect(result.success).toBe(false);
  });
});

describe('CreatePostSchema', () => {
  it('should validate a correct post creation request', () => {
    const validInput = {
      title: 'About Foxes',
      content: 'Foxes are interesting animals.'
    };

    const result = CreatePostSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('should reject request with missing title', () => {
    const invalidInput = {
      content: 'Some content'
    };

    const result = CreatePostSchema.safeParse(invalidInput);
    expect(result.success).toBe(false);
  });

  it('should reject request with title too long', () => {
    const invalidInput = {
      title: 'a'.repeat(501),
      content: 'Content'
    };

    const result = CreatePostSchema.safeParse(invalidInput);
    expect(result.success).toBe(false);
  });
});

describe('ReviewActionSchema', () => {
  it('should validate an approve action', () => {
    const validInput = {
      review_status: 'approved' as const,
      reviewer: 'admin',
      reason: 'Correct match'
    };

    const result = ReviewActionSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('should validate a reject action', () => {
    const validInput = {
      review_status: 'rejected' as const,
      reviewer: 'admin',
      reason: 'Wrong subject'
    };

    const result = ReviewActionSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('should reject invalid review status', () => {
    const invalidInput = {
      review_status: 'invalid_status',
      reviewer: 'admin'
    };

    const result = ReviewActionSchema.safeParse(invalidInput);
    expect(result.success).toBe(false);
  });
});
