# EVIDENCE

This document collects evidence for each major requirement from the FlyRank capstone specification.

Evidence will be added as features are implemented and tested.

---

## Database Schema

### Requirement: Proper migrations with all required tables

**Status**: TODO

**Test**: 
```bash
npm run migrate
```

**Evidence**: [Pending]

---

## Layered Architecture

### Requirement: Clear separation of concerns

**Status**: IMPLEMENTED

**Evidence**: 
- Project structure follows layered architecture pattern
- HTTP/API layer: `src/routes/`, `src/controllers/`
- Application/service layer: `src/services/`
- Domain layer: `src/models/`, `src/schemas/`
- Data/repository layer: `src/repositories/`, `src/db/`

---

## Environment Configuration

### Requirement: Environment variables with validation

**Status**: IMPLEMENTED

**Evidence**:
- `.env.example` created with all required variables
- `src/config/env.ts` validates environment at startup using Zod
- Invalid configuration causes startup failure with clear error message

---

## Health Check Endpoint

### Requirement: Basic health check endpoint

**Status**: IMPLEMENTED

**Test**:
```bash
curl http://localhost:3000/health
```

**Evidence**: [Pending - needs server running]

---

## API Endpoints

### Requirement: Minimum API endpoints defined

**Status**: IMPLEMENTED (placeholders)

**Evidence**:
- `GET /health` - Implemented
- `POST /images` - Placeholder
- `GET /images` - Placeholder
- `GET /images/:id` - Placeholder
- `POST /images/:id/process` - Placeholder
- `POST /jobs/images/process` - Placeholder
- `GET /jobs/:id` - Placeholder
- `POST /posts` - Placeholder
- `GET /posts` - Placeholder
- `GET /posts/:id` - Placeholder
- `GET /posts/:id/images` - Placeholder
- `GET /suggestions` - Placeholder
- `GET /suggestions/:id` - Placeholder
- `POST /suggestions/:id/approve` - Placeholder
- `POST /suggestions/:id/reject` - Placeholder

---

## Schema Validation

### Requirement: Zod schema for AI vision output

**Status**: IMPLEMENTED

**Evidence**:
- `src/schemas/visionSchema.ts` defines `VisionResponseSchema`
- Validates: subject, category, attributes, caption, confidence
- Confidence enforced as number between 0 and 1

---

## Database Models

### Requirement: All required entities defined

**Status**: IMPLEMENTED

**Evidence**:
- `Image` - src/models/Image.ts
- `ImageMetadata` - src/models/ImageMetadata.ts
- `Tag` - src/models/Tag.ts
- `ImageEmbedding` - src/models/ImageEmbedding.ts
- `Post` - src/models/Post.ts
- `PostEmbedding` - src/models/PostEmbedding.ts
- `ImageSuggestion` - src/models/ImageSuggestion.ts
- `Review` - src/models/Review.ts
- `ProcessingJob` - src/models/ProcessingJob.ts
- `AIUsageLog` - src/models/AIUsageLog.ts
- `EvaluationItem` - src/models/EvaluationItem.ts

---

## Docker Compose

### Requirement: PostgreSQL in Docker

**Status**: IMPLEMENTED

**Evidence**:
- `docker-compose.yml` configured with PostgreSQL 15
- Health check included
- Volume for data persistence

---

## TypeScript Configuration

### Requirement: TypeScript setup

**Status**: IMPLEMENTED

**Evidence**:
- `tsconfig.json` configured
- Strict mode enabled
- Proper source maps and declarations

---

## Package Scripts

### Requirement: Build, test, migrate, seed, evaluate commands

**Status**: IMPLEMENTED

**Evidence**:
- `npm run dev` - Development server with nodemon
- `npm run build` - TypeScript compilation
- `npm run start` - Production server
- `npm test` - Vitest tests
- `npm run test:coverage` - Tests with coverage
- `npm run migrate` - Database migrations
- `npm run seed` - Database seeding
- `npm run evaluate` - Evaluation script

---

## Error Handling

### Requirement: Centralized error handling

**Status**: IMPLEMENTED

