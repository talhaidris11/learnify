const mongoose = require('mongoose');

const assignmentSubmissionSchema = new mongoose.Schema({
    assignmentID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post',
        required: true
    },
    studentID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    file: {
        type: String,
        required: true
    },
    submittedAt: {
        type: Date,
        default: Date.now
    },
    marks: {
        type: Number,
        min: 0,
        validate: {
            validator: function (value) {
                return value === undefined || value === null || value >= 0;
            },
            message: 'Marks cannot be negative'
        }
    }
});

module.exports = mongoose.model('AssignmentSubmission', assignmentSubmissionSchema); 