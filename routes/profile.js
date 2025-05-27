const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { user } = require('../middleware/authmiddleware');
const asyncHandler = require('../utils/asyncHandler');

// GET /profile - show profile page with optional success messages
router.get('/profile', user, asyncHandler(async (req, res) => {
  const foundUser = await User.findById(req.user.id).lean();
  if (!foundUser) return res.redirect('/login');

  const { name, username, shopname } = foundUser;

  res.render('profile', {
    name,
    username,
    shopname,
    successName: req.query.nameUpdated === 'true' ? 'Name updated successfully!' : null,
    successUsername: req.query.usernameUpdated === 'true' ? 'Username updated successfully! Please log in again.' : null,
  });
}));

// POST /profile/name - update name
router.post('/profile/name', user, asyncHandler(async (req, res) => {
  const name = (req.body.name || '').trim();

  if (!name) {
    return res.status(400).json({ error: 'Name cannot be empty.' });
  }

  const foundUser = await User.findById(req.user.id);
  if (!foundUser) return res.redirect('/login');

  foundUser.name = name;
  await foundUser.save();

  res.redirect('/profile?nameUpdated=true');
}));

// POST /profile/username - update username (unique check)
router.post('/profile/username', user, asyncHandler(async (req, res) => {
  const username = (req.body.username || '').trim();

  if (!username) {
    return res.status(400).json({ error: 'Username cannot be empty.' });
  }

  // Check if username already exists and is not current user
  const existingUser = await User.findOne({ username });
  if (existingUser && existingUser._id.toString() !== req.user.id) {
    return res.status(400).json({ error: 'Username already taken.' });
  }

  const foundUser = await User.findById(req.user.id);
  if (!foundUser) return res.redirect('/login');

  foundUser.username = username;
  await foundUser.save();

  // Redirect to logout to force re-login after username change
  res.redirect('/logout?usernameUpdated=true');
}));

module.exports = router;
 