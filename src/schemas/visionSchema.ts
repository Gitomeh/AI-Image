import { z } from 'zod';

// Schema for validating AI vision output
export const VisionResponseSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  category: z.string().min(1, "Category is required"),
  attributes: z.array(z.string()).min(1, "At least one attribute is required"),
  caption: z.string().min(1, "Caption is required"),
  confidence: z.number().min(0).max(1, "Confidence must be between 0 and 1")
});

export type VisionResponse = z.infer<typeof VisionResponseSchema>;

// Schema for validating image creation request
export const CreateImageSchema = z.object({
  filename: z.string().min(1, "Filename is required").max(255),
  source_url: z.string().url().optional(),
  storage_reference: z.string().optional()
});

export type CreateImageInput = z.infer<typeof CreateImageSchema>;

// Schema for validating post creation request
export const CreatePostSchema = z.object({
  title: z.string().min(1, "Title is required").max(500),
  content: z.string().min(1, "Content is required")
});

export type CreatePostInput = z.infer<typeof CreatePostSchema>;

// Schema for review approval/rejection
export const ReviewActionSchema = z.object({
  review_status: z.enum(['approved', 'rejected']),
  reviewer: z.string().optional(),
  reason: z.string().optional()
});

export type ReviewActionInput = z.infer<typeof ReviewActionSchema>;
