const mongoose = require('mongoose');

const cardSchema = new mongoose.Schema({
    title:       { type: String, required: true },
    genre:       { type: String, default: '' },
    badge:       { type: String, default: 'Watch' },
    year:        { type: String, default: '2026' },
    imageUrl:    { type: String, default: '' },             // URL (local or Cloudinary)
    imagePublicId: { type: String, default: '' },           // Cloudinary public_id for deletion
    dmEmbed:     { type: String, default: '' },
    rumbleEmbed: { type: String, default: '' },
    colorScheme: { type: Number, default: 1, min: 1, max: 4 },  // 1-4 fallback art colors
    order:       { type: Number, default: 0 },
    createdAt:   { type: Date,   default: Date.now }
});

module.exports = mongoose.model('Card', cardSchema);
