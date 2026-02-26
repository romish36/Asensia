const Chat = require('../models/chatModel');
const User = require('../models/userModel');

// @desc    Get chat history for a specific room
// @route   GET /api/chat/history/:roomId
const getChatHistory = async (req, res) => {
    try {
        const messages = await Chat.find({ roomId: req.params.roomId })
            .sort({ createdAt: 1 })
            .populate('senderId', 'userName role')
            .populate('receiverId', 'userName role');
        res.status(200).json(messages);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get users/admins to chat with based on role
// @route   GET /api/chat/partners
const getChatPartners = async (req, res) => {
    try {
        const { role, companyId, _id } = req.user;
        let partners = [];

        if (role === 'SUPER_ADMIN') {
            // Super Admin can chat with all Company Admins
            partners = await User.find({ role: 'ADMIN' })
                .select('userName role companyId')
                .populate('companyId', 'companyName');
        } else if (role === 'ADMIN') {
            // Company Admin can chat with their company users AND Super Admin
            const companyUsers = await User.find({
                companyId: companyId,
                role: 'USER',
                _id: { $ne: _id }
            }).select('userName role');

            const superAdmins = await User.find({ role: 'SUPER_ADMIN' }).select('userName role');

            partners = [
                ...companyUsers.map(u => ({ ...u._doc, partnerType: 'USER' })),
                ...superAdmins.map(s => ({ ...s._doc, partnerType: 'SUPER_ADMIN' }))
            ];
        } else {
            // Company User can chat with their Company Admin AND colleagues
            const companyAdmins = await User.find({
                companyId: companyId,
                role: 'ADMIN'
            }).select('userName role');

            const colleagues = await User.find({
                companyId: companyId,
                role: 'USER',
                _id: { $ne: _id }
            }).select('userName role');

            partners = [
                ...companyAdmins.map(a => ({ ...a._doc, partnerType: 'ADMIN' })),
                ...colleagues.map(c => ({ ...c._doc, partnerType: 'USER' }))
            ];
        }

        // Fetch unread counts for each partner
        const partnersWithUnread = await Promise.all(partners.map(async (p) => {
            const partnerId = p._id || p.id;
            const unreadCount = await Chat.countDocuments({
                senderId: partnerId,
                receiverId: _id,
                isRead: false
            });
            return { ...(p._doc || p), unreadCount };
        }));

        res.status(200).json(partnersWithUnread);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Mark all messages in a room as read for the current user
// @route   PUT /api/chat/read/:roomId
const markAsRead = async (req, res) => {
    try {
        const { roomId } = req.params;
        const { _id } = req.user;

        await Chat.updateMany(
            { roomId, receiverId: _id, isRead: false },
            { $set: { isRead: true } }
        );

        res.status(200).json({ message: 'Messages marked as read' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get total unread count for the logged-in user
// @route   GET /api/chat/unread-count
const getTotalUnreadCount = async (req, res) => {
    try {
        const { _id } = req.user;
        const count = await Chat.countDocuments({ receiverId: _id, isRead: false });
        res.status(200).json({ count });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getChatHistory,
    getChatPartners,
    markAsRead,
    getTotalUnreadCount
};
