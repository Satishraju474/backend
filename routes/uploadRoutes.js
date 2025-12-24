const express = require('express');
const router = express.Router();
const upload = require('../middlewares/uploadMiddleware');
const { protect } = require('../middlewares/authMiddleware');
const User = require('../models/User');
const path = require('path');

// @desc    Upload profile photo
// @route   POST /api/upload/profile-photo
// @access  Private
router.post('/profile-photo', protect, upload.single('photo'), async (req, res) => {
    console.log('Upload Request Received');
    console.log('Req Body:', req.body);
    console.log('Req File:', req.file);
    try {
        if (!req.file) {
            console.log('No file received');
            return res.status(400).json({ message: 'Please upload a file' });
        }

        // Generate full URL
        // const photoUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`; // For prod with proper static serving
        // Or simpler relative path if serving from root
        const photoUrl = `/uploads/${req.file.filename}`;

        // Update user
        const user = await User.findById(req.user._id);
        if (user) {
            user.photoUrl = photoUrl;
            await user.save();
            res.json({ photoUrl: photoUrl, message: 'Photo uploaded successfully' });
        } else {
            res.status(404).json({ message: 'User not found' });
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error during upload' });
    }
});

module.exports = router;
