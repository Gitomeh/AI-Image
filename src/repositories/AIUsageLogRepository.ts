import { pool } from '../db/connection';
import { AIUsageLog, CreateAIUsageLogInput } from '../models/AIUsageLog';

export class AIUsageLogRepository {
  async create(input: CreateAIUsageLogInput): Promise<AIUsageLog> {
    const query = `
      INSERT INTO ai_usage_logs (
        operation, model, target_entity_type, target_entity_id,
        input_tokens, output_tokens, estimated_cost, success, error_message
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    const values = [
      input.operation,
      input.model,
      input.target_entity_type || null,
      input.target_entity_id || null,
      input.input_tokens || null,
      input.output_tokens || null,
      input.estimated_cost || null,
      input.success,
      input.error_message || null
    ];
    
    const result = await pool.query(query, values);
    return this.mapRowToAIUsageLog(result.rows[0]);
  }

  async findByModel(model: string): Promise<AIUsageLog[]> {
    const query = 'SELECT * FROM ai_usage_logs WHERE model = $1 ORDER BY request_timestamp DESC';
    const result = await pool.query(query, [model]);
    return result.rows.map(row => this.mapRowToAIUsageLog(row));
  }

  async findByOperation(operation: string): Promise<AIUsageLog[]> {
    const query = 'SELECT * FROM ai_usage_logs WHERE operation = $1 ORDER BY request_timestamp DESC';
    const result = await pool.query(query, [operation]);
    return result.rows.map(row => this.mapRowToAIUsageLog(row));
  }

  async findByTarget(entityType: string, entityId: string): Promise<AIUsageLog[]> {
    const query = `
      SELECT * FROM ai_usage_logs 
      WHERE target_entity_type = $1 AND target_entity_id = $2
      ORDER BY request_timestamp DESC
    `;
    const result = await pool.query(query, [entityType, entityId]);
    return result.rows.map(row => this.mapRowToAIUsageLog(row));
  }

  async getTotalCost(): Promise<number> {
    const query = 'SELECT COALESCE(SUM(estimated_cost), 0) as total FROM ai_usage_logs WHERE success = true';
    const result = await pool.query(query);
    return parseFloat(result.rows[0].total);
  }

  async getTotalTokens(): Promise<{ input: number; output: number }> {
    const query = `
      SELECT 
        COALESCE(SUM(input_tokens), 0) as input,
        COALESCE(SUM(output_tokens), 0) as output
      FROM ai_usage_logs 
      WHERE success = true
    `;
    const result = await pool.query(query);
    return {
      input: parseInt(result.rows[0].input),
      output: parseInt(result.rows[0].output)
    };
  }

  private mapRowToAIUsageLog(row: any): AIUsageLog {
    return {
      id: row.id,
      operation: row.operation,
      model: row.model,
      target_entity_type: row.target_entity_type,
      target_entity_id: row.target_entity_id,
      request_timestamp: row.request_timestamp,
      input_tokens: row.input_tokens,
      output_tokens: row.output_tokens,
      estimated_cost: row.estimated_cost ? parseFloat(row.estimated_cost) : undefined,
      success: row.success,
      error_message: row.error_message
    };
  }
}
