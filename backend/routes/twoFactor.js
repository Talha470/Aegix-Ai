const express = require("express");
const router = express.Router();
const { setup2FA, verify2FA, disable2FA } = require("../controllers/twoFactor");
const { protect } = require("../middlewares");

// Setup 2FA (generate QR code)
router.get("/setup", protect, setup2FA);

// Verify 2FA code and enable
router.post("/verify", protect, verify2FA);

// Disable 2FA
router.post("/disable", protect, disable2FA);

module.exports = router;
