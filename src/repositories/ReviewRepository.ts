import { pool } from '../db/connection';
import { Review, CreateReviewInput, ReviewStatus } from '../models/Review';

export class ReviewRepository {
  async create(input: CreateReviewInput): Promise<Review> {
    const query = `
      INSERT INTO reviews (suggestion_id, review_status, reviewer, reason)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (suggestion_id) 
      DO UPDATE SET 
        review_status = $2,
        reviewer = $3,
        reason = $4,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;
    const values = [
      input.suggestion_id,
      input.review_status,
      input.reviewer || null,
      input.reason || null
    ];
    
    const result = await pool.query(query, values);
    return this.mapRowToReview(result.rows[0]);
  }

  async findBySuggestionId(suggestionId: string): Promise<Review | null> {
    const query = 'SELECT * FROM reviews WHERE suggestion_id = $1';
    const result = await pool.query(query, [suggestionId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToReview(result.rows[0]);
  }

  async findById(id: string): Promise<Review | null> {
    const query = 'SELECT * FROM reviews WHERE id = $1';
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToReview(result.rows[0]);
  }

  async findByStatus(status: ReviewStatus): Promise<Review[]> {
    const query = 'SELECT * FROM reviews WHERE review_status = $1 ORDER BY created_at DESC';
    const result = await pool.query(query, [status]);
    return result.rows.map(row => this.mapRowToReview(row));
  }

  async findAll(limit: number = 100, offset: number = 0): Promise<Review[]> {
    const query = `
      SELECT * FROM reviews
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `;
    const result = await pool.query(query, [limit, offset]);
    return result.rows.map(row => this.mapRowToReview(row));
  }

  private mapRowToReview(row: any): Review {
    return {
      id: row.id,
      suggestion_id: row.suggestion_id,
      review_status: row.review_status,
      reviewer: row.reviewer,
      reason: row.reason,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }
}
