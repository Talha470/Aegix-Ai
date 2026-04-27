const User = require("../models/users");
const speakeasy = require("speakeasy");
const qrcode = require("qrcode");

// Generate 2FA secret and QR code
module.exports.setup2FA = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `AEGIX AI (${user.email})`,
      length: 32,
    });

    // Save secret (but don't enable yet)
    user.twoFactorSecret = secret.base32;
    await user.save();

    // Generate QR code
    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);

    res.json({
      msg: "2FA setup initiated",
      qrCode: qrCodeUrl,
      secret: secret.base32,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};

// Verify and enable 2FA
module.exports.verify2FA = async (req, res) => {
  try {
    const userId = req.user.id;
    const { token } = req.body;

    const user = await User.findById(userId);
    if (!user || !user.twoFactorSecret) {
      return res.status(400).json({ msg: "2FA not set up" });
    }

    // Verify token
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: "base32",
      token: token,
      window: 2,
    });

    if (!verified) {
      return res.status(400).json({ msg: "Invalid code" });
    }

    // Enable 2FA
    user.twoFactorEnabled = true;
    await user.save();

    res.json({ msg: "2FA enabled successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};

// Disable 2FA
module.exports.disable2FA = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    user.twoFactorEnabled = false;
    user.twoFactorSecret = null;
    await user.save();

    res.json({ msg: "2FA disabled" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};

// Validate 2FA during login
module.exports.validate2FA = async (userId, token) => {
  try {
    const user = await User.findById(userId);
    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      return false;
    }

    return speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: "base32",
      token: token,
      window: 2,
    });
  } catch (err) {
    console.error(err);
    return false;
  }
};
