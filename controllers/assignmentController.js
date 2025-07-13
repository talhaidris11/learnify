const AssignmentSubmission = require('../models/AssignmentSubmission');
const User = require('../models/User');
const Post = require('../models/Post');
const Classroom = require('../models/Classroom');

// Student submits assignment
exports.submitAssignment = async (req, res) => {
    const { assignmentID } = req.body;
    const file = req.file ? req.file.filename : null;

    if (!assignmentID) {
        return res.status(400).json({ success: false, message: 'Assignment ID is required.' });
    }
    if (!file) {
        return res.status(400).json({ success: false, message: 'File is required.' });
    }
    if (!req.user || !req.user.userId) {
        return res.status(401).json({ success: false, message: 'User not authenticated.' });
    }

    try {
        const submission = await AssignmentSubmission.create({
            assignmentID,
            studentID: req.user.userId,
            file,
            submittedAt: new Date()
        });
        res.json({ success: true, submission });
    } catch (err) {
        console.error('Error submitting assignment:', err);
        res.status(500).json({ success: false, message: 'Failed to submit assignment.' });
    }
};

// Student updates submission before deadline
exports.updateAssignmentSubmission = async (req, res) => {
    const { id } = req.params;
    const file = req.file ? req.file.filename : null;

    if (!file) {
        return res.status(400).json({ success: false, message: 'Updated file is required.' });
    }

    try {
        const submission = await AssignmentSubmission.findOneAndUpdate(
            { _id: id, studentID: req.user.userId },
            { file, submittedAt: new Date() },
            { new: true }
        );

        if (!submission) {
            return res.status(404).json({ success: false, message: 'Submission not found.' });
        }

        res.json({ success: true, submission });
    } catch (err) {
        console.error('Error updating submission:', err);
        res.status(500).json({ success: false, message: 'Failed to update submission.' });
    }
};

// Student un-submits before due date
exports.unsubmitAssignment = async (req, res) => {
    const { id } = req.params;
    try {
        const deleted = await AssignmentSubmission.findOneAndDelete({
            _id: id,
            studentID: req.user.userId
        });

        if (!deleted) {
            return res.status(404).json({ success: false, message: 'Submission not found.' });
        }

        res.json({ success: true, message: 'Submission removed successfully.' });
    } catch (err) {
        console.error('Error deleting submission:', err);
        res.status(500).json({ success: false, message: 'Failed to delete submission.' });
    }
};

// Teacher gets submissions for one assignment
exports.getSubmissions = async (req, res) => {
    const { assignmentID } = req.query;

    try {
        const submissions = await AssignmentSubmission.find({ assignmentID })
            .populate('studentID', 'fullName email username seatNumber')
            .sort({ submittedAt: -1 });

        res.json(submissions);
    } catch (err) {
        console.error('Error fetching submissions:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch submissions.' });
    }
};

// Teacher gets all submissions to review (for all classes they created)
exports.getSubmissionsToReview = async (req, res) => {
    try {
        const teacherClasses = await Classroom.find({ teacherID: req.user.userId });
        const classIds = teacherClasses.map(cls => cls._id);

        const assignments = await Post.find({
            classID: { $in: classIds },
            type: 'assignment'
        }).populate('classID', 'className');

        // Use aggregation to get only the latest submission per student per assignment
        const submissions = await AssignmentSubmission.aggregate([
            { $match: { assignmentID: { $in: assignments.map(a => a._id) } } },
            { $sort: { submittedAt: -1 } },
            {
                $group: {
                    _id: { assignmentID: '$assignmentID', studentID: '$studentID' },
                    doc: { $first: '$$ROOT' }
                }
            },
            { $replaceRoot: { newRoot: '$doc' } }
        ]);

        // Populate studentID and assignmentID
        const populatedSubmissions = await AssignmentSubmission.populate(submissions, [
            { path: 'studentID', select: 'fullName name seatNumber' },
            { path: 'assignmentID', select: 'content totalMarks dueDate classID', populate: { path: 'classID', select: 'className' } }
        ]);

        const submissionsByAssignment = {};
        populatedSubmissions.forEach(sub => {
            if (!sub.assignmentID || !sub.assignmentID._id) return;
            const aid = sub.assignmentID._id.toString();
            if (!submissionsByAssignment[aid]) submissionsByAssignment[aid] = [];
            submissionsByAssignment[aid].push({
                _id: sub._id,
                studentID: {
                    fullName: sub.studentID.fullName || sub.studentID.name,
                    seatNumber: sub.studentID.seatNumber
                },
                file: sub.file,
                marks: sub.marks,
                submittedAt: sub.submittedAt
            });
        });

        const result = assignments.map(assignment => ({
            className: assignment.classID.className,
            assignmentId: assignment._id,
            assignmentTitle: assignment.content,
            totalMarks: assignment.totalMarks,
            dueDate: assignment.dueDate,
            submissions: submissionsByAssignment[assignment._id.toString()] || []
        }));

        res.json(result);
    } catch (err) {
        console.error('Error getting submissions to review:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch submissions to review.' });
    }
};

// ✅ Fixed: Renamed function to match route
exports.updateSubmissionMarks = async (req, res) => {
    try {
        const { submissionId } = req.params;
        const { marks } = req.body;

        if (marks === undefined || marks === null) {
            return res.status(400).json({ success: false, message: 'Marks are required' });
        }

        const submission = await AssignmentSubmission.findById(submissionId)
            .populate('assignmentID')
            .populate('studentID', 'fullName name seatNumber');

        if (!submission) {
            return res.status(404).json({ success: false, message: 'Submission not found' });
        }

        if (marks > submission.assignmentID.totalMarks) {
            return res.status(400).json({
                success: false,
                message: `Marks cannot exceed total marks (${submission.assignmentID.totalMarks})`
            });
        }

        submission.marks = marks;
        await submission.save();

        const updatedSubmission = await AssignmentSubmission.findById(submissionId)
            .populate('assignmentID')
            .populate('studentID', 'fullName name seatNumber');

        res.json({
            success: true,
            message: 'Marks updated successfully',
            submission: {
                _id: updatedSubmission._id,
                marks: updatedSubmission.marks,
                studentName: updatedSubmission.studentID.fullName || updatedSubmission.studentID.name,
                seatNumber: updatedSubmission.studentID.seatNumber,
                totalMarks: updatedSubmission.assignmentID.totalMarks
            }
        });
    } catch (err) {
        console.error('Error updating marks:', err);
        res.status(500).json({ success: false, message: 'Error updating marks' });
    }
};

// Student views submissions for a class
exports.getStudentSubmissionsForClass = async (req, res) => {
    try {
        const { classID } = req.query;
        if (!classID) return res.status(400).json({ success: false, message: 'classID is required' });

        const assignments = await Post.find({ classID, type: 'assignment' });
        const assignmentIds = assignments.map(a => a._id);

        const submissions = await AssignmentSubmission.find({
            assignmentID: { $in: assignmentIds },
            studentID: req.user.userId
        })
            .populate('studentID', 'fullName name seatNumber');

        res.json(submissions);
    } catch (err) {
        console.error('Error in getStudentSubmissionsForClass:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch student submissions.', error: err.message });
    }
}; 
