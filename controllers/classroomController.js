const Classroom = require('../models/Classroom');
const Post = require('../models/Post');
const AssignmentSubmission = require('../models/AssignmentSubmission');

function generateClassCode(length) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

exports.createClass = async (req, res) => {
    const { className, subject, section } = req.body;
    if (!className) return res.json({ success: false, message: 'Class name is required.' });
    const classCode = generateClassCode(8);
    try {
        const classroom = await Classroom.create({
            className,
            subject,
            section,
            classCode,
            teacherID: req.session.userId,
            studentIDs: []
        });
        res.json({ success: true, classroom });
    } catch (err) {
        console.error('Create class error:', err);
        res.json({ success: false, message: 'Failed to create class.' });
    }
};

exports.joinClass = async (req, res) => {
    const { classCode } = req.body;
    try {
        const classroom = await Classroom.findOne({ classCode });
        if (!classroom) return res.json({ success: false, message: 'Invalid class code.' });
        if (classroom.studentIDs.includes(req.session.userId)) {
            return res.json({ success: false, message: 'Already joined this class.' });
        }
        classroom.studentIDs.push(req.session.userId);
        await classroom.save();
        res.json({ success: true, classroom });
    } catch (err) {
        console.error('Join class error:', err);
        res.json({ success: false, message: 'Failed to join class.' });
    }
};

exports.getMyClasses = async (req, res) => {
    try {
        if (req.session.role === 'teacher') {
            const classes = await Classroom.find({ teacherID: req.session.userId });
            res.json(classes);
        } else {
            const classes = await Classroom.find({ studentIDs: req.session.userId });
            res.json(classes);
        }
    } catch (err) {
        console.error('Get my classes error:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch classes.' });
    }
};

exports.getClass = async (req, res) => {
    try {
        if (!req.params.id || req.params.id === 'null') {
            return res.status(400).json({ success: false, message: 'Invalid class ID.' });
        }
        const classroom = await Classroom.findById(req.params.id);
        if (!classroom) {
            return res.status(404).json({ success: false, message: 'Class not found.' });
        }
        res.json(classroom);
    } catch (err) {
        console.error('Get class error:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch class.' });
    }
};

exports.deleteClass = async (req, res) => {
    try {
        const { id } = req.params;
        const classroom = await Classroom.findById(id);

        if (!classroom) {
            return res.status(404).json({ success: false, message: 'Class not found.' });
        }

        // Check if the user is the teacher of this class
        if (classroom.teacherID.toString() !== req.session.userId) {
            return res.status(403).json({ success: false, message: 'You can only delete your own classes.' });
        }

        // Delete all posts/assignments in this class
        await Post.deleteMany({ classID: id });

        // Delete all assignment submissions for this class's assignments
        const assignments = await Post.find({ classID: id, type: 'assignment' });
        const assignmentIds = assignments.map(assignment => assignment._id);
        await AssignmentSubmission.deleteMany({ assignmentID: { $in: assignmentIds } });

        // Delete the classroom
        await Classroom.findByIdAndDelete(id);

        res.json({ success: true, message: 'Class deleted successfully.' });
    } catch (err) {
        console.error('Delete class error:', err);
        res.status(500).json({ success: false, message: 'Failed to delete class.' });
    }
};

exports.leaveClass = async (req, res) => {
    try {
        const { classId } = req.body;
        if (!classId) return res.json({ success: false, message: 'Class ID required.' });
        const classroom = await Classroom.findById(classId);
        if (!classroom) return res.json({ success: false, message: 'Class not found.' });
        // Remove student from class
        classroom.studentIDs = classroom.studentIDs.filter(id => id.toString() !== req.session.userId);
        await classroom.save();
        // Delete all assignment submissions for this class by this student
        const assignments = await Post.find({ classID: classId, type: 'assignment' });
        const assignmentIds = assignments.map(a => a._id);
        await AssignmentSubmission.deleteMany({ assignmentID: { $in: assignmentIds }, studentID: req.session.userId });
        res.json({ success: true });
    } catch (err) {
        console.error('Leave class error:', err);
        res.json({ success: false, message: 'Failed to leave class.' });
    }
}; 