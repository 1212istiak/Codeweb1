const express  = require('express');
const jwt      = require('jsonwebtoken');
const bcrypt   = require('bcryptjs');
const auth     = require('../middleware/auth');
const router   = express.Router();

// In-memory hashed password (seeded from env on startup)
// For a multi-user future, swap this with a DB model.
let hashedPassword = null;

async function initPassword() {
  hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'rockstarz', 10);
}
initPassword();

// POST /api/admin/login
router.post('/login', async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Password required' });

  const match = await bcrypt.compare(password, hashedPassword);
  if (!match) return res.status(401).json({ error: 'Wrong password' });

  const token = jwt.sign({ admin: true }, process.env.JWT_SECRET, { expiresIn: '12h' });
  res.json({ token });
});

// POST /api/admin/change-password  (protected)
router.post('/change-password', auth, async (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 4)
    return res.status(400).json({ error: 'Password must be at least 4 characters' });

  hashedPassword = await bcrypt.hash(newPassword, 10);
  // Note: this resets on server restart unless you persist it.
  // For persistence, store the hash in MongoDB or a config document.
  res.json({ message: 'Password changed. Remember: it resets on server restart unless you store it in MongoDB.' });
});

// GET /api/admin/verify  (check if token still valid)
router.get('/verify', auth, (req, res) => {
  res.json({ ok: true });
});

module.exports = router;
