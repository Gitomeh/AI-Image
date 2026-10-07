# FlyRank Capstone: AI Image Understanding & Content Matching Engine

## Project Overview

This backend AI system understands an image library, automatically organizes and tags images, and matches the correct image to blog posts based on semantic meaning rather than filenames or simple keyword matching.

### Central Behavior

- A blog post about red foxes should recommend a red-fox image
- A visually similar wolf image must be rejected when it is not actually a fox
- A generic dog image should rank poorly for a fox article
- If no image is sufficiently suitable, the system must explicitly return "no confident match"
- Every rejection should provide a human-readable explanation

## Problem

Simply choosing the most visually or semantically similar image is unsafe. A wolf may look similar to a fox in embeddings space, but it is not the correct subject for a fox article. The system must understand both semantic similarity AND subject/category compatibility.

## Solution

```
Image
  ↓
Vision AI (Gemini Flash)
  ↓
Structured Metadata (subject, category, attributes, caption, confidence)
  ↓
Schema Validation (Zod)
  ↓
Image Embedding
  ↓
Post Embedding
  ↓
Similarity Ranking (Cosine Similarity)
  ↓
Mismatch Guard (Safety Layer)
  ↓
┌───────────────────────┐
│                       │
▼                       ▼
GOOD MATCH          NO GOOD MATCH
│                       │
▼                       ▼
RECOMMEND          REJECT + EXPLAIN
│
▼
Human Review
```

## Architecture

### Layered Architecture

```
HTTP/API Layer (Express Routes)
       ↓
Application/Service Layer (Business Logic)
       ↓
Domain Layer (Models, Schemas)
       ↓
Data/Repository Layer (PostgreSQL)
```

### Directory Structure

```
src/
├── config/              # Environment configuration
├── controllers/          # Request handlers
├── routes/              # API route definitions
├── middleware/          # Express middleware (error handling, logging)
├── services/
│   ├── vision/          # AI image understanding
│   ├── embeddings/      # Text/image embeddings
│   ├── matching/        # Semantic matching logic
│   ├── mismatchGuard/   # Safety/rejection logic
│   ├── evaluation/      # Evaluation system
│   └── jobs/            # Background job processing
├── repositories/        # Database access layer
├── models/              # TypeScript interfaces
├── schemas/             # Zod validation schemas
├── jobs/                # Job definitions
├── utils/               # Utility functions
├── db/                  # Database connection and migrations
├── scripts/             # CLI scripts (evaluation, seeding)
├── app.ts               # Express application setup
└── server.ts            # Server entry point
```

## Technology Stack

- **Backend**: Node.js, TypeScript, Express.js
- **Database**: PostgreSQL with Docker Compose
- **AI**: Gemini Flash for vision and embeddings
- **Validation**: Zod for schema validation
- **Testing**: Vitest
- **Job Processing**: Custom background job system (simple, free-tier appropriate)

## Database Architecture

### Major Entities

1. **Images** - Stores image metadata and processing status
2. **Image Metadata** - Structured AI output (subject, category, attributes, caption, confidence)
3. **Tags** - Image tags for additional categorization
4. **Image Embeddings** - Vector representations of image descriptions
5. **Posts** - Blog post content
6. **Post Embeddings** - Vector representations of post content
7. **Image Suggestions** - Ranked image recommendations for posts
8. **Reviews** - Human review/approval workflow
9. **Processing Jobs** - Background job tracking with retry logic
10. **AI Usage Logs** - Cost tracking and usage monitoring
11. **Evaluation Items** - Labeled evaluation dataset

### Key Relationships

- Image → ImageMetadata (1:1)
- Image → Tags (1:N)
- Image → ImageEmbedding (1:N, per model)
- Post → PostEmbedding (1:N, per model)
- Post → ImageSuggestions (1:N)
- ImageSuggestion → Review (1:1)
- EvaluationItem → Post (N:1)
- EvaluationItem → Image (N:1)

## AI Pipeline

