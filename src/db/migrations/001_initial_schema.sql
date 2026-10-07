-- FlyRank Capstone: AI Image Understanding & Content Matching Engine
-- Initial Database Schema Migration

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Images table
CREATE TABLE images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    filename VARCHAR(255) NOT NULL,
    source_url TEXT,
    storage_reference TEXT,
    processing_status VARCHAR(50) NOT NULL DEFAULT 'pending'
        CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed', 'needs_review')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_images_processing_status ON images(processing_status);
CREATE INDEX idx_images_created_at ON images(created_at);

-- Image Metadata table
CREATE TABLE image_metadata (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    image_id UUID NOT NULL REFERENCES images(id) ON DELETE CASCADE,
    subject VARCHAR(255) NOT NULL,
    category VARCHAR(255) NOT NULL,
    attributes JSONB,
    caption TEXT NOT NULL,
    confidence DECIMAL(5,4) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    raw_ai_response JSONB,
    validation_status VARCHAR(50) NOT NULL DEFAULT 'pending'
        CHECK (validation_status IN ('pending', 'valid', 'invalid', 'low_confidence')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(image_id)
);

CREATE INDEX idx_image_metadata_image_id ON image_metadata(image_id);
CREATE INDEX idx_image_metadata_category ON image_metadata(category);
CREATE INDEX idx_image_metadata_subject ON image_metadata(subject);
CREATE INDEX idx_image_metadata_validation_status ON image_metadata(validation_status);

-- Tags table
CREATE TABLE tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    image_id UUID NOT NULL REFERENCES images(id) ON DELETE CASCADE,
    tag VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tags_image_id ON tags(image_id);
CREATE INDEX idx_tags_tag ON tags(tag);

-- Image Embeddings table
CREATE TABLE image_embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    image_id UUID NOT NULL REFERENCES images(id) ON DELETE CASCADE,
    embedding JSONB NOT NULL,
    embedding_model VARCHAR(255) NOT NULL,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(image_id, embedding_model)
);

CREATE INDEX idx_image_embeddings_image_id ON image_embeddings(image_id);
CREATE INDEX idx_image_embeddings_model ON image_embeddings(embedding_model);

-- Posts table
CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_posts_created_at ON posts(created_at);

-- Post Embeddings table
CREATE TABLE post_embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    embedding JSONB NOT NULL,
    embedding_model VARCHAR(255) NOT NULL,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(post_id, embedding_model)
);

CREATE INDEX idx_post_embeddings_post_id ON post_embeddings(post_id);
CREATE INDEX idx_post_embeddings_model ON post_embeddings(embedding_model);

-- Image Suggestions table
CREATE TABLE image_suggestions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    image_id UUID NOT NULL REFERENCES images(id) ON DELETE CASCADE,
    similarity_score DECIMAL(5,4) NOT NULL CHECK (similarity_score >= 0 AND similarity_score <= 1),
    confidence DECIMAL(5,4) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    guard_decision VARCHAR(50) NOT NULL
        CHECK (guard_decision IN ('accepted', 'rejected', 'no_confident_match')),
    rejection_reason TEXT,
    rank INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(post_id, image_id)
);

CREATE INDEX idx_image_suggestions_post_id ON image_suggestions(post_id);
CREATE INDEX idx_image_suggestions_image_id ON image_suggestions(image_id);
CREATE INDEX idx_image_suggestions_guard_decision ON image_suggestions(guard_decision);
CREATE INDEX idx_image_suggestions_rank ON image_suggestions(post_id, rank);

-- Reviews table
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    suggestion_id UUID NOT NULL REFERENCES image_suggestions(id) ON DELETE CASCADE,
    review_status VARCHAR(50) NOT NULL DEFAULT 'pending'
        CHECK (review_status IN ('pending', 'approved', 'rejected')),
    reviewer VARCHAR(255),
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(suggestion_id)
);

CREATE INDEX idx_reviews_suggestion_id ON reviews(suggestion_id);
CREATE INDEX idx_reviews_review_status ON reviews(review_status);

-- Processing Jobs table
CREATE TABLE processing_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_type VARCHAR(100) NOT NULL
        CHECK (job_type IN ('image_processing', 'image_embedding', 'post_embedding', 'batch_processing')),
    target_entity_type VARCHAR(50) NOT NULL,
    target_entity_id UUID NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'running', 'completed', 'failed', 'retrying')),
    attempts INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_processing_jobs_status ON processing_jobs(status);
CREATE INDEX idx_processing_jobs_target ON processing_jobs(target_entity_type, target_entity_id);
CREATE INDEX idx_processing_jobs_created_at ON processing_jobs(created_at);

-- AI Usage / Cost Logs table
CREATE TABLE ai_usage_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    operation VARCHAR(100) NOT NULL,
    model VARCHAR(255) NOT NULL,
    target_entity_type VARCHAR(50),
    target_entity_id UUID,
    request_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    input_tokens INTEGER,
    output_tokens INTEGER,
    estimated_cost DECIMAL(10,6),
    success BOOLEAN NOT NULL,
    error_message TEXT
);

CREATE INDEX idx_ai_usage_logs_operation ON ai_usage_logs(operation);
CREATE INDEX idx_ai_usage_logs_model ON ai_usage_logs(model);
CREATE INDEX idx_ai_usage_logs_target ON ai_usage_logs(target_entity_type, target_entity_id);
CREATE INDEX idx_ai_usage_logs_timestamp ON ai_usage_logs(request_timestamp);

-- Evaluation Items table
CREATE TABLE evaluation_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    expected_image_id UUID NOT NULL REFERENCES images(id) ON DELETE CASCADE,
    notes TEXT,
    evaluation_result VARCHAR(50)
        CHECK (evaluation_result IN ('correct', 'incorrect', 'no_match')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(post_id)
);

CREATE INDEX idx_evaluation_items_post_id ON evaluation_items(post_id);
CREATE INDEX idx_evaluation_items_expected_image_id ON evaluation_items(expected_image_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_images_updated_at BEFORE UPDATE ON images
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_image_metadata_updated_at BEFORE UPDATE ON image_metadata
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
