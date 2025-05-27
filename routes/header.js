const express = require("express");
const router = express.Router();
const { user } = require("../middleware/authmiddleware");
const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");

// GET /balance - Secured by JWT middleware
router.get("/balance", user, asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const foundUser = await User.findById(userId).lean();

  if (!foundUser) {
    return res.status(404).json({ message: "User not found." });
  }

  res.json({ balance: foundUser.balance });
}));

module.exports = router;
