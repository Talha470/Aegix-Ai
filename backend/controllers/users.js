const User = require("../models/users");

module.exports.allUsers = async (req, res, next) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    next(err);
  }
};

module.exports.singleUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select("-password");

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    res.json(user);
  } catch (err) {
    next(err);
  }
};

module.exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    res.json({ msg: "User deleted successfully" });
  } catch (err) {
    next(err);
  }
};