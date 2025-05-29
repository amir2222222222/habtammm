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
    const { name, password } = req.body;

    const user = new User({
        name,
        username: name, // Use name as username
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
    const { name, password, credit, user_commission, owner_commission, shopname } = req.body;

    const user = new User({
        name,
        shopname,
        username: name, // Use name as username
        password,
        credit,
        user_commission,
        owner_commission,
        role: 'user'
    });

    await user.save(); // Pre-save middleware handles balance and timestamp

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
    const users = await User.find({}, 'name username role lastCreditTime');
    res.json(users);
}));

// === PUT: Update user fields ===
router.put('/users/:id', asyncHandler(async (req, res) => {
    const updates = req.body;
    delete updates.password; // Ensure password can't be updated here

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Apply only valid fields
    ['credit', 'user_commission', 'owner_commission'].forEach(field => {
        if (updates[field] !== undefined) {
            user[field] = updates[field];
        }
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
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

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