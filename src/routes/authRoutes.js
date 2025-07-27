const express = require('express');
const { signup, login } = require('../controllers/authController');
const { signupValidation, loginValidation, handleValidationErrors } = require('../middleware/validation');

const router = express.Router();

router.post('/signup', signupValidation, handleValidationErrors, signup);
router.post('/login', loginValidation, handleValidationErrors, login);

module.exports = router;
