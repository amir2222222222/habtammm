const express = require("express");
const router = express.Router();
const { user } = require("../middleware/authmiddleware");
const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");

// GET /balance - Secured by JWT middleware
router.get("/balance", user, asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const foundUser = await User.findById(userId).lean();

  // Check if foundUser is valid
  if (!foundUser) {
    return res.status(404).json({ message: "User not found." });
  }

  // If balance is zero, respond without error message
  if (foundUser.balance === 0) {
    return res.json({ balance: 0 });
  }

  // If there is an issue with balance data
  if (typeof foundUser.balance === 'undefined') {
    return res.status(400).json({ message: "Invalid balance data." });
  }

  res.json({ balance: foundUser.balance });
}));

module.exports = router;
