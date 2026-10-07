import { pool } from '../db/connection';
import { ImageEmbedding, CreateImageEmbeddingInput } from '../models/ImageEmbedding';

export class ImageEmbeddingRepository {
  async create(input: CreateImageEmbeddingInput): Promise<ImageEmbedding> {
    const query = `
      INSERT INTO image_embeddings (image_id, embedding, embedding_model)
      VALUES ($1, $2, $3)
      ON CONFLICT (image_id, embedding_model) 
      DO UPDATE SET embedding = $2, generated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;
    const values = [
      input.image_id,
      JSON.stringify(input.embedding),
      input.embedding_model
    ];
    
    const result = await pool.query(query, values);
    return this.mapRowToImageEmbedding(result.rows[0]);
  }

  async findByImageId(imageId: string): Promise<ImageEmbedding[]> {
    const query = 'SELECT * FROM image_embeddings WHERE image_id = $1';
    const result = await pool.query(query, [imageId]);
    return result.rows.map(row => this.mapRowToImageEmbedding(row));
  }

  async findByImageIdAndModel(imageId: string, model: string): Promise<ImageEmbedding | null> {
    const query = `
      SELECT * FROM image_embeddings 
      WHERE image_id = $1 AND embedding_model = $2
    `;
    const result = await pool.query(query, [imageId, model]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToImageEmbedding(result.rows[0]);
  }

  async findAll(): Promise<ImageEmbedding[]> {
    const query = 'SELECT * FROM image_embeddings ORDER BY generated_at DESC';
    const result = await pool.query(query);
    return result.rows.map(row => this.mapRowToImageEmbedding(row));
  }

  private mapRowToImageEmbedding(row: any): ImageEmbedding {
    return {
      id: row.id,
      image_id: row.image_id,
      embedding: row.embedding || [],
      embedding_model: row.embedding_model,
      generated_at: row.generated_at
    };
  }
}
