import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { connectDB } from './config/db.js';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import attachmentRoutes from './routes/attachment.routes.js';
import statisticsRoutes from './routes/statistics.routes.js';
import recruiterRoutes from './routes/recruiter.routes.js';
import { errorHandler } from './middlewares/error.middleware.js';
import recruiterPipelineRoutes from './routes/recruiterPipeline.routes.js';
import applicationRoutes from './routes/application.routes.js';

dotenv.config();

const app = express();

// Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());

if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// Health check route
app.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Server is running',
    });
});

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/recruiter', recruiterPipelineRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/attachments', attachmentRoutes);
app.use('/api/v1/statistics', statisticsRoutes);
app.use('/api/v1/recruiter', recruiterRoutes);
app.use('/api/v1', applicationRoutes);

// Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    await connectDB();
    app.listen(PORT, () => {
        console.log(`Server is running IN ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    });
};

startServer().catch((error) => {
    console.error("Application startup failed:", error.message);
    process.exitCode = 1;
});