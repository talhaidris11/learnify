const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    username: { type: String, unique: true, required: true },
    fullName: { type: String, required: true },
    gender: { type: String, enum: ['male', 'female'], required: true },
    role: { type: String, enum: ['student', 'teacher'], required: true },
    passwordHash: { type: String, required: true },
    seatNumber: {
        type: String,
        required: function () { return this.role === 'student'; }
    }
});

// Helper for password hashing
userSchema.methods.setPassword = async function (password) {
    this.passwordHash = await bcrypt.hash(password, 10);
};

userSchema.methods.validatePassword = async function (password) {
    return bcrypt.compare(password, this.passwordHash);
};

// Alias for compatibility with authController
userSchema.methods.comparePassword = userSchema.methods.validatePassword;

module.exports = mongoose.model('User', userSchema); 