const express = require('express');
const router = express.Router();
const { register, login, refreshToken, logout,forgotPassword, resetPassword } = require('../controllers/authController');
const { body, validationResult } = require('express-validator')
const queries = require('../queries/queries')

//registo com validaçao, email e password forte
router.post(
    '/register',

    // Username must not be empty and must be unique
    body('username')
        .notEmpty()
        .withMessage('Username is required')
        .bail()
        .custom(async username => {
            const exists = await queries.obterUtilizadorPorUsername(username)
            if (exists) throw new Error('Username already in use!')
            return true
        }),

    // Email must be valid format and unique
    body('email')
        .isEmail()
        .withMessage('Invalid email format.')
        .bail()
        .custom(async email => {
            const exists = await queries.obterUtilizadorPorEmail(email)
            if (exists) throw new Error('Email already registered!')
            return true
        }),

    // Password strength requirements
    body('password')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters long.')
        .matches(/[A-Z]/)
        .withMessage('Password must contain at least one uppercase letter.')
        .matches(/[a-z]/)
        .withMessage('Password must contain at least one lowercase letter.')
        .matches(/[0-9]/)
        .withMessage('Password must contain at least one number.'),

    // Collect validation errors
    (req, res, next) => {
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() })
        }
        next()
    },
    // 3) se tudo OK, chama o teu controller
    register
)

//router.post('/register', register);
router.post('/login',    login);
router.post('/refresh',  refreshToken);
router.post('/logout',   logout);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
module.exports = router;
