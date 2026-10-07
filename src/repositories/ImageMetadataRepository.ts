import { pool } from '../db/connection';
import { ImageMetadata, CreateImageMetadataInput, ValidationStatus } from '../models/ImageMetadata';

export class ImageMetadataRepository {
  async create(input: CreateImageMetadataInput): Promise<ImageMetadata> {
    const query = `
      INSERT INTO image_metadata (
        image_id, subject, category, attributes, caption, confidence,
        raw_ai_response, validation_status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (image_id)
      DO UPDATE SET
        subject = $2,
        category = $3,
        attributes = $4,
        caption = $5,
        confidence = $6,
        raw_ai_response = $7,
        validation_status = $8,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;
    const values = [
      input.image_id,
      input.subject,
      input.category,
      JSON.stringify(input.attributes),
      input.caption,
      input.confidence,
      input.raw_ai_response ? JSON.stringify(input.raw_ai_response) : null,
      input.validation_status || this.determineValidationStatus(input.confidence)
    ];

    const result = await pool.query(query, values);
    return this.mapRowToImageMetadata(result.rows[0]);
  }

  async findByImageId(imageId: string): Promise<ImageMetadata | null> {
    const query = 'SELECT * FROM image_metadata WHERE image_id = $1';
    const result = await pool.query(query, [imageId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToImageMetadata(result.rows[0]);
  }

  async findById(id: string): Promise<ImageMetadata | null> {
    const query = 'SELECT * FROM image_metadata WHERE id = $1';
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToImageMetadata(result.rows[0]);
  }

  async updateValidationStatus(id: string, status: ValidationStatus): Promise<ImageMetadata | null> {
    const query = `
      UPDATE image_metadata
      SET validation_status = $1
      WHERE id = $2
      RETURNING *
    `;
    const result = await pool.query(query, [status, id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToImageMetadata(result.rows[0]);
  }

  async findByCategory(category: string): Promise<ImageMetadata[]> {
    const query = 'SELECT * FROM image_metadata WHERE category = $1';
    const result = await pool.query(query, [category]);
    return result.rows.map(row => this.mapRowToImageMetadata(row));
  }

  async findBySubject(subject: string): Promise<ImageMetadata[]> {
    const query = 'SELECT * FROM image_metadata WHERE subject = $1';
    const result = await pool.query(query, [subject]);
    return result.rows.map(row => this.mapRowToImageMetadata(row));
  }

  async findAll(): Promise<ImageMetadata[]> {
    const query = 'SELECT * FROM image_metadata ORDER BY created_at DESC';
    const result = await pool.query(query);
    return result.rows.map(row => this.mapRowToImageMetadata(row));
  }

  private determineValidationStatus(confidence: number): ValidationStatus {
    const confidenceThreshold = 0.8; // Default threshold, can be configurable
    if (confidence < confidenceThreshold) {
      return 'low_confidence';
    }
    return 'valid';
  }

  private mapRowToImageMetadata(row: any): ImageMetadata {
    return {
      id: row.id,
      image_id: row.image_id,
      subject: row.subject,
      category: row.category,
      attributes: row.attributes || [],
      caption: row.caption,
      confidence: parseFloat(row.confidence),
      raw_ai_response: row.raw_ai_response,
      validation_status: row.validation_status,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }
}
