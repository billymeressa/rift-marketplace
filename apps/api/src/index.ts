import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './routes/auth.js';
import listingRoutes from './routes/listings.js';
import userRoutes from './routes/users.js';
import orderRoutes from './routes/orders.js';
import verificationRoutes from './routes/verification.js';
import reviewRoutes from './routes/reviews.js';
import feedbackRoutes from './routes/feedback.js';
import telegramRoutes from './routes/telegram.js';

const app = express();
const port = parseInt(process.env.PORT || '3000');

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());

// Root
app.get('/', (_req, res) => {
  res.json({ name: 'Rift API', version: '1.0.0', docs: '/api/v1' });
});

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/listings', listingRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/verification', verificationRoutes);
app.use('/api/v1/reviews', reviewRoutes);
app.use('/api/v1/feedback', feedbackRoutes);
app.use('/api/v1/telegram', telegramRoutes);

app.listen(port, () => {
  console.log(`API server running on http://localhost:${port}`);
});

export default app;
