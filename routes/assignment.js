const express = require('express');
const multer = require('multer');
const path = require('path');
const AssignmentSubmission = require('../models/AssignmentSubmission');
const Post = require('../models/Post');
const { requireAuth, requireTeacher } = require('../middleware/auth');
const assignmentController = require('../controllers/assignmentController');

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

// Submit assignment (student only)
router.post('/submit', requireAuth, upload.single('file'), assignmentController.submitAssignment);

// Update assignment submission (student only, before deadline)
router.put('/submission/:id', requireAuth, upload.single('file'), assignmentController.updateAssignmentSubmission);

// Unsubmit (delete) assignment submission (student only, before due date)
router.delete('/submission/:id', requireAuth, assignmentController.unsubmitAssignment);

// Get submissions for an assignment (teacher only)
router.get('/submissions', requireAuth, requireTeacher, assignmentController.getSubmissions);

// Get student's submissions for a class
router.get('/student-submissions', requireAuth, assignmentController.getStudentSubmissionsForClass);

// Get submissions to review (teacher only)
router.get('/submissions-to-review', requireAuth, requireTeacher, assignmentController.getSubmissionsToReview);

// New route for updating marks
router.put('/submission/:submissionId/marks', requireAuth, requireTeacher, assignmentController.updateSubmissionMarks);

module.exports = router;