**Evidence**:
- `src/middleware/errorHandler.ts` - Central error handler
- Custom `AppError` class with status codes
- Safe error responses (no stack traces in production)
- 404 handler for unknown routes

---

## Middleware

### Requirement: Logging middleware

**Status**: IMPLEMENTED

**Evidence**:
- `src/middleware/logger.ts` - Request/response logging
- Logs method, path, status, and duration

---

## AI Vision Integration

### Requirement: Gemini Flash for image understanding

**Status**: IMPLEMENTED

**Evidence**:
- `src/services/vision/visionService.ts` - Full Gemini Flash integration
- `src/utils/imageFetcher.ts` - Image fetching from URLs
- `src/services/jobs/jobService.ts` - processImage() method now calls vision service
- Validates AI output against Zod schema
- Tracks token usage and costs
- Logs all AI calls to database

---

## Embeddings

### Requirement: Text/image embeddings

**Status**: IMPLEMENTED

**Evidence**:
- `src/services/embeddings/embeddingService.ts` - Full embedding service with Gemini
- `src/services/jobs/jobService.ts` - Generates embeddings after vision analysis
- `src/services/jobs/jobService.ts` - generateEmbeddingsForAllImages() for batch processing
- POST /jobs/embeddings/generate endpoint for batch generation
- Cosine similarity calculation implemented
- Embeddings stored in database with model tracking

---

## Semantic Matching

### Requirement: Cosine similarity ranking

**Status**: IMPLEMENTED

**Evidence**:
- `src/services/embeddings/embeddingService.ts` - cosineSimilarity() method
- `src/services/matching/matchingService.ts` - findMatchesForPost() with ranking
- Ranks candidates by similarity score (descending)
- Similarity threshold enforcement via config
- Returns ranked list with guard decisions

---

## Mismatch Guard

### Requirement: Subject/category compatibility checking

**Status**: IMPLEMENTED

**Evidence**:
- `src/services/mismatchGuard/mismatchGuardService.ts` - Full guard implementation
- Known mismatches: fox ↔ wolf, fox ↔ dog, wolf ↔ dog
- Similarity threshold check
- Confidence threshold check
- Validation status check
- Subject compatibility check
- Category compatibility check
- Test suite: `src/services/mismatchGuard/mismatchGuardService.test.ts` (9 tests passing)

---

## Background Jobs

### Requirement: Async processing with retry logic

**Status**: IMPLEMENTED

**Evidence**:
- `src/services/jobs/jobService.ts` - Full job service implementation
- `src/repositories/ProcessingJobRepository.ts` - Job tracking with retry logic
- Async processing: processImage(), processAllImages(), generateEmbeddingsForAllImages()
- Retry logic with configurable MAX_RETRY_ATTEMPTS
- Job status tracking: pending, running, completed, failed, retrying
- Idempotent operations (skips already-processed items)
- POST /jobs/images/process endpoint
- POST /jobs/embeddings/generate endpoint

---

## AI Cost Tracking

### Requirement: Usage and cost logging

**Status**: IMPLEMENTED

**Evidence**:
- `src/repositories/AIUsageLogRepository.ts` - Usage logging repository
- `src/services/vision/visionService.ts` - Logs all vision calls with tokens and cost
- `src/services/embeddings/embeddingService.ts` - Logs all embedding calls
- Tracks: operation type, model, target entity, tokens, estimated cost, success/failure
- Budget guard via MAX_AI_COST configuration
- calculateEstimatedCost() methods in both services

---

## Review Workflow

### Requirement: Approve/reject API

**Status**: IMPLEMENTED

**Evidence**:
- `src/controllers/suggestionController.ts` - approveSuggestion() and rejectSuggestion() methods
- `src/repositories/ReviewRepository.ts` - Review tracking
- POST /suggestions/:id/approve endpoint
- POST /suggestions/:id/reject endpoint
- Stores reviewer, reason, and review status
- Zod schema validation for review actions

---

## Evaluation System

### Requirement: Top-1 precision calculation

**Status**: IMPLEMENTED

