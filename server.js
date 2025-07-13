const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const path = require('path');
const cors = require('cors');
const User = require('./models/User');
const authRoutes = require('./routes/auth');
const fs = require('fs');

const app = express();
app.use(cors({
    origin: process.env.NODE_ENV === 'production'
        ? [
            'https://learnify-y02m.onrender.com',
            'https://learnify11.netlify.app', // Netlify frontend
        ]
        : ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true
}));

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
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/learnify', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => {
        console.error('MongoDB connection failed:', err.message);
        console.error('MongoDB URI:', process.env.MONGODB_URI || 'mongodb://localhost:27017/learnify');
        console.error('Note: Registration and login will not work without MongoDB running.');
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

    // Validate required fields for both roles
    if (!fullName || !username || !gender || !role || !password || !confirmPassword) {
        console.log('[REGISTER] Missing required fields');
        return res.json({ success: false, message: 'All fields are required.' });
    }
    // For students, seatNumber is required
    if (role === 'student' && (!seatNumber || seatNumber.trim() === '')) {
        return res.json({ success: false, message: 'Seat number is required for students.' });
    }
    // For teachers, seatNumber should not be required or saved
    if (role === 'teacher' && seatNumber) {
        console.log('[REGISTER] Teacher provided seatNumber, ignoring.');
    }
    if (password !== confirmPassword) {
        console.log('[REGISTER] Passwords do not match');
        return res.json({ success: false, message: 'Passwords do not match.' });
    }

    try {
        // Check if MongoDB is connected
        if (mongoose.connection.readyState !== 1) {
            console.error('[REGISTER] MongoDB not connected. State:', mongoose.connection.readyState);
            return res.json({ success: false, message: 'Database connection error. Please try again.' });
        }

        const exists = await User.findOne({ username });
        if (exists) {
            console.log('[REGISTER] Username already exists:', username);
            return res.json({ success: false, message: 'Username already exists.' });
        }
        // For students, check seat number uniqueness
        if (role === 'student') {
            const seatExists = await User.findOne({ seatNumber });
            if (seatExists) {
                return res.json({ success: false, message: 'Seat number already exists.' });
            }
        }

        const userData = { fullName, username, gender, role };
        if (role === 'student') {
            userData.seatNumber = seatNumber;
        }
        // Do NOT set seatNumber for teachers

        const user = new User(userData);
        await user.setPassword(password);
        await user.save();
        console.log('[REGISTER] Saved user:', user._id);

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
        console.log('[REGISTER] JWT generated successfully');

        // Return success with token for immediate login
        res.json({
            success: true,
            message: 'Registration successful!',
            token: token,
            redirect: role === 'teacher' ? '/dashboard-teacher.html' : '/dashboard-student.html'
        });
    } catch (err) {
        console.error('[REGISTER] Error:', err.message);
        console.error('[REGISTER] Stack:', err.stack);

        // Provide more specific error messages
        if (err.code === 11000) {
            return res.json({ success: false, message: 'Username or seat number already exists.' });
        }
        if (err.name === 'ValidationError') {
            return res.json({ success: false, message: 'Validation error: ' + Object.values(err.errors).map(e => e.message).join(', ') });
        }

        res.json({ success: false, message: 'Registration failed. Please try again.' });
    }
});

// Login endpoint (for compatibility with frontend)
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    console.log('[LOGIN] Attempt:', { username });

    try {
        // Check if MongoDB is connected
        if (mongoose.connection.readyState !== 1) {
            console.error('[LOGIN] MongoDB not connected. State:', mongoose.connection.readyState);
            return res.json({ success: false, message: 'Database connection error. Please try again.' });
        }

        const user = await User.findOne({ username });
        if (!user) {
            console.log('[LOGIN] User not found:', username);
            return res.json({ success: false, message: 'Incorrect username or password.' });
        }
        console.log('[LOGIN] Found user:', user._id);

        const valid = await user.validatePassword(password);
        if (!valid) {
            console.log('[LOGIN] Invalid password for user:', username);
            return res.json({ success: false, message: 'Incorrect username or password.' });
        }

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
        console.log('[LOGIN] JWT generated successfully');

        // Redirect based on role - FIXED LOGIC
        let redirect = '/dashboard-student.html';
        if (user.role === 'teacher') {
            redirect = '/dashboard-teacher.html';
        }
        res.json({ success: true, redirect, token });
    } catch (err) {
        console.error('[LOGIN] Error:', err.message);
        console.error('[LOGIN] Stack:', err.stack);
        res.json({ success: false, message: 'Login failed. Please try again.' });
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
    const mongoState = mongoose.connection.readyState;
    const mongoStatus = {
        0: 'Disconnected',
        1: 'Connected',
        2: 'Connecting',
        3: 'Disconnecting'
    }[mongoState] || 'Unknown';

    res.json({
        status: mongoState === 1 ? 'OK' : 'ERROR',
        mongoStatus: mongoStatus,
        mongoState: mongoState,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        backendUrl: process.env.NODE_ENV === 'production' ? 'https://learnify-y02m.onrender.com' : 'http://localhost:3000',
        hasJwtSecret: !!process.env.JWT_SECRET,
        hasMongoUri: !!process.env.MONGODB_URI
    });
});

// Fallback: Serve index.html for any unknown route (for SPA support)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`)); 