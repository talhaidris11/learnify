const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'learnifysecret';

// Get current user info
router.get('/me', requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('-passwordHash');
        if (!user) {
            console.log('[AUTH /me] User not found for userId:', req.user.userId);
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        console.log('[AUTH /me] User:', user);
        res.json({
            _id: user._id,
            username: user.username,
            fullName: user.fullName,
            role: user.role,
            gender: user.gender,
            seatNumber: user.seatNumber // Add seatNumber to response
        });
        console.log('[AUTH /me] Returned role:', user.role);
    } catch (err) {
        console.error('Error fetching user:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Add route to update seatNumber and fullName for the current user
router.post('/update-profile', requireAuth, require('../controllers/authController').updateProfile);

// Endpoint to update seatNumber and fullName for a user
router.put('/update-profile', requireAuth, async (req, res) => {
    try {
        const { seatNumber, fullName } = req.body;
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        if (seatNumber) user.seatNumber = seatNumber;
        if (fullName) user.fullName = fullName;
        await user.save();
        res.json({ success: true, message: 'Profile updated', user });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error updating profile' });
    }
});

module.exports = router; 