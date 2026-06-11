const mongoose = require('mongoose')

const blockedIPSchema = new mongoose.Schema({
  ip: { type: String, required: true, unique: true, trim: true },
  reason: { type: String, default: 'Manual block' },
  source: {
    type: String,
    enum: ['MANUAL', 'ABUSEIPDB', 'AUTO_ML', 'FAIL2BAN'],
    default: 'MANUAL'
  },
  abuseConfidenceScore: { type: Number, default: 0 },
  countryCode: { type: String, default: '' },
  isp: { type: String, default: '' },
  totalReports: { type: Number, default: 0 },
  blockedAt: { type: Date, default: Date.now },
  blockedBy: { type: String, default: 'admin' },
  permanent: { type: Boolean, default: true },
  expiresAt: { type: Date, default: null },
}, { timestamps: true })

module.exports = mongoose.model('BlockedIP', blockedIPSchema)
