const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
    type: { type: String, enum: ['announcement', 'assignment'], required: true },
    content: { type: String, required: true },
    file: String,
    dueDate: { type: Date, default: null }, // For assignments only
    totalMarks: { type: Number, min: 1 }, // For assignments only
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    classID: { type: mongoose.Schema.Types.ObjectId, ref: 'Classroom', required: true },
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Post', postSchema); 