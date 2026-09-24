const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

// ─── Security Middleware ──────────────────────────────────
app.use(helmet());
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  'http://localhost:5173',        // Electron dev mode
  'https://gathalok.prahladsingh.in',
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || origin === 'null' || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 100,
  message: { success: false, message: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// ─── Body Parsing ─────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Logging ─────────────────────────────────────────────
if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));

// ─── Routes ──────────────────────────────────────────────
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/stories',       require('./routes/stories'));
app.use('/api/countries',     require('./routes/countries'));
app.use('/api/categories',    require('./routes/categories'));
app.use('/api/comments/:storyId', require('./routes/comments'));
app.use('/api/comments',          require('./routes/comments'));
app.use('/api/bookmarks',     require('./routes/bookmarks'));
app.use('/api/ratings',       require('./routes/ratings'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/achievements',  require('./routes/achievements'));
app.use('/api/leaderboard',   require('./routes/leaderboard'));
app.use('/api/admin',         require('./routes/admin'));
app.use('/api/users',         require('./routes/users'));
app.use('/api/upload',        require('./routes/upload'));

// ─── Health Check ─────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'OK', message: 'GathaLok API running' }));

// ─── 404 Handler ──────────────────────────────────────────
app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));

// ─── Global Error Handler ─────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// ─── MongoDB Connection + Server Start ───────────────────
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB Connected');
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`🚀 GathaLok API running on port ${PORT}`));
  })
  .catch(err => {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  });

module.exports = app;
