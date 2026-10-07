import { pool } from '../db/connection';
import { PostEmbedding, CreatePostEmbeddingInput } from '../models/PostEmbedding';

export class PostEmbeddingRepository {
  async create(input: CreatePostEmbeddingInput): Promise<PostEmbedding> {
    const query = `
      INSERT INTO post_embeddings (post_id, embedding, embedding_model)
      VALUES ($1, $2, $3)
      ON CONFLICT (post_id, embedding_model) 
      DO UPDATE SET embedding = $2, generated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;
    const values = [
      input.post_id,
      JSON.stringify(input.embedding),
      input.embedding_model
    ];
    
    const result = await pool.query(query, values);
    return this.mapRowToPostEmbedding(result.rows[0]);
  }

  async findByPostId(postId: string): Promise<PostEmbedding[]> {
    const query = 'SELECT * FROM post_embeddings WHERE post_id = $1';
    const result = await pool.query(query, [postId]);
    return result.rows.map(row => this.mapRowToPostEmbedding(row));
  }

  async findByPostIdAndModel(postId: string, model: string): Promise<PostEmbedding | null> {
    const query = `
      SELECT * FROM post_embeddings 
      WHERE post_id = $1 AND embedding_model = $2
    `;
    const result = await pool.query(query, [postId, model]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToPostEmbedding(result.rows[0]);
  }

  private mapRowToPostEmbedding(row: any): PostEmbedding {
    return {
      id: row.id,
      post_id: row.post_id,
      embedding: row.embedding || [],
      embedding_model: row.embedding_model,
      generated_at: row.generated_at
    };
  }
}
