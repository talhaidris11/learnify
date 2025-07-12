const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'learnifysecret';

// Middleware to verify JWT token
function requireAuth(req, res, next) {
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

// Middleware to check if user is teacher
function requireTeacher(req, res, next) {
    if (req.user && req.user.role === 'teacher') {
        next();
    } else {
        return res.status(403).json({ success: false, message: 'Teacher access required' });
    }
}

// Middleware to check if user is student
function requireStudent(req, res, next) {
    if (req.user && req.user.role === 'student') {
        next();
    } else {
        return res.status(403).json({ success: false, message: 'Student access required' });
    }
}

module.exports = { requireAuth, requireTeacher, requireStudent }; 