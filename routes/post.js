const express = require('express');
const multer = require('multer');
const path = require('path');
const Post = require('../models/Post');
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

// Create a new post (teacher only)
router.post('/create', requireAuth, requireTeacher, upload.single('file'), async (req, res) => {
    try {
        const { classID, type, content, dueDate, totalMarks } = req.body;
        if (type === 'assignment') {
            if (!totalMarks || isNaN(totalMarks) || Number(totalMarks) <= 0 || !Number.isInteger(Number(totalMarks))) {
                return res.status(400).json({ success: false, message: 'Total Marks is required and must be a positive integer.' });
            }
        }
        const post = new Post({
            classID,
            type,
            content,
            dueDate: dueDate || null,
            postedBy: req.user.userId,
            file: req.file ? req.file.filename : null,
            totalMarks: type === 'assignment' ? Number(totalMarks) : undefined
        });
        await post.save();
        res.json({ success: true, post });
    } catch (err) {
        console.error('Error creating post:', err);
        res.status(500).json({ success: false, message: 'Failed to create post.' });
    }
});

// Get posts for a class
router.get('/', requireAuth, async (req, res) => {
    try {
        const { classID } = req.query;
        const posts = await Post.find({ classID }).populate('postedBy', 'fullName username');
        res.json(posts);
    } catch (err) {
        console.error('Error fetching posts:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch posts.' });
    }
});

// Get a single post by ID (for editing)
router.get('/single/:id', requireAuth, requireTeacher, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ success: false, message: 'Post not found.' });
        res.json(post);
    } catch (err) {
        console.error('Error fetching post:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch post.' });
    }
});

// Update a post/assignment (teacher only)
router.put('/:id', requireAuth, requireTeacher, upload.single('file'), async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ success: false, message: 'Post not found.' });

        // Update fields if provided
        if (req.body.content) post.content = req.body.content;
        if (req.body.type) post.type = req.body.type;
        if (req.body.dueDate !== undefined) post.dueDate = req.body.dueDate ? new Date(req.body.dueDate) : null;
        if (req.file) post.file = req.file.filename;
        if (post.type === 'assignment') {
            // Always convert totalMarks to a number
            const totalMarks = Number(req.body.totalMarks);
            if (!totalMarks || isNaN(totalMarks) || totalMarks <= 0 || !Number.isInteger(totalMarks)) {
                return res.status(400).json({ success: false, message: 'Total Marks is required and must be a positive integer.' });
            }
            post.totalMarks = totalMarks;
        } else {
            post.totalMarks = undefined;
        }
        await post.save();
        res.json({ success: true, post });
    } catch (err) {
        console.error('Error updating post:', err);
        res.status(500).json({ success: false, message: 'Failed to update post.' });
    }
});

// Delete a post (teacher only)
router.delete('/:id', requireAuth, requireTeacher, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ success: false, message: 'Post not found.' });
        await Post.findByIdAndDelete(req.params.id);
        // If assignment, delete all related submissions
        if (post.type === 'assignment') {
            const AssignmentSubmission = require('../models/AssignmentSubmission');
            await AssignmentSubmission.deleteMany({ assignmentID: post._id });
        }
        res.json({ success: true, message: 'Post deleted.' });
    } catch (err) {
        console.error('Error deleting post:', err);
        res.status(500).json({ success: false, message: 'Failed to delete post.' });
    }
});

module.exports = router;