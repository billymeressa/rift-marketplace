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
import suggestionRoutes from './routes/suggestions.js';
import uploadRoutes from './routes/upload.js';

// Validate JWT_SECRET at startup
const WEAK_SECRETS = ['dev-secret-change-in-production', 'your-secret-key-change-this', 'secret', 'password'];
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32 || WEAK_SECRETS.includes(process.env.JWT_SECRET)) {
  console.error('FATAL: JWT_SECRET is missing, too short, or using a known weak value. Set a strong secret (32+ chars) in .env');
  process.exit(1);
}

const app = express();
const port = parseInt(process.env.PORT || '3000');

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json({ limit: '10mb' }));

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
app.use('/api/v1/suggestions', suggestionRoutes);
app.use('/api/v1/upload', uploadRoutes);

app.listen(port, () => {
  console.log(`API server running on http://localhost:${port}`);
});

export default app;
