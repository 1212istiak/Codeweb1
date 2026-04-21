const mongoose = require('mongoose');

const episodeSchema = new mongoose.Schema({
  num:         { type: String, required: true },          // "01", "02", …
  title:       { type: String, required: true },
  description: { type: String, default: '' },
  dmEmbed:     { type: String, default: '' },             // full <iframe> code
  rumbleEmbed: { type: String, default: '' },             // full <iframe> code
  order:       { type: Number, default: 0 },              // drag-sort position
  createdAt:   { type: Date,   default: Date.now }
});

module.exports = mongoose.model('Episode', episodeSchema);
