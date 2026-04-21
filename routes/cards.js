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

const upload = multe
