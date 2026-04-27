const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
  twoFactorSecret: {
    type: String,
    default: null,
  },
  twoFactorEnabled: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
    role: {
      type: String,
      default: "user",
      enum: ["user", "admin"],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
