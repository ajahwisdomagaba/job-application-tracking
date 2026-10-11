import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import {connectDB} from './config/db.js';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import {errorHandler} from './middlewares/error.middleware.js';

dotenv.config();

const app = express();


//connect to database
connectDB();


//middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());

if(process.env.NODE_ENV === 'development'){
    app.use(morgan('dev'));
}

//Health check route
app.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Server is running',
    });
});

//routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);

//Error Handler
app.use(errorHandler);

//Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running IN ${process.env.NODE_ENV ||'development'} mode on port ${PORT}`);
});