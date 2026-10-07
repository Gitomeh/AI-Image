import { Request, Response } from 'express';
import { pool } from '../db/connection';

export async function healthCheck(req: Request, res: Response) {
  try {
    // Check database connection
    const dbResult = await pool.query('SELECT NOW()');
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      db_time: dbResult.rows[0].now
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: 'Database connection failed'
    });
  }
}
