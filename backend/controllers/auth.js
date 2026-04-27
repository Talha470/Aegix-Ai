const User = require("../models/users");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

module.exports.signup = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ msg: "Email already exists" });
    }

    const hash = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hash,
    });

    res.status(201).json({
      msg: "Signup success",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports.login = async (req, res, next) => {
  try {
    const { email, password, twoFactorCode } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: "No user found" });
    }
    
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(400).json({ msg: "Wrong password" });
    }
    
    // CHECK IF 2FA IS ENABLED
    if (user.twoFactorEnabled) {
      // If 2FA code not provided, ask for it
      if (!twoFactorCode) {  // FIXED HERE
        return res.status(200).json({
          msg: "2FA required",
          requires2FA: true,
          userId: user._id
        });
      }
      
      // Verify 2FA code
      const speakeasy = require("speakeasy");
      const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: "base32",
        token: twoFactorCode,
        window: 2
      });
      
      if (!verified) {
        return res.status(400).json({ msg: "Invalid 2FA code" });
      }
    }
    
    // Generate JWT token
    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
    
    res.json({
      msg: "Login success",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        twoFactorEnabled: user.twoFactorEnabled
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports.profile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select("-password");

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    res.json(user);
  } catch (err) {
    next(err);
  }
};
