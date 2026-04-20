const mongoose = require("mongoose");

const productPageUserSchema = new mongoose.Schema(
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
      lowercase: true,
      trim: true,
    },

    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
    },

    role: {
      type: String,
      default: "user",
    },

    selectedPlan: {
      type: String,
      default: "",
      trim: true,
    },

    selectedPlanPrice: {
      type: String,
      default: "",
      trim: true,
    },

    selectedPlanDuration: {
      type: String,
      default: "",
      trim: true,
    },

    planSelectedAt: {
      type: Date,
      default: null,
    },

    planValidTill: {
      type: Date,
      default: null,
    },

    // Add these two fields to store OTP and its expiry
    resetOtp: {
      type: String,
      required: false, // Not mandatory unless needed
    },

    resetOtpExpiry: {
      type: Date,
      required: false, // Not mandatory unless needed
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ProductPageUser", productPageUserSchema);