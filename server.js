const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const path = require('path');
const cors = require('cors');
const User = require('./models/User');
const authRoutes = require('./routes/auth');
const fs = require('fs');

const app = express();
app.use(cors());

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'learnifysecret';

// Explicit 404 for missing uploads
app.get('/uploads/:filename', (req, res, next) => {
    const filePath = path.join(__dirname, 'uploads', req.params.filename);
    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
            return res.status(404).send('File not found');
        }
        res.sendFile(filePath);
    });
});

// Serve static files
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Parse incoming requests
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// JWT Middleware to verify token
function verifyToken(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ success: false, message: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ success: false, message: 'Invalid token' });
    }
}

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/learnify')
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => {
        console.log('MongoDB connection failed:', err.message);
        console.log('Note: Registration and login will not work without MongoDB running.');
    });

// Middleware to check authentication
function requireLogin(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ success: false, message: 'Invalid token' });
    }
}

// Use auth routes for authentication
app.use('/api/auth', authRoutes);

// Direct register endpoint for frontend compatibility
app.post('/register', async (req, res) => {
    const { fullName, username, gender, role, password, confirmPassword, seatNumber } = req.body;
    console.log('[REGISTER] Incoming:', { fullName, username, gender, role, seatNumber });

    if (!fullName || !username || !gender || !role || !password || !confirmPassword) {
        return res.json({ success: false, message: 'All fields are required.' });
    }

    if (password !== confirmPassword) {
        return res.json({ success: false, message: 'Passwords do not match.' });
    }

    try {
        const exists = await User.findOne({ username });
        if (exists) return res.json({ success: false, message: 'Username already exists.' });

        const userData = { fullName, username, gender, role };
        if (role === 'student' && seatNumber) {
            userData.seatNumber = seatNumber;
        }
        const user = new User(userData);
        await user.setPassword(password);
        await user.save();
        console.log('[REGISTER] Saved user:', user);

        // Generate JWT token for immediate login
        const token = jwt.sign(
            {
                userId: user._id,
                role: user.role,
                fullName: user.fullName,
                username: user.username
            },
            JWT_SECRET,
            { expiresIn: '7d' }
        );
        console.log('[REGISTER] JWT payload:', { userId: user._id, role: user.role, fullName: user.fullName, username: user.username });

        // Return success with token for immediate login
        res.json({
            success: true,
            message: 'Registration successful!',
            token: token,
            redirect: role === 'teacher' ? '/dashboard-teacher.html' : '/dashboard-student.html'
        });
    } catch (err) {
        console.error('Registration error:', err);
        res.json({ success: false, message: 'Registration failed.' });
    }
});

// Login endpoint (for compatibility with frontend)
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    console.log('[LOGIN] Attempt:', { username });

    try {
        const user = await User.findOne({ username });
        if (!user) return res.json({ success: false, message: 'Incorrect username or password.' });
        console.log('[LOGIN] Found user:', user);

        const valid = await user.validatePassword(password);
        if (!valid) return res.json({ success: false, message: 'Incorrect username or password.' });

        // Generate JWT token
        const token = jwt.sign(
            {
                userId: user._id,
                role: user.role,
                fullName: user.fullName,
                username: user.username
            },
            JWT_SECRET,
            { expiresIn: '7d' }
        );
        console.log('[LOGIN] JWT payload:', { userId: user._id, role: user.role, fullName: user.fullName, username: user.username });

        // Redirect based on role - FIXED LOGIC
        let redirect = '/dashboard-student.html';
        if (user.role === 'teacher') {
            redirect = '/dashboard-teacher.html';
        }
        res.json({ success: true, redirect, token });
    } catch (err) {
        console.error('Login error:', err);
        res.json({ success: false, message: 'Login failed.' });
    }
});

// Logout (client-side will remove token)
app.post('/logout', (req, res) => {
    res.json({ success: true, message: 'Logged out successfully' });
});

// Serve dashboards (protected)
app.get('/dashboard-teacher.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard-teacher.html'));
});

app.get('/dashboard-student.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard-student.html'));
});

// API routes with JWT authentication
app.use('/api/classroom', require('./routes/classroom'));
app.use('/api/post', require('./routes/post'));
app.use('/api/assignment', require('./routes/assignment'));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        mongoStatus: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
        timestamp: new Date().toISOString()
    });
});

// Fallback: Serve index.html for any unknown route (for SPA support)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`)); 