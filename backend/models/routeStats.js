const mongoose = require("mongoose");

const routeStatsSchema = new mongoose.Schema(
  {
    route: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    totalHits: {
      type: Number,
      default: 0,
    },
    totalAttacks: {
      type: Number,
      default: 0,
    },
    lastAttackType: {
      type: String,
      default: "",
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("RouteStats", routeStatsSchema);