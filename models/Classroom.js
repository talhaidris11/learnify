const mongoose = require('mongoose');

const classroomSchema = new mongoose.Schema({
    className: { type: String, required: true },
    subject: String,
    section: String,
    classCode: { type: String, unique: true, required: true },
    teacherID: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    studentIDs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
});

module.exports = mongoose.model('Classroom', classroomSchema); 