### Vision Processing

1. Image is registered in the system
2. Background job processes image through Gemini Flash vision model
3. AI output is validated against Zod schema
4. Valid metadata is stored with confidence score
5. Low-confidence results are flagged for review
6. Invalid/malformed AI responses are rejected and retried

### Embedding Generation

1. After valid metadata exists, image caption is embedded
2. Post content is embedded separately
3. Both embeddings use the same model for comparable semantic space
4. Embeddings are stored with model version for reproducibility

## Matching Engine

### Semantic Similarity

- Uses cosine similarity between post and image embeddings
- Ranks candidates by similarity score
- Applies configurable similarity threshold

### Mismatch Guard

The central safety mechanism that combines:
- Semantic similarity score
- AI confidence level
- Subject compatibility
- Category compatibility
- Configurable thresholds
- Explicit mismatch rules

**Example Rejection Logic:**
```
Post: "The behavior of red foxes"
Candidate: Gray wolf in forest
Guard Decision: REJECTED
Reason: Subject mismatch: expected fox, detected wolf
```

### Response Format

**Accepted:**
```json
{
  "accepted": true,
  "reason": "Candidate passed similarity, confidence and subject compatibility checks",
  "similarityScore": 0.93,
  "confidence": 0.96
}
```

**Rejected:**
```json
{
  "accepted": false,
  "reason": "Subject mismatch",
  "similarityScore": 0.82,
  "confidence": 0.95
}
```

**No Confident Match:**
```json
{
  "matched": false,
  "message": "No confident match",
  "reasons": [
    "Top candidates were below the similarity threshold",
    "Remaining candidates had incompatible subjects"
  ]
}
```

## Background Jobs

### Processing

- Images are processed asynchronously
- Progress is trackable via job status
- Failed jobs are recorded with error details
- Transient failures are automatically retried
- Maximum retry attempts are configurable

### Idempotency

- Duplicate work is avoided
- Already-processed images are not re-processed
- Completed embeddings are not regenerated unless requested
- Review actions cannot create contradictory records

## Evaluation System

### Labeled Dataset

- Contains posts with known correct image matches
- Minimum 10 evaluation examples
- Stored in database for reproducibility

### Top-1 Precision

Formula:
```
Top-1 precision = (number of correct first recommendations) / (total evaluation posts)
```

Example:
- Total posts: 10
- Correct first recommendations: 8
- Top-1 precision: 80%

## Setup Instructions

### Prerequisites

- Node.js (v18 or higher)
- Docker and Docker Compose
- Git

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd flyrank-capstone-image-relevance

# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env

# Edit .env and add your Gemini API key
# GEMINI_API_KEY=your_actual_api_key_here

# Start PostgreSQL
docker compose up -d

# Run database migrations
npm run migrate

# Seed the database with demo data
npm run seed

# Start the development server
npm run dev
```

The server will start on `http://localhost:3000`

## Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage
```

## Evaluation

```bash
# Run the evaluation script
npm run evaluate
```

This will produce a report showing:
- Total evaluation posts
- Correct top-1 matches
- Incorrect matches
- Top-1 precision percentage
- Mismatch guard statistics

## API Documentation

### Health Check

```bash
curl http://localhost:3000/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2026-10-03T10:00:00.000Z",
  "database": "connected",
  "db_time": "2026-10-03T10:00:00.000Z"
}
```

### Images

**Create Image**
```bash
curl -X POST http://localhost:3000/images \
  -H "Content-Type: application/json" \
  -d '{
    "filename": "fox-01.jpg",
    "source_url": "https://example.com/fox.jpg"
  }'
