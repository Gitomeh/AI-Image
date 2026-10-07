import { pool } from '../db/connection';
import { EvaluationItem, CreateEvaluationItemInput, EvaluationResult } from '../models/EvaluationItem';

export class EvaluationItemRepository {
  async create(input: CreateEvaluationItemInput): Promise<EvaluationItem> {
    const query = `
      INSERT INTO evaluation_items (post_id, expected_image_id, notes)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    const values = [
      input.post_id,
      input.expected_image_id,
      input.notes || null
    ];
    
    const result = await pool.query(query, values);
    return this.mapRowToEvaluationItem(result.rows[0]);
  }

  async findById(id: string): Promise<EvaluationItem | null> {
    const query = 'SELECT * FROM evaluation_items WHERE id = $1';
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToEvaluationItem(result.rows[0]);
  }

  async findByPostId(postId: string): Promise<EvaluationItem | null> {
    const query = 'SELECT * FROM evaluation_items WHERE post_id = $1';
    const result = await pool.query(query, [postId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToEvaluationItem(result.rows[0]);
  }

  async findAll(): Promise<EvaluationItem[]> {
    const query = 'SELECT * FROM evaluation_items ORDER BY created_at ASC';
    const result = await pool.query(query);
    return result.rows.map(row => this.mapRowToEvaluationItem(row));
  }

  async updateResult(id: string, result: EvaluationResult): Promise<EvaluationItem | null> {
    const query = `
      UPDATE evaluation_items
      SET evaluation_result = $1
      WHERE id = $2
      RETURNING *
    `;
    const queryResult = await pool.query(query, [result, id]);
    
    if (queryResult.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToEvaluationItem(queryResult.rows[0]);
  }

  async clearResults(): Promise<number> {
    const query = 'UPDATE evaluation_items SET evaluation_result = NULL';
    const result = await pool.query(query);
    return result.rowCount || 0;
  }

  private mapRowToEvaluationItem(row: any): EvaluationItem {
    return {
      id: row.id,
      post_id: row.post_id,
      expected_image_id: row.expected_image_id,
      notes: row.notes,
      evaluation_result: row.evaluation_result,
      created_at: row.created_at
    };
  }
}
