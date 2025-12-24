const express = require('express');
const router = express.Router();
const { issueBook, returnBook, getMyBooks, getStudentLibraryHistory } = require('../controllers/libraryController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.post('/issue', protect, authorize('librarian', 'admin'), issueBook);
router.post('/return', protect, authorize('librarian', 'admin'), returnBook);
router.get('/my-books', protect, authorize('student'), getMyBooks);
router.get('/student/:usn', protect, authorize('librarian', 'admin'), getStudentLibraryHistory);

module.exports = router;
