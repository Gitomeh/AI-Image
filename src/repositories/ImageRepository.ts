import { pool } from '../db/connection';
import { Image, CreateImageInput, ProcessingStatus } from '../models/Image';

export class ImageRepository {
  async create(input: CreateImageInput): Promise<Image> {
    const query = `
      INSERT INTO images (filename, source_url, storage_reference, processing_status)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const values = [
      input.filename,
      input.source_url || null,
      input.storage_reference || null,
      'pending' as ProcessingStatus
    ];
    
    const result = await pool.query(query, values);
    return this.mapRowToImage(result.rows[0]);
  }

  async findById(id: string): Promise<Image | null> {
    const query = 'SELECT * FROM images WHERE id = $1';
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToImage(result.rows[0]);
  }

  async findAll(limit: number = 100, offset: number = 0): Promise<Image[]> {
    const query = `
      SELECT * FROM images
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `;
    const result = await pool.query(query, [limit, offset]);
    return result.rows.map(row => this.mapRowToImage(row));
  }

  async updateStatus(id: string, status: ProcessingStatus): Promise<Image | null> {
    const query = `
      UPDATE images
      SET processing_status = $1
      WHERE id = $2
      RETURNING *
    `;
    const result = await pool.query(query, [status, id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToImage(result.rows[0]);
  }

  async findByStatus(status: ProcessingStatus): Promise<Image[]> {
    const query = 'SELECT * FROM images WHERE processing_status = $1 ORDER BY created_at ASC';
    const result = await pool.query(query, [status]);
    return result.rows.map(row => this.mapRowToImage(row));
  }

  async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM images WHERE id = $1';
    const result = await pool.query(query, [id]);
    return (result.rowCount || 0) > 0;
  }

  private mapRowToImage(row: any): Image {
    return {
      id: row.id,
      filename: row.filename,
      source_url: row.source_url,
      storage_reference: row.storage_reference,
      processing_status: row.processing_status,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }
}
