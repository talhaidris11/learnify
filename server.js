const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const path = require('path');
const cors = require('cors');
const User = require('./models/User');
const authRoutes = require('./routes/auth');
const fs = require('fs');

const app = express();

// Enhanced CORS configuration for live server
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        // Allow localhost for development
        if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
            return callback(null, true);
        }

        // Allow your live server domains
        const allowedOrigins = [
            'https://learnify-y02m.onrender.com',
            'https://your-live-domain.com', // Add your actual live domain here
            process.env.FRONTEND_URL // Allow environment variable for frontend URL
        ].filter(Boolean);

        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
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

// Connect to MongoDB with better error handling for live server
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/learnify';
console.log('Attempting to connect to MongoDB...');

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
    socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
})
    .then(() => {
        console.log('✅ Connected to MongoDB successfully');
        console.log('Database:', mongoose.connection.name);
    })
    .catch((err) => {
        console.error('❌ MongoDB connection failed:', err.message);
        console.log('Note: Registration and login will not work without MongoDB running.');
        console.log('Please ensure your MONGODB_URI environment variable is set correctly for live deployment.');
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
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        port: process.env.PORT || 3000
    });
});

// API status endpoint
app.get('/api/status', (req, res) => {
    res.json({
        success: true,
        message: 'API is running',
        database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
        timestamp: new Date().toISOString()
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);

    if (err.message === 'Not allowed by CORS') {
        return res.status(403).json({
            success: false,
            message: 'CORS error: Request not allowed from this origin',
            origin: req.headers.origin
        });
    }

    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

// Fallback: Serve index.html for any unknown route (for SPA support)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server with better logging for live deployment
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📱 Local: http://localhost:${PORT}`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 MongoDB: ${MONGODB_URI.includes('localhost') ? 'Local' : 'Remote'}`);
}); 