```

**Get All Images**
```bash
curl http://localhost:3000/images
```

**Get Image by ID**
```bash
curl http://localhost:3000/images/<IMAGE_ID>
```

**Process Image**
```bash
curl -X POST http://localhost:3000/images/<IMAGE_ID>/process
```

**Batch Process All Images**
```bash
curl -X POST http://localhost:3000/jobs/images/process
```

**Generate Embeddings for All Images**
```bash
curl -X POST http://localhost:3000/jobs/embeddings/generate
```

This endpoint is useful when you have existing metadata (e.g., from seeding) and want to generate embeddings without re-running vision analysis.

### Posts

**Create Post**
```bash
curl -X POST http://localhost:3000/posts \
  -H "Content-Type: application/json" \
  -d '{
    "title": "The Behavior of Red Foxes",
    "content": "Red foxes are fascinating creatures..."
  }'
```

**Get All Posts**
```bash
curl http://localhost:3000/posts
```

**Get Post by ID**
```bash
curl http://localhost:3000/posts/<POST_ID>
```

**Get Ranked Image Suggestions for Post**
```bash
curl http://localhost:3000/posts/<POST_ID>/images
```

Response:
```json
[
  {
    "imageId": "...",
    "rank": 1,
    "similarityScore": 0.91,
    "confidence": 0.94,
    "subject": "red fox",
    "category": "animal",
    "guardDecision": "accepted"
  }
]
```

### Suggestions

**Get All Suggestions**
```bash
curl http://localhost:3000/suggestions
```

**Get Suggestion by ID**
```bash
curl http://localhost:3000/suggestions/<SUGGESTION_ID>
```

**Approve Suggestion**
```bash
curl -X POST http://localhost:3000/suggestions/<SUGGESTION_ID>/approve \
  -H "Content-Type: application/json" \
  -d '{
    "reviewer": "admin",
    "reason": "Correct match"
  }'
```

**Reject Suggestion**
```bash
curl -X POST http://localhost:3000/suggestions/<SUGGESTION_ID>/reject \
  -H "Content-Type: application/json" \
  -d '{
    "reviewer": "admin",
    "reason": "Wrong subject"
  }'
```

### Jobs

**Get Job Status**
```bash
curl http://localhost:3000/jobs/<JOB_ID>
```

## Configuration

### Environment Variables

See `.env.example` for all available configuration options:

- `PORT` - Server port (default: 3000)
- `DATABASE_URL` - PostgreSQL connection string
- `GEMINI_API_KEY` - Gemini API key (required)
- `VISION_MODEL` - Vision model name (default: gemini-2.0-flash-vision)
- `EMBEDDING_MODEL` - Embedding model name (default: text-embedding-004)
- `SIMILARITY_THRESHOLD` - Minimum similarity for candidates (default: 0.75)
- `CONFIDENCE_THRESHOLD` - Minimum AI confidence (default: 0.80)
- `MAX_AI_COST` - Maximum allowed AI cost (default: 10.00)
- `MAX_RETRY_ATTEMPTS` - Maximum job retry attempts (default: 3)
- `JOB_TIMEOUT_MS` - Job timeout in milliseconds (default: 300000)

## Limitations

- Designed for small to medium datasets (40-50 images)
- Not optimized for large-scale production workloads
- Simple background job system (not a full queue system)
- Basic API authentication (if implemented)
- No complex frontend included

## Security

- API keys stored only in environment variables
- `.env` never committed to repository
- All user input validated at API boundaries
- Parameterized queries to prevent SQL injection
- No secrets logged or exposed in API responses
- Internal stack traces not exposed in production

## Important Mismatch Scenarios

The system includes automated tests for:

1. **Fox article + fox image** → ACCEPT
2. **Fox article + wolf image** → REJECT (subject mismatch)
3. **Fox article + generic dog image** → Low ranking or rejection
4. **Very low similarity** → REJECT
5. **Low AI confidence** → FLAG/REJECT
6. **No candidate passes** → NO CONFIDENT MATCH

## Cost Tracking

Every AI call is logged with:
- Operation type
- Model used
- Target entity
- Timestamp
- Token usage (input/output)
- Estimated cost
- Success/failure status
- Error details (if applicable)

Budget guard prevents excessive AI calls by enforcing `MAX_AI_COST`.

## License

MIT
