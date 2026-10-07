import express, { Application } from 'express';
import { config } from './config/env';
import { logger } from './middleware/logger';
import { errorHandler, AppError } from './middleware/errorHandler';
import healthRoutes from './routes/healthRoutes';
import imageRoutes from './routes/imageRoutes';
import postRoutes from './routes/postRoutes';
import jobRoutes from './routes/jobRoutes';
import suggestionRoutes from './routes/suggestionRoutes';

const app: Application = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(logger);

// Routes
app.use('/', healthRoutes);
app.use('/images', imageRoutes);
app.use('/posts', postRoutes);
app.use('/jobs', jobRoutes);
app.use('/suggestions', suggestionRoutes);

// 404 handler
app.use((req, res, next) => {
  next(new AppError(404, `Route ${req.method} ${req.path} not found`, 'NOT_FOUND'));
});

// Error handler
app.use(errorHandler);

export default app;
