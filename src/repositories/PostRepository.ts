import { pool } from '../db/connection';
import { Post, CreatePostInput } from '../models/Post';

export class PostRepository {
  async create(input: CreatePostInput): Promise<Post> {
    const query = `
      INSERT INTO posts (title, content)
      VALUES ($1, $2)
      RETURNING *
    `;
    const values = [input.title, input.content];
    
    const result = await pool.query(query, values);
    return this.mapRowToPost(result.rows[0]);
  }

  async findById(id: string): Promise<Post | null> {
    const query = 'SELECT * FROM posts WHERE id = $1';
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToPost(result.rows[0]);
  }

  async findAll(limit: number = 100, offset: number = 0): Promise<Post[]> {
    const query = `
      SELECT * FROM posts
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `;
    const result = await pool.query(query, [limit, offset]);
    return result.rows.map(row => this.mapRowToPost(row));
  }

  async update(id: string, input: Partial<CreatePostInput>): Promise<Post | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (input.title !== undefined) {
      fields.push(`title = $${paramIndex++}`);
      values.push(input.title);
    }
    if (input.content !== undefined) {
      fields.push(`content = $${paramIndex++}`);
      values.push(input.content);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    const query = `
      UPDATE posts
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToPost(result.rows[0]);
  }

  async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM posts WHERE id = $1';
    const result = await pool.query(query, [id]);
    return (result.rowCount || 0) > 0;
  }

  private mapRowToPost(row: any): Post {
    return {
      id: row.id,
      title: row.title,
      content: row.content,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }
}
