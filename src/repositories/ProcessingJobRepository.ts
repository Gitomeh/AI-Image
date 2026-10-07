import { pool } from '../db/connection';
import { ProcessingJob, CreateProcessingJobInput, JobStatus } from '../models/ProcessingJob';

export class ProcessingJobRepository {
  async create(input: CreateProcessingJobInput): Promise<ProcessingJob> {
    const query = `
      INSERT INTO processing_jobs (job_type, target_entity_type, target_entity_id, status, attempts)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const values = [
      input.job_type,
      input.target_entity_type,
      input.target_entity_id,
      'pending' as JobStatus,
      0
    ];
    
    const result = await pool.query(query, values);
    return this.mapRowToProcessingJob(result.rows[0]);
  }

  async findById(id: string): Promise<ProcessingJob | null> {
    const query = 'SELECT * FROM processing_jobs WHERE id = $1';
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToProcessingJob(result.rows[0]);
  }

  async findByTarget(entityType: string, entityId: string): Promise<ProcessingJob[]> {
    const query = `
      SELECT * FROM processing_jobs 
      WHERE target_entity_type = $1 AND target_entity_id = $2
      ORDER BY created_at DESC
    `;
    const result = await pool.query(query, [entityType, entityId]);
    return result.rows.map(row => this.mapRowToProcessingJob(row));
  }

  async findByStatus(status: JobStatus): Promise<ProcessingJob[]> {
    const query = `
      SELECT * FROM processing_jobs 
      WHERE status = $1 
      ORDER BY created_at ASC
    `;
    const result = await pool.query(query, [status]);
    return result.rows.map(row => this.mapRowToProcessingJob(row));
  }

  async updateStatus(id: string, status: JobStatus, error?: string): Promise<ProcessingJob | null> {
    const query = `
      UPDATE processing_jobs
      SET status = $1, error_message = $2
      WHERE id = $3
      RETURNING *
    `;
    const result = await pool.query(query, [status, error || null, id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToProcessingJob(result.rows[0]);
  }

  async incrementAttempts(id: string): Promise<ProcessingJob | null> {
    const query = `
      UPDATE processing_jobs
      SET attempts = attempts + 1
      WHERE id = $1
      RETURNING *
    `;
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToProcessingJob(result.rows[0]);
  }

  async markStarted(id: string): Promise<ProcessingJob | null> {
    const query = `
      UPDATE processing_jobs
      SET status = 'running', started_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToProcessingJob(result.rows[0]);
  }

  async markCompleted(id: string): Promise<ProcessingJob | null> {
    const query = `
      UPDATE processing_jobs
      SET status = 'completed', completed_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToProcessingJob(result.rows[0]);
  }

  private mapRowToProcessingJob(row: any): ProcessingJob {
    return {
      id: row.id,
      job_type: row.job_type,
      target_entity_type: row.target_entity_type,
      target_entity_id: row.target_entity_id,
      status: row.status,
      attempts: row.attempts,
      error_message: row.error_message,
      started_at: row.started_at,
      completed_at: row.completed_at,
      created_at: row.created_at
    };
  }
}
