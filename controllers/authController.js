const User = require('../models/User');
const Classroom = require('../models/Classroom');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
    const { fullName, username, gender, role, password, confirmPassword, seatNumber } = req.body;
    if (!fullName || !username || !gender || !role || !password || !confirmPassword) {
        return res.json({ success: false, message: 'All fields are required.' });
    }
    if (password !== confirmPassword) {
        return res.json({ success: false, message: 'Passwords do not match.' });
    }
    try {
        const exists = await User.findOne({ username });
        if (exists) return res.json({ success: false, message: 'Username already exists.' });
        // Save seatNumber for students
        const userData = { fullName, username, gender, role };
        if (role === 'student' && seatNumber) userData.seatNumber = seatNumber;
        const user = new User(userData);
        await user.setPassword(password);
        await user.save();
        // Issue JWT
        const token = jwt.sign({ userId: user._id, username: user.username, role: user.role }, process.env.JWT_SECRET || 'learnifysecret', { expiresIn: '7d' });
        res.json({ success: true, token });
    } catch (err) {
        console.error('Registration error:', err);
        res.json({ success: false, message: 'Registration failed: ' + (err.message || err) });
    }
};

exports.login = async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ username });
        if (!user) {
            return res.json({ success: false, message: 'Invalid username or password' });
        }
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.json({ success: false, message: 'Invalid username or password' });
        }
        // Issue JWT
        const token = jwt.sign({ userId: user._id, username: user.username, role: user.role }, process.env.JWT_SECRET || 'learnifysecret', { expiresIn: '7d' });
        let redirect = '/dashboard-student.html';
        if (user.role === 'teacher') {
            redirect = '/dashboard-teacher.html';
        }
        return res.json({ success: true, redirect, token });
    } catch (err) {
        console.error(err);
        return res.json({ success: false, message: 'Server error' });
    }
};

exports.logout = (req, res) => {
    req.session.destroy(() => {
        res.redirect('/index.html');
    });
};

exports.me = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId)
            .select('-passwordHash')
            .lean();

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Ensure name is set to fullName for consistency
        user.name = user.fullName;
        user.seatNumber = user.seatNumber || null; // Ensure seatNumber is always included

        res.json(user);
    } catch (err) {
        console.error('Error in /me endpoint:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.getClass = async (req, res) => {
    if (!req.params.id || req.params.id === 'null') {
        return res.status(400).json({ success: false, message: 'Invalid class ID.' });
    }
    const classroom = await Classroom.findById(req.params.id);
    res.json(classroom);
};

// Add endpoint to update seatNumber and fullName for the current user
exports.updateProfile = async (req, res) => {
    try {
        const { seatNumber, fullName } = req.body;
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        if (seatNumber !== undefined) user.seatNumber = seatNumber;
        if (fullName !== undefined) user.fullName = fullName;
        await user.save();
        res.json({ success: true, message: 'Profile updated', seatNumber: user.seatNumber, fullName: user.fullName });
    } catch (err) {
        console.error('Error updating profile:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
}; 