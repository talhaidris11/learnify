const express = require('express');
const multer = require('multer');
const path = require('path');
const Classroom = require('../models/Classroom');
const { requireAuth, requireTeacher } = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// Create a new classroom
router.post('/create', requireAuth, requireTeacher, upload.single('file'), async (req, res) => {
    try {
        // Support both JSON and multipart/form-data
        let className, subject, section, description;
        if (req.is('application/json')) {
            className = req.body.className;
            subject = req.body.subject;
            section = req.body.section;
            description = undefined;
        } else {
            className = req.body.className;
            subject = req.body.subject;
            section = req.body.section;
            description = req.body.description;
        }
        const classCode = Math.random().toString(36).substring(2, 8).toUpperCase();

        const classroom = new Classroom({
            className,
            subject,
            section,
            description,
            classCode,
            teacherID: req.user.userId,
            file: req.file ? req.file.filename : null
        });

        await classroom.save();
        res.json({ success: true, classroom });
    } catch (err) {
        console.error('Error creating classroom:', err);
        res.status(500).json({ success: false, message: 'Failed to create classroom.' });
    }
});

// Join a classroom
router.post('/join', requireAuth, async (req, res) => {
    try {
        const { classCode } = req.body;
        const classroom = await Classroom.findOne({ classCode });

        if (!classroom) {
            return res.json({ success: false, message: 'Class not found.' });
        }

        if (classroom.studentIDs.includes(req.user.userId)) {
            return res.json({ success: false, message: 'Already enrolled in this class.' });
        }

        classroom.studentIDs.push(req.user.userId);
        await classroom.save();
        res.json({ success: true, classroom });
    } catch (err) {
        console.error('Error joining classroom:', err);
        res.status(500).json({ success: false, message: 'Failed to join classroom.' });
    }
});

// Get user's classes (teacher or student)
router.get('/my', requireAuth, async (req, res) => {
    try {
        let classes;
        if (req.user.role === 'teacher') {
            classes = await Classroom.find({ teacherID: req.user.userId });
        } else {
            classes = await Classroom.find({ studentIDs: req.user.userId });
        }
        res.json(classes);
    } catch (err) {
        console.error('Error fetching classes:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch classes.' });
    }
});

// Get specific classroom
router.get('/:id', requireAuth, async (req, res) => {
    try {
        const classroom = await Classroom.findById(req.params.id);
        if (!classroom) {
            return res.status(404).json({ success: false, message: 'Class not found.' });
        }

        // Check if user has access to this class
        if (classroom.teacherID.toString() !== req.user.userId &&
            !classroom.studentIDs.includes(req.user.userId)) {
            return res.status(403).json({ success: false, message: 'Access denied.' });
        }

        res.json(classroom);
    } catch (err) {
        console.error('Error fetching classroom:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch class.' });
    }
});

// Update classroom info (teacher only)
router.put('/:id', requireAuth, requireTeacher, async (req, res) => {
    try {
        const classroom = await Classroom.findById(req.params.id);
        if (!classroom) {
            return res.status(404).json({ success: false, message: 'Class not found.' });
        }
        if (classroom.teacherID.toString() !== req.user.userId) {
            return res.status(403).json({ success: false, message: 'Only the class teacher can update this class.' });
        }
        const { className, section, subject } = req.body;
        if (className) classroom.className = className;
        if (section) classroom.section = section;
        if (subject) classroom.subject = subject;
        await classroom.save();
        res.json({ success: true, classroom });
    } catch (err) {
        console.error('Error updating classroom:', err);
        res.status(500).json({ success: false, message: 'Failed to update classroom: ' + (err.message || err) });
    }
});

// Delete classroom (teacher only)
router.delete('/:id', requireAuth, requireTeacher, async (req, res) => {
    try {
        const classroom = await Classroom.findById(req.params.id);
        if (!classroom) {
            return res.status(404).json({ success: false, message: 'Class not found.' });
        }

        if (classroom.teacherID.toString() !== req.user.userId) {
            return res.status(403).json({ success: false, message: 'Only the class teacher can delete this class.' });
        }

        await Classroom.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Class deleted successfully.' });
    } catch (err) {
        console.error('Error deleting classroom:', err);
        res.status(500).json({ success: false, message: 'Failed to delete class.' });
    }
});

// Leave class (student only)
router.post('/leave', requireAuth, async (req, res) => {
    try {
        const { classId } = req.body;
        const classroom = await Classroom.findById(classId);

        if (!classroom) {
            return res.status(404).json({ success: false, message: 'Class not found.' });
        }

        if (!classroom.studentIDs.includes(req.user.userId)) {
            return res.status(400).json({ success: false, message: 'Not enrolled in this class.' });
        }

        // Remove student from class
        classroom.studentIDs = classroom.studentIDs.filter(id => id.toString() !== req.user.userId);
        await classroom.save();

        // Delete student's submissions for this class
        const AssignmentSubmission = require('../models/AssignmentSubmission');
        const assignments = await require('../models/Post').find({
            classID: classId,
            type: 'assignment'
        });
        const assignmentIds = assignments.map(a => a._id);

        if (assignmentIds.length > 0) {
            await AssignmentSubmission.deleteMany({
                assignmentID: { $in: assignmentIds },
                studentID: req.user.userId
            });
        }

        res.json({ success: true, message: 'Left class successfully.' });
    } catch (err) {
        console.error('Error leaving class:', err);
        res.status(500).json({ success: false, message: 'Failed to leave class.' });
    }
});

module.exports = router;