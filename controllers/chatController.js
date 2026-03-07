const Chat = require('../models/chatModel');
const User = require('../models/userModel');

// @desc    Get chat history for a specific room
// @route   GET /api/chat/history/:roomId
const getChatHistory = async (req, res) => {
    try {
        const { _id } = req.user;
        const messages = await Chat.find({
            roomId: req.params.roomId,
            deletedBy: { $ne: _id },
            isDeletedForEveryone: { $ne: true }
        })
            .sort({ createdAt: 1 })
            .populate('senderId', 'userName role userProfile')
            .populate('receiverId', 'userName role userProfile');
        res.status(200).json(messages);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getRoomId = (me, partner) => {
    if (!me || !partner) return '';
    const pId = partner._id || partner.id;
    if (me.role === 'SUPER_ADMIN') {
        return `superadmin_companyadmin_${pId}`;
    }
    if (partner.role === 'SUPER_ADMIN') {
        return `superadmin_companyadmin_${me._id}`;
    }
    if (me.role === 'USER' && partner.role === 'USER') {
        const ids = [me._id.toString(), pId.toString()].sort();
        return `company_${me.companyId}_user_${ids[0]}_user_${ids[1]}`;
    }
    const userId = me.role === 'USER' ? me._id : pId;
    const companyId = me.companyId || (partner.companyId?._id || partner.companyId);
    return `company_${companyId}_admin_user_${userId}`;
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
                .select('userName role companyId userProfile')
                .populate('companyId', 'companyName');
        } else if (role === 'ADMIN') {
            // Company Admin can chat with their company users AND Super Admin
            const companyUsers = await User.find({
                companyId: companyId,
                role: 'USER',
                _id: { $ne: _id }
            }).select('userName role companyId userProfile').populate('companyId', 'companyName');

            const superAdmins = await User.find({ role: 'SUPER_ADMIN' }).select('userName role userProfile');

            partners = [
                ...companyUsers.map(u => ({ ...u._doc, partnerType: 'USER' })),
                ...superAdmins.map(s => ({ ...s._doc, partnerType: 'SUPER_ADMIN' }))
            ];
        } else {
            // Company User can chat with their Company Admin AND colleagues
            const companyAdmins = await User.find({
                companyId: companyId,
                role: 'ADMIN'
            }).select('userName role companyId userProfile').populate('companyId', 'companyName');

            const colleagues = await User.find({
                companyId: companyId,
                role: 'USER',
                _id: { $ne: _id }
            }).select('userName role companyId userProfile').populate('companyId', 'companyName');

            partners = [
                ...companyAdmins.map(a => ({ ...a._doc, partnerType: 'ADMIN' })),
                ...colleagues.map(c => ({ ...c._doc, partnerType: 'USER' }))
            ];
        }

        // Fetch unread counts AND last message date for each partner
        const partnersWithUnread = await Promise.all(partners.map(async (p) => {
            const partnerId = p._id || p.id;
            const roomId = getRoomId(req.user, p);
            const latestMessage = await Chat.findOne({ roomId }).sort({ createdAt: -1 }).select('createdAt');
            const unreadCount = await Chat.countDocuments({
                senderId: partnerId,
                receiverId: _id,
                isRead: false
            });
            return {
                ...(p._doc || p),
                unreadCount,
                lastMessageDate: latestMessage ? latestMessage.createdAt : new Date(0)
            };
        }));

        // Sort by last message date descending (most recent first)
        partnersWithUnread.sort((a, b) => new Date(b.lastMessageDate) - new Date(a.lastMessageDate));

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

// @desc    Upload chat file
// @route   POST /api/chat/upload
const uploadFile = async (req, res) => {
    try {
        console.log('Upload request received');
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const fileType = req.file.mimetype.split('/')[0];
        let chatFileType = 'other';

        if (fileType === 'image') chatFileType = 'image';
        else if (fileType === 'video') chatFileType = 'video';
        else if (req.file.mimetype.includes('pdf') || req.file.mimetype.includes('word') || req.file.mimetype.includes('excel')) chatFileType = 'document';

        // Normalize path for URL and force it to be relative starting from 'uploads'
        let normalizedPath = req.file.path.replace(/\\/g, '/');

        // If the path is absolute or has the full local path, we need to extract the relative part
        if (normalizedPath.includes('uploads/')) {
            normalizedPath = 'uploads/' + normalizedPath.split('uploads/')[1];
        }

        res.status(200).json({
            fileUrl: normalizedPath,
            fileType: chatFileType,
            fileName: req.file.originalname,
            fileSize: req.file.size
        });

    } catch (error) {
        console.error('Upload Error in Controller:', error);
        res.status(500).json({ message: error.message });
    }

};

// @desc    Delete message (Delete for me or Delete for everyone)
// @route   DELETE /api/chat/delete/:messageId
const deleteMessage = async (req, res) => {
    try {
        const { messageId } = req.params;
        const { deleteType } = req.query; // 'me' or 'everyone'
        const { _id } = req.user;

        const message = await Chat.findById(messageId);
        if (!message) {
            return res.status(404).json({ message: 'Message not found' });
        }

        if (deleteType === 'everyone') {
            // Only sender can delete for everyone
            if (message.senderId.toString() !== _id.toString()) {
                return res.status(403).json({ message: 'Only sender can delete for everyone' });
            }

            // Check if within 5 minutes
            const now = new Date();
            const sentAt = new Date(message.createdAt);
            const diffInMinutes = (now - sentAt) / (1000 * 60);

            if (diffInMinutes > 5) {
                return res.status(400).json({ message: 'Time limit (5 min) exceeded for "Delete for Everyone"' });
            }

            message.isDeletedForEveryone = true;
            await message.save();
        } else {
            // Delete for me
            if (!message.deletedBy.some(id => id.equals(_id))) {
                message.deletedBy.push(_id);
                await message.save();
            }
        }

        res.status(200).json({
            messageId,
            roomId: message.roomId,
            isDeletedForEveryone: message.isDeletedForEveryone,
            deletedFor: deleteType === 'me' ? _id : 'everyone'
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Edit message
// @route   PUT /api/chat/edit/:messageId
const editMessage = async (req, res) => {
    try {
        const { messageId } = req.params;
        const { newMessage } = req.body;
        const { _id } = req.user;

        const message = await Chat.findById(messageId);
        if (!message) {
            return res.status(404).json({ message: 'Message not found' });
        }

        // Only sender can edit
        if (message.senderId.toString() !== _id.toString()) {
            return res.status(403).json({ message: 'Only sender can edit their message' });
        }

        // Check if message is not too old (5-min rule)
        const now = new Date();
        const sentAt = new Date(message.createdAt);
        const diffInMinutes = (now - sentAt) / (1000 * 60);

        if (diffInMinutes > 5) {
            return res.status(400).json({ message: 'Time limit (5 min) exceeded for editing' });
        }

        message.message = newMessage;
        message.isEdited = true;
        await message.save();

        res.status(200).json(message);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getChatHistory,
    getChatPartners,
    markAsRead,
    getTotalUnreadCount,
    uploadFile,
    deleteMessage,
    editMessage
};
