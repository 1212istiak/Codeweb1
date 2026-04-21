require('dotenv').config();

const express   = require('express');
const mongoose  = require('mongoose');
const cors      = require('cors');
const path      = require('path');
const fs        = require('fs');

// ── Routes ─────────────────────────────────────────────────────────
const episodesRouter = require('./routes/episodes');
const cardsRouter    = require('./routes/cards');
const adminRouter    = require('./routes/admin');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ─────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded images (local storage mode)
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

// Serve the frontend
app.use(express.static(path.join(__dirname, 'public')));

// ── API Routes ─────────────────────────────────────────────────────
app.use('/api/episodes', episodesRouter);
app.use('/api/cards',    cardsRouter);
app.use('/api/admin',    adminRouter);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

// SPA fallback — serve index.html for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── MongoDB Connection ─────────────────────────────────────────────
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/rockstarz';

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📺 Admin panel: http://localhost:${PORT}  (click ⚙ icon)`);
    });
  })
  .catch(err => {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  });

// Graceful shutdown
process.on('SIGTERM', async () => {
  await mongoose.connection.close();
  process.exit(0);
});
