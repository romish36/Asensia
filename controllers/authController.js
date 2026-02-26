const User = require('../models/userModel');
const Company = require('../models/companyModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const otpGenerator = require('otp-generator');
const sendEmail = require('../utils/emailService');

// Generate JWT with userId, role, and companyId
const generateToken = (id, role, companyId = null) => {
    return jwt.sign({ id, role, companyId }, process.env.JWT_SECRET || 'secret_key_123', {
        expiresIn: '1d',
    });
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
    try {
        const { userName, userEmail, userPassword, role, companyId } = req.body;

        if (!userName || !userEmail || !userPassword) {
            return res.status(400).json({ message: 'Please add all required fields (userName, userEmail, userPassword)' });
        }

        // Check if user exists
        const userExists = await User.findOne({ userEmail });
        if (userExists) {
            return res.status(400).json({ message: 'User with this email already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(userPassword, salt);

        // Auto-increment userId
        const lastUser = await User.findOne().sort({ userId: -1 });
        const nextUserId = lastUser && lastUser.userId ? lastUser.userId + 1 : 1;

        // Create user
        const user = await User.create({
            userId: nextUserId,
            userName,
            userEmail,
            userPassword: hashedPassword,
            role: role || 'USER',
            companyId: companyId || null,
            userStatus: 1 // Default active
        });

        if (user) {
            res.status(201).json({
                _id: user.id,
                userId: user.userId,
                userName: user.userName,
                userEmail: user.userEmail,
                role: user.role,
                companyId: user.companyId,
                token: generateToken(user.id, user.role, user.companyId),
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Authenticate a user
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body; // Frontend sends 'email' and 'password' usually
        // OR should I expect userEmail? I will check both to be safe or map frontend to send keys.
        // Usually frontend Login forms send "email" and "password".

        let loginEmail = email || req.body.userEmail;
        let loginPass = password || req.body.userPassword;

        console.log('Login attempt:', { loginEmail });

        if (!loginEmail || !loginPass) {
            return res.status(400).json({ message: 'Please provide email and password' });
        }

        // Check for user email
        const user = await User.findOne({ userEmail: loginEmail });

        if (user && (await bcrypt.compare(loginPass, user.userPassword))) {

            // Check Active Status
            if (user.userStatus === 0) {
                return res.status(403).json({ message: 'Account is inactive. Please contact admin.' });
            }

            // --- Plan Expiry Check (for ADMIN and USER roles with a companyId) ---
            let planWarning = null;

            if ((user.role === 'ADMIN' || user.role === 'USER') && user.companyId) {
                const company = await Company.findById(user.companyId)
                    .select('planId planName planExpiryDate planDurationDays');

                if (company && company.planId && company.planExpiryDate) {
                    const now = new Date();
                    const expiry = new Date(company.planExpiryDate);
                    const diffMs = expiry - now;
                    const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

                    if (daysRemaining <= 0) {
                        // Plan is expired — block login
                        return res.status(403).json({
                            message: `Your plan "${company.planName || 'subscription'}" has expired. Please contact your administrator to renew the plan.`,
                            planExpired: true
                        });
                    }

                    if (daysRemaining <= 10) {
                        // Plan expiring soon — allow login but attach warning
                        planWarning = {
                            daysRemaining,
                            planName: company.planName || '',
                            planExpiryDate: company.planExpiryDate
                        };
                    }
                }
            }
            // --- End Plan Check ---

            const responsePayload = {
                _id: user.id,
                userId: user.userId,
                userName: user.userName,
                userEmail: user.userEmail,
                role: user.role,
                companyId: user.companyId,
                userProfile: user.userProfile,
                token: generateToken(user.id, user.role, user.companyId),
            };

            if (planWarning) {
                responsePayload.planWarning = planWarning;
            }

            res.json(responsePayload);
        } else {
            res.status(401).json({ message: 'Invalid credentials' });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get user data
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-userPassword');
        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ message: 'Please provide an email' });
        }

        const user = await User.findOne({ userEmail: email });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Generate OTP
        const otp = otpGenerator.generate(6, {
            upperCaseAlphabets: false,
            specialChars: false,
            lowerCaseAlphabets: false
        });

        // Save OTP to user record
        user.resetPasswordOTP = otp;
        user.resetPasswordExpires = Date.now() + 10 * 60 * 1000; // 10 minutes expiry
        await user.save();

        // Send Email
        const message = `Your password reset OTP is ${otp}. It is valid for 10 minutes.`;
        try {
            await sendEmail({
                email: user.userEmail,
                subject: 'Password Reset OTP',
                message
            });

            res.status(200).json({ message: 'OTP sent to email' });
        } catch (error) {
            user.resetPasswordOTP = undefined;
            user.resetPasswordExpires = undefined;
            await user.save();
            console.error('❌ EMAIL SENDING FAILED:', error);
            res.status(500).json({
                message: 'Error sending email. Please check your SMTP configuration in .env',
                error: error.message
            });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Reset Password
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;

        if (!email || !otp || !newPassword) {
            return res.status(400).json({ message: 'Please provide all fields' });
        }

        const user = await User.findOne({
            userEmail: email,
            resetPasswordOTP: otp,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }

        // Set new password
        const salt = await bcrypt.genSalt(10);
        user.userPassword = await bcrypt.hash(newPassword, salt);
        user.resetPasswordOTP = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.status(200).json({ message: 'Password reset successful' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    registerUser,
    loginUser,
    getMe,
    forgotPassword,
    resetPassword
};
