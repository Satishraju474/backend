const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = mongoose.Schema({
    username: { type: String, required: true, unique: true }, // USN for students, EmpID for staff
    password: { type: String, required: true },
    role: {
        type: String,
        enum: ['student', 'admin', 'principal', 'exam_head', 'transport_dept', 'registrar'],
        required: true
    },
    name: { type: String, required: true },
    email: { type: String },
    photoUrl: { type: String, default: '' }
}, { timestamps: true });

// Check if password matches
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

module.exports = mongoose.model('User', userSchema);