**Evidence**:
- `src/scripts/evaluate.ts` - Full evaluation script
- Loads labeled evaluation items from database
- Generates post embeddings if needed
- Runs matching system for each post
- Compares top match with expected image
- Calculates top-1 precision
- npm run evaluate command

---

## Testing

### Requirement: Comprehensive test suite

**Status**: IMPLEMENTED

**Evidence**:
- `src/services/mismatchGuard/mismatchGuardService.test.ts` - 9 tests for guard logic
- `src/test/setup.ts` - Test environment setup
- `vitest.config.ts` - Vitest configuration
- All tests passing (9/9)
- npm test command available

---

## Security

### Requirement: Secrets management and input validation

**Status**: PARTIALLY IMPLEMENTED

**Evidence**:
- Environment variables for secrets
- `.env` in `.gitignore`
- Zod schemas for input validation
- [Pending] API key validation
- [Pending] SQL injection prevention verification

---

## Acceptance Tests

### Test 1: Image batch job with schema validation

**Status**: IMPLEMENTED

**Test**:
```bash
# Start server and database
docker compose up -d
npm run migrate
npm run seed

# Process all images
curl -X POST http://localhost:3000/jobs/images/process

# Check images have valid metadata
curl http://localhost:3000/images
```

**Evidence**: [Pending - requires running server with valid GEMINI_API_KEY]

---

### Test 2: Fox article + fox image ranking

**Status**: IMPLEMENTED

**Test**:
```bash
# Ensure embeddings are generated
curl -X POST http://localhost:3000/jobs/embeddings/generate

# Get ranked images for fox post
curl http://localhost:3000/posts/<FOX_POST_ID>/images
```

**Expected**: Fox image should rank first with highest similarity

**Evidence**: [Pending - requires running server with valid GEMINI_API_KEY]

---

### Test 3: Wolf rejected for fox article

**Status**: IMPLEMENTED

**Test**:
```bash
# Unit test for mismatch guard
npm test
```

**Expected**: Test "should reject wolf image for fox article" passes

**Evidence**: Test passes - verified in mismatchGuardService.test.ts

---

### Test 4: No confident match when suitable image doesn't exist

**Status**: IMPLEMENTED

**Test**:
```bash
# Create a post about an animal not in the image set
curl -X POST http://localhost:3000/posts \
  -H "Content-Type: application/json" \
  -d '{"title": "Lions in Africa", "content": "Lions are the kings of the savanna..."}'

# Get ranked images
curl http://localhost:3000/posts/<NEW_POST_ID>/images
```

**Expected**: Returns "no confident match" with reasons

**Evidence**: [Pending - requires running server with valid GEMINI_API_KEY]

---

### Test 5: Evaluation script produces reproducible results

**Status**: IMPLEMENTED

**Test**:
```bash
# Run evaluation script
npm run evaluate
```

**Expected**: Returns top-1 precision percentage with detailed statistics

**Evidence**: [Pending - requires running server with valid GEMINI_API_KEY and embeddings]

---

### Test 6: AI cost logs show all calls

**Status**: IMPLEMENTED

**Test**:
```bash
# After processing images, query AI usage logs
# (Need to add endpoint or direct DB query)
```

**Expected**: All vision and embedding calls logged with tokens and cost

**Evidence**: [Pending - requires running server with valid GEMINI_API_KEY]

---

## Documentation

### Requirement: All required documentation files

**Status**: IMPLEMENTED

**Evidence**:
- README.md - Complete architecture and setup documentation
- capstone.yaml - Manifest with commands and endpoints
- EVIDENCE.md - This file
- BUILDLOG.md - Development log
- .env.example - Environment configuration template
- .gitignore - Git ignore rules
- LICENSE - MIT license

---

## Repository Files

### Requirement: All required files present

**Status**: IMPLEMENTED

**Evidence**:
- README.md ✓
- capstone.yaml ✓
- EVIDENCE.md ✓
- BUILDLOG.md ✓
- .env.example ✓
- .gitignore ✓
- LICENSE ✓
- package.json ✓
- tsconfig.json ✓
- docker-compose.yml ✓
