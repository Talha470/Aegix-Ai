const mongoose = require("mongoose");

const demoRequestSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    interest: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      default: "",
      trim: true,
    },
    demoLink: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      default: "SENT",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("DemoRequest", demoRequestSchema);