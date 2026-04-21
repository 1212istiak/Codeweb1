const express  = require('express');
const auth     = require('../middleware/auth');
const Episode  = require('../models/Episode');
const router   = express.Router();

// ── GET all episodes (public) ──────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const episodes = await Episode.find().sort({ order: 1, createdAt: 1 });
    res.json(episodes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET single episode (public) ────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const ep = await Episode.findById(req.params.id);
    if (!ep) return res.status(404).json({ error: 'Episode not found' });
    res.json(ep);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST create episode (admin only) ──────────────────────────────
router.post('/', auth, async (req, res) => {
  try {
    const count = await Episode.countDocuments();
    const ep = new Episode({
      num:         req.body.num         || String(count + 1).padStart(2, '0'),
      title:       req.body.title,
      description: req.body.description || '',
      dmEmbed:     req.body.dmEmbed     || '',
      rumbleEmbed: req.body.rumbleEmbed || '',
      order:       req.body.order       ?? count
    });
    await ep.save();
    res.status(201).json(ep);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── PUT update episode (admin only) ───────────────────────────────
router.put('/:id', auth, async (req, res) => {
  try {
    const allowed = ['num', 'title', 'description', 'dmEmbed', 'rumbleEmbed', 'order'];
    const updates = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

    const ep = await Episode.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );
    if (!ep) return res.status(404).json({ error: 'Episode not found' });
    res.json(ep);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── DELETE episode (admin only) ────────────────────────────────────
router.delete('/:id', auth, async (req, res) => {
  try {
    const ep = await Episode.findByIdAndDelete(req.params.id);
    if (!ep) return res.status(404).json({ error: 'Episode not found' });
    res.json({ message: 'Deleted', id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST reorder episodes (admin only) ────────────────────────────
// Body: { orderedIds: ["id1","id2","id3"] }
router.post('/reorder', auth, async (req, res) => {
  try {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds)) return res.status(400).json({ error: 'orderedIds must be an array' });

    const ops = orderedIds.map((id, index) =>
      Episode.findByIdAndUpdate(id, { $set: { order: index } })
    );
    await Promise.all(ops);
    res.json({ message: 'Reordered' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
