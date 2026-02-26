const User = require('../models/userModel');
const bcrypt = require('bcryptjs');

// @desc    Get all users (with company separation)
// @route   GET /api/users
// @access  Private (Admin/SuperAdmin)
const getAllUsers = async (req, res) => {
    try {
        let query = {};
        const { search, page, limit, companyId } = req.query;

        if (companyId) {
            query.companyId = companyId;
        }

        // If not Super Admin, restricted to own company
        if (req.user.role !== 'SUPER_ADMIN') {
            if (!req.user.companyId) {
                return res.status(400).json({ message: 'User does not belong to a company' });
            }
            query.companyId = req.user.companyId;
            // Exclude Super Admins from list even if they somehow have same companyId (unlikely)
            query.role = { $ne: 'SUPER_ADMIN' };
        }

        if (search) {
            query.$or = [
                { userName: { $regex: search, $options: 'i' } },
                { userEmail: { $regex: search, $options: 'i' } },
                { userMobileNumber: { $regex: search, $options: 'i' } }
            ];
        }

        if (!page && !limit) {
            const users = await User.find(query)
                .select('-userPassword')
                .populate('companyId', 'companyName')
                .sort({ createdAt: -1 });
            return res.status(200).json(users);
        }

        const currentPage = parseInt(page) || 1;
        const currentLimit = parseInt(limit) || 10;
        const skip = (currentPage - 1) * currentLimit;

        const [users, total] = await Promise.all([
            User.find(query)
                .select('-userPassword')
                .populate('companyId', 'companyName')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(currentLimit),
            User.countDocuments(query)
        ]);

        res.status(200).json({
            users,
            total,
            page: currentPage,
            pages: Math.ceil(total / currentLimit)
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get current user profile
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-userPassword').populate('companyId');
        if (user) {
            res.json(user);
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update current user profile
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (user) {
            user.userName = req.body.userName || user.userName;
            user.userMobileNumber = req.body.userMobileNumber || user.userMobileNumber;
            user.userBirthdayDate = req.body.userBirthdayDate || user.userBirthdayDate;

            // Handle Profile Image
            if (req.body.userProfile) {
                user.userProfile = req.body.userProfile;
            }

            // Handle Password Update if provided
            if (req.body.userPassword) {
                const salt = await bcrypt.genSalt(10);
                user.userPassword = await bcrypt.hash(req.body.userPassword, salt);
            }

            // Note: Users cannot update their own Role, Email, or CompanyId via this endpoint for security.

            const updatedUser = await user.save();

            res.json({
                _id: updatedUser._id,
                userId: updatedUser.userId,
                userName: updatedUser.userName,
                userEmail: updatedUser.userEmail,
                role: updatedUser.role,
                companyId: updatedUser.companyId,
                userProfile: updatedUser.userProfile
                // Not generating new token for simplicity, frontend can reuse existing valid token
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Generate JWT Helper (Need to re-import or duplicate if not exported. 
// Ideally authController exports this, or we just specificy it here locally or ignore token refresh if not needed.
// For now, let's remove token refresh to avoid dependency issues or just return the user object.)
// Actually, let's just return the user object like getUserProfile.


// @desc    Create a user (Admin dashboard)
// @route   POST /api/users
// @access  Private (Admin/SuperAdmin)
const createUser = async (req, res) => {
    try {
        console.log('createUser: Start');
        // Access Control: Only Admins can create users
        if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Access denied. Admins only.' });
        }

        const { userName, userEmail, userPassword, userMobileNumber, role, companyId, userStatus, userProfile } = req.body;
        console.log('createUser: Body parsed', { userEmail });

        if (!userName || !userEmail || !userPassword) {
            return res.status(400).json({ message: 'Please provide Name, Email, and Password' });
        }

        // Check exists
        const userExists = await User.findOne({ userEmail });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }
        console.log('createUser: User does not exist');

        // Determine Company ID
        let targetCompanyId = companyId;
        if (req.user.role !== 'SUPER_ADMIN') {
            targetCompanyId = req.user.companyId; // Enforce own company
        }

        // Hash Password
        console.log('createUser: Hashing password');
        const salt = await bcrypt.genSalt(10);
        console.log('createUser: Salt generated');
        const hashedPassword = await bcrypt.hash(userPassword, salt);
        console.log('createUser: Password hashed');

        // Auto-increment userId
        const lastUser = await User.findOne().sort({ userId: -1 });
        const nextUserId = lastUser && lastUser.userId ? lastUser.userId + 1 : 1;
        console.log('createUser: Next ID', nextUserId);

        const newUserPayload = {
            userId: nextUserId,
            userName,
            userEmail,
            userPassword: hashedPassword,
            userMobileNumber,
            role: role || 'USER',
            companyId: targetCompanyId,
            userStatus: userStatus !== undefined ? userStatus : 1,
            userProfile
        };
        console.log('createUser: Creating user with payload', newUserPayload);

        const newUser = await User.create(newUserPayload);
        console.log('createUser: User created');

        res.status(201).json(newUser);
    } catch (error) {
        console.error('createUser: Error caught', error); // Log full error object
        console.error('createUser: Stack trace', error.stack);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private (Admin/SuperAdmin)
const updateUser = async (req, res) => {
    try {
        // Access Control: Only Admins can update users
        if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Access denied. Admins only.' });
        }

        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Access Control
        if (req.user.role !== 'SUPER_ADMIN') {
            if (user.companyId && user.companyId.toString() !== req.user.companyId.toString()) {
                return res.status(403).json({ message: 'Access denied: User belongs to another company' });
            }
        }

        // Handle Password Update
        if (req.body.userPassword) {
            const salt = await bcrypt.genSalt(10);
            req.body.userPassword = await bcrypt.hash(req.body.userPassword, salt);
        } else {
            // Prevent overwriting with empty
            delete req.body.userPassword;
        }

        const updatedUser = await User.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        ).select('-userPassword');

        res.status(200).json(updatedUser);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private (Admin/SuperAdmin)
const deleteUser = async (req, res) => {
    try {
        // Access Control: Only Admins can delete users
        if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Access denied. Admins only.' });
        }

        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Access Control
        if (req.user.role !== 'SUPER_ADMIN') {
            if (user.companyId && user.companyId.toString() !== req.user.companyId.toString()) {
                return res.status(403).json({ message: 'Access denied' });
            }
        }

        await user.deleteOne();
        res.status(200).json({ message: 'User removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getAllUsers,
    getUserProfile,
    updateUserProfile,
    createUser,
    updateUser,
    deleteUser
};
