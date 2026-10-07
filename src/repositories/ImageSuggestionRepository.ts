import { pool } from '../db/connection';
import { ImageSuggestion, CreateImageSuggestionInput } from '../models/ImageSuggestion';

export class ImageSuggestionRepository {
  async create(input: CreateImageSuggestionInput): Promise<ImageSuggestion> {
    const query = `
      INSERT INTO image_suggestions (
        post_id, image_id, similarity_score, confidence, 
        guard_decision, rejection_reason, rank
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (post_id, image_id) 
      DO UPDATE SET 
        similarity_score = $3,
        confidence = $4,
        guard_decision = $5,
        rejection_reason = $6,
        rank = $7,
        created_at = CURRENT_TIMESTAMP
      RETURNING *
    `;
    const values = [
      input.post_id,
      input.image_id,
      input.similarity_score,
      input.confidence,
      input.guard_decision,
      input.rejection_reason || null,
      input.rank
    ];
    
    const result = await pool.query(query, values);
    return this.mapRowToImageSuggestion(result.rows[0]);
  }

  async findById(id: string): Promise<ImageSuggestion | null> {
    const query = 'SELECT * FROM image_suggestions WHERE id = $1';
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToImageSuggestion(result.rows[0]);
  }

  async findByPostId(postId: string): Promise<ImageSuggestion[]> {
    const query = `
      SELECT * FROM image_suggestions 
      WHERE post_id = $1 
      ORDER BY rank ASC
    `;
    const result = await pool.query(query, [postId]);
    return result.rows.map(row => this.mapRowToImageSuggestion(row));
  }

  async findByPostIdAccepted(postId: string): Promise<ImageSuggestion[]> {
    const query = `
      SELECT * FROM image_suggestions 
      WHERE post_id = $1 AND guard_decision = 'accepted'
      ORDER BY rank ASC
    `;
    const result = await pool.query(query, [postId]);
    return result.rows.map(row => this.mapRowToImageSuggestion(row));
  }

  async findTopAcceptedForPost(postId: string): Promise<ImageSuggestion | null> {
    const query = `
      SELECT * FROM image_suggestions 
      WHERE post_id = $1 AND guard_decision = 'accepted'
      ORDER BY rank ASC
      LIMIT 1
    `;
    const result = await pool.query(query, [postId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToImageSuggestion(result.rows[0]);
  }

  async deleteByPostId(postId: string): Promise<number> {
    const query = 'DELETE FROM image_suggestions WHERE post_id = $1';
    const result = await pool.query(query, [postId]);
    return result.rowCount || 0;
  }

  async findAll(): Promise<ImageSuggestion[]> {
    const query = 'SELECT * FROM image_suggestions ORDER BY created_at DESC';
    const result = await pool.query(query);
    return result.rows.map(row => this.mapRowToImageSuggestion(row));
  }

  private mapRowToImageSuggestion(row: any): ImageSuggestion {
    return {
      id: row.id,
      post_id: row.post_id,
      image_id: row.image_id,
      similarity_score: parseFloat(row.similarity_score),
      confidence: parseFloat(row.confidence),
      guard_decision: row.guard_decision,
      rejection_reason: row.rejection_reason,
      rank: row.rank,
      created_at: row.created_at
    };
  }
}
