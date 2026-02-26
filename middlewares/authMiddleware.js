const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

const authMiddleware = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Get token from header
            token = req.headers.authorization.split(' ')[1];

            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key_123');

            // Find user from the database (including role and companyId from DB or token)
            // Attaching decoded payload + checking DB ensures user still exists and hasn't had role changed
            req.user = await User.findById(decoded.id).select('-userPassword');

            if (!req.user) {
                return res.status(401).json({ message: 'Not authorized, user not found' });
            }

            return next();
        } catch (error) {
            console.error('Auth middleware error:', error);
            return res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token' });
    }
};

module.exports = authMiddleware;
