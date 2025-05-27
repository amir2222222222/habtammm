const express = require('express');
const router = express.Router();
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');

// === GET: Admin Panel ===
router.get('/admin', (req, res) => {
  res.render("admin");
});

// === POST: Admin Signup ===
router.post('/signup/admin', asyncHandler(async (req, res) => {
  const { name, username, password } = req.body;

  const user = new User({
    name,
    username,
    password,
    role: 'admin'
  });

  await user.save();

  res.status(201).json({
    _id: user._id,
    username: user.username,
    role: user.role,
    name: user.name
  });
}));

// === POST: User Signup ===
router.post('/signup/user', asyncHandler(async (req, res) => {
  const {
    name,
    username,
    password,
    credit,
    user_commission,
    owner_commission,
    shopname
  } = req.body;

  const user = new User({
    name,
    shopname,
    username,
    password,
    credit,
    user_commission,
    owner_commission,
    role: 'user'
  });

  await user.save(); // pre-save middleware handles balance and timestamp

  res.status(201).json({
    _id: user._id,
    username: user.username,
    role: user.role,
    credit: user.credit,
    balance: user.balance,
    lastCreditTime: user.lastCreditTime
  });
}));

// === GET: List all users ===
router.get('/users_list', asyncHandler(async (req, res) => {
  const users = await User.find({}, 'name username credit balance user_commission owner_commission role shopname lastCreditTime');
  res.json(users);
}));

// === PUT: Update user fields (credit logic handled in model) ===
router.put('/users/:id', asyncHandler(async (req, res) => {
  const updates = req.body;
  delete updates.password;

  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  Object.entries(updates).forEach(([key, value]) => {
    user[key] = value;
  });

  await user.save();

  res.json({
    _id: user._id,
    username: user.username,
    credit: user.credit,
    balance: user.balance,
    lastCreditTime: user.lastCreditTime,
    role: user.role,
    user_commission: user.user_commission,
    owner_commission: user.owner_commission,
    shopname: user.shopname,
    name: user.name
  });
}));

// === DELETE: Remove user ===
router.delete('/users/:id', asyncHandler(async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.json({ message: 'User deleted successfully' });
}));

// === POST: Logout (clear cookies) ===
const cookiesToClear = [
  'token', '_birr_bet', 'selected', 'zValue', 'winnmoney',
  'totalbet', 'Voice', 'speed', 'zg'
];

router.post('/logout', (req, res) => {
  cookiesToClear.forEach(cookie => {
    res.clearCookie(cookie, { path: '/' });
  });
  res.redirect('/login');
});

module.exports = router;
