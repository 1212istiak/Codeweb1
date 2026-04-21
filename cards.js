const express    = require('express');
const multer     = require('multer');
const path       = require('path');
const fs         = require('fs');
const cloudinary = require('cloudinary').v2;
const auth       = require('../middleware/auth');
const Card       = require('../models/Card');
const router     = express.Router();

// ── Storage setup (local vs Cloudinary) ───────────────────────────
const USE_CLOUD = process.env.IMAGE_STORAGE === 'cloudinary';

if (USE_CLOUD) {
  cloudinary.config({
    cloud_name:  process.env.CLOUDINARY_CLOUD_NAME,
    api_key:     process.env.CLOUDINARY_API_KEY,
    api_secret:  process.env.CLOUDINARY_API_SECRET
  });
}

// Local disk storage
const localStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase();
    const safe = path.basename(file.originalname, ext).replace(/[^a-z0-9]/gi, '_');
    cb(null, `${Date.now()}_${safe}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|webp/;
  if (allowed.test(file.mimetype)) cb(null, true);
  else cb(new Error('Only image files are allowed'), false);
};

const upload = multer({
  storage: localStorage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }  // 10 MB
});

// Helper: delete old image
async function deleteOldImage(card) {
  if (!card.imageUrl) return;
  if (USE_CLOUD && card.imagePublicId) {
    try { await cloudinary.uploader.destroy(card.imagePublicId); } catch (e) {}
  } else if (!USE_CLOUD && card.imageUrl.startsWith('/uploads/')) {
    const fullPath = path.join(__dirname, '..', card.imageUrl);
    fs.unlink(fullPath, () => {});
  }
}

// Helper: upload to Cloudinary and return { url, publicId }
async function uploadToCloudinary(localPath) {
  const result = await cloudinary.uploader.upload(localPath, {
    folder: 'rockstarz',
    transformation: [{ width: 600, height: 900, crop: 'fill', gravity: 'auto' }]
  });
  fs.unlink(localPath, () => {});   // remove temp file
  return { url: result.secure_url, publicId: result.public_id };
}

// ── GET all cards (public) ─────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const cards = await Card.find().sort({ order: 1, createdAt: 1 });
    res.json(cards);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET single card (public) ───────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const card = await Card.findById(req.params.id);
    if (!card) return res.status(404).json({ error: 'Card not found' });
    res.json(card);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST create card (admin only) ─────────────────────────────────
router.post('/', auth, upload.single('image'), async (req, res) => {
  try {
    const count = await Card.countDocuments();
    let imageUrl = '', imagePublicId = '';

    if (req.file) {
      if (USE_CLOUD) {
        const r = await uploadToCloudinary(req.file.path);
        imageUrl = r.url;
        imagePublicId = r.publicId;
      } else {
        imageUrl = `/uploads/${req.file.filename}`;
      }
    }

    const card = new Card({
      title:       req.body.title,
      genre:       req.body.genre       || '',
      badge:       req.body.badge       || 'Watch',
      year:        req.body.year        || '2026',
      imageUrl,
      imagePublicId,
      dmEmbed:     req.body.dmEmbed     || '',
      rumbleEmbed: req.body.rumbleEmbed || '',
      colorScheme: parseInt(req.body.colorScheme) || ((count % 4) + 1),
      order:       req.body.order       ?? count
    });

    await card.save();
    res.status(201).json(card);
  } catch (err) {
    if (req.file) fs.unlink(req.file.path, () => {});
    res.status(400).json({ error: err.message });
  }
});

// ── PUT update card (admin only) ──────────────────────────────────
router.put('/:id', auth, upload.single('image'), async (req, res) => {
  try {
    const card = await Card.findById(req.params.id);
    if (!card) return res.status(404).json({ error: 'Card not found' });

    const allowed = ['title', 'genre', 'badge', 'year', 'dmEmbed', 'rumbleEmbed', 'colorScheme', 'order'];
    allowed.forEach(k => { if (req.body[k] !== undefined) card[k] = req.body[k]; });

    if (req.file) {
      await deleteOldImage(card);
      if (USE_CLOUD) {
        const r = await uploadToCloudinary(req.file.path);
        card.imageUrl = r.url;
        card.imagePublicId = r.publicId;
      } else {
        card.imageUrl = `/uploads/${req.file.filename}`;
        card.imagePublicId = '';
      }
    }

    await card.save();
    res.json(card);
  } catch (err) {
    if (req.file) fs.unlink(req.file.path, () => {});
    res.status(400).json({ error: err.message });
  }
});

// ── DELETE card (admin only) ──────────────────────────────────────
router.delete('/:id', auth, async (req, res) => {
  try {
    const card = await Card.findByIdAndDelete(req.params.id);
    if (!card) return res.status(404).json({ error: 'Card not found' });
    await deleteOldImage(card);
    res.json({ message: 'Deleted', id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST reorder cards (admin only) ───────────────────────────────
router.post('/reorder', auth, async (req, res) => {
  try {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds)) return res.status(400).json({ error: 'orderedIds must be an array' });
    await Promise.all(orderedIds.map((id, i) => Card.findByIdAndUpdate(id, { $set: { order: i } })));
    res.json({ message: 'Reordered' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
