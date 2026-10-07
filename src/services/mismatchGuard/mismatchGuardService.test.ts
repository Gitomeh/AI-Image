import { describe, it, expect, beforeEach } from 'vitest';
import { MismatchGuardService } from './mismatchGuardService';
import { ImageMetadata, ValidationStatus } from '../../models';

describe('MismatchGuardService', () => {
  let guardService: MismatchGuardService;

  beforeEach(() => {
    guardService = new MismatchGuardService();
  });

  describe('evaluate', () => {
    it('should accept fox image for fox article', async () => {
      const input = {
        postSubject: 'red fox',
        postCategory: 'animal',
        imageMetadata: {
          id: '1',
          image_id: 'img1',
          subject: 'red fox',
          category: 'animal',
          attributes: ['orange fur', 'wild'],
          caption: 'A red fox',
          confidence: 0.94,
          validation_status: 'valid' as const,
          created_at: new Date(),
          updated_at: new Date()
        },
        similarityScore: 0.93
      };

      const result = await guardService.evaluate(input);
      expect(result.accepted).toBe(true);
      expect(result.reason).toContain('passed');
    });

    it('should reject wolf image for fox article', async () => {
      const input = {
        postSubject: 'red fox',
        postCategory: 'animal',
        imageMetadata: {
          id: '1',
          image_id: 'img1',
          subject: 'gray wolf',
          category: 'animal',
          attributes: ['gray fur', 'wild'],
          caption: 'A gray wolf',
          confidence: 0.95,
          validation_status: 'valid' as const,
          created_at: new Date(),
          updated_at: new Date()
        },
        similarityScore: 0.82
      };

      const result = await guardService.evaluate(input);
      expect(result.accepted).toBe(false);
      expect(result.reason).toContain('Subject mismatch');
    });

    it('should reject dog image for fox article', async () => {
      const input = {
        postSubject: 'red fox',
        postCategory: 'animal',
        imageMetadata: {
          id: '1',
          image_id: 'img1',
          subject: 'golden retriever',
          category: 'animal',
          attributes: ['golden fur', 'domestic'],
          caption: 'A golden retriever',
          confidence: 0.96,
          validation_status: 'valid' as const,
          created_at: new Date(),
          updated_at: new Date()
        },
        similarityScore: 0.7
      };

      const result = await guardService.evaluate(input);
      expect(result.accepted).toBe(false);
    });

    it('should reject low similarity score', async () => {
      const input = {
        postSubject: 'red fox',
        postCategory: 'animal',
        imageMetadata: {
          id: '1',
          image_id: 'img1',
          subject: 'red fox',
          category: 'animal',
          attributes: ['orange fur'],
          caption: 'A red fox',
          confidence: 0.94,
          validation_status: 'valid' as const,
          created_at: new Date(),
          updated_at: new Date()
        },
        similarityScore: 0.5
      };

      const result = await guardService.evaluate(input);
      expect(result.accepted).toBe(false);
      expect(result.reason).toContain('below threshold');
    });

    it('should reject low confidence', async () => {
      const input = {
        postSubject: 'red fox',
        postCategory: 'animal',
        imageMetadata: {
          id: '1',
          image_id: 'img1',
          subject: 'red fox',
          category: 'animal',
          attributes: ['orange fur'],
          caption: 'A red fox',
          confidence: 0.5,
          validation_status: 'valid' as const,
          created_at: new Date(),
          updated_at: new Date()
        },
        similarityScore: 0.9
      };

      const result = await guardService.evaluate(input);
      expect(result.accepted).toBe(false);
      expect(result.reason).toContain('confidence');
    });

    it('should reject invalid validation status', async () => {
      const input = {
        postSubject: 'red fox',
        postCategory: 'animal',
        imageMetadata: {
          id: '1',
          image_id: 'img1',
          subject: 'red fox',
          category: 'animal',
          attributes: ['orange fur'],
          caption: 'A red fox',
          confidence: 0.94,
          validation_status: 'invalid' as const,
          created_at: new Date(),
          updated_at: new Date()
        },
        similarityScore: 0.9
      };

      const result = await guardService.evaluate(input);
      expect(result.accepted).toBe(false);
      expect(result.reason).toContain('invalid');
    });

    it('should reject low confidence validation status', async () => {
      const input = {
        postSubject: 'red fox',
        postCategory: 'animal',
        imageMetadata: {
          id: '1',
          image_id: 'img1',
          subject: 'red fox',
          category: 'animal',
          attributes: ['orange fur'],
          caption: 'A red fox',
          confidence: 0.94,
          validation_status: 'low_confidence' as const,
          created_at: new Date(),
          updated_at: new Date()
        },
        similarityScore: 0.9
      };

      const result = await guardService.evaluate(input);
      expect(result.accepted).toBe(false);
      expect(result.reason).toContain('low confidence');
    });

    it('should reject category mismatch', async () => {
      const input = {
        postSubject: 'red fox',
        postCategory: 'animal',
        imageMetadata: {
          id: '1',
          image_id: 'img1',
          subject: 'red fox',
          category: 'landscape',
          attributes: ['orange fur'],
          caption: 'A red fox',
          confidence: 0.94,
          validation_status: 'valid' as const,
          created_at: new Date(),
          updated_at: new Date()
        },
        similarityScore: 0.9
      };

      const result = await guardService.evaluate(input);
      expect(result.accepted).toBe(false);
      expect(result.reason).toContain('Category mismatch');
    });
  });

  describe('noConfidentMatch', () => {
    it('should return no confident match structure', () => {
      const reasons = ['Low similarity', 'Subject mismatch'];
      const result = guardService.noConfidentMatch(reasons);

      expect(result.matched).toBe(false);
      expect(result.message).toBe('No confident match');
      expect(result.reasons).toEqual(reasons);
    });
  });
});
