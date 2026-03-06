const Chat = require('./models/chatModel');
const jwt = require('jsonwebtoken');
const User = require('./models/userModel');

const socketHandler = (io) => {
    // Map to track online users and their sockets to prevent duplicates if needed
    // However, Socket.IO rooms are more scalable for this purpose

    io.on('connection', (socket) => {
        let currentUserId = null;

        socket.on('joinRoom', async ({ token, roomId }) => {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key_123');
                const user = await User.findById(decoded.id);

                if (!user) {
                    return socket.emit('error', 'Authentication failed');
                }

                currentUserId = user._id.toString();

                // Room authorization logic
                let authorized = false;
                if (user.role === 'SUPER_ADMIN') {
                    if (roomId.startsWith('superadmin_companyadmin_')) authorized = true;
                } else if (user.role === 'ADMIN') { // Company Admin
                    if (roomId.startsWith(`superadmin_companyadmin_${user._id}`)) authorized = true;
                    if (roomId.startsWith(`company_${user.companyId}_admin_user_`)) authorized = true;
                } else { // Regular User
                    if (roomId === `company_${user.companyId}_admin_user_${user._id}`) authorized = true;
                    if (roomId.startsWith(`company_${user.companyId}_user_`) && roomId.includes(`_user_${user._id}`)) authorized = true;
                }

                if (authorized) {
                    socket.join(roomId);
                    // console.log(`User ${user.userName} joined room: ${roomId}`);
                } else {
                    socket.emit('error', 'Unauthorized to join this room');
                }
            } catch (err) {
                socket.emit('error', 'Invalid token');
            }
        });

        socket.on('identify', async (token) => {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key_123');
                currentUserId = decoded.id;
                socket.join(`user_${decoded.id}`);
            } catch (err) {
                socket.emit('error', 'Identification failed');
            }
        });

        // Typing Indicator
        socket.on('typing', ({ roomId, userName }) => {
            socket.to(roomId).emit('userTyping', { roomId, userName });
        });

        socket.on('stopTyping', ({ roomId, userName }) => {
            socket.to(roomId).emit('userStoppedTyping', { roomId, userName });
        });

        socket.on('sendMessage', async (data) => {
            try {
                const { token, roomId, message, receiverId, receiverRole, fileUrl, fileType, fileName, fileSize } = data;

                // Prevent empty messages unless there's a file
                if (!message && !fileUrl) return;

                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key_123');
                const sender = await User.findById(decoded.id);

                if (!sender) return;

                const chatMessage = await Chat.create({
                    senderId: sender._id,
                    senderRole: sender.role === 'SUPER_ADMIN' ? 'superAdmin' : (sender.role === 'ADMIN' ? 'companyAdmin' : 'user'),
                    receiverId,
                    receiverRole,
                    companyId: sender.companyId,
                    message,
                    fileUrl,
                    fileType: fileType || 'text',
                    fileName,
                    fileSize,
                    roomId,
                    isDelivered: true // Assume delivered when successfully handled by server
                });

                // Populate sender info for the frontend
                const populatedMessage = await Chat.findById(chatMessage._id)
                    .populate('senderId', 'userName role userProfile')
                    .populate('receiverId', 'userName role userProfile');


                io.to(roomId).emit('receiveMessage', populatedMessage);

                // Notify the receiver about new unread message globally if not in room
                io.to(`user_${receiverId}`).emit('unreadUpdate', {
                    roomId,
                    senderId: sender._id,
                    message: populatedMessage
                });
            } catch (err) {
                console.error('Socket error:', err);
            }
        });

        socket.on('markRead', ({ token, roomId }) => {
            try {
                if (!token) return;
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key_123');

                // Notify others in the room that messages have been read
                if (roomId) {
                    socket.to(roomId).emit('messagesRead', { roomId, readBy: decoded.id });
                }

                // Also trigger unread count update for the user themselves
                io.to(`user_${decoded.id}`).emit('unreadCleared');
            } catch (err) {
                console.error('markRead socket error:', err);
            }
        });

        socket.on('deleteMessage', ({ token, roomId, messageId, deleteType }) => {
            try {
                if (!token) return;
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key_123');

                if (roomId) {
                    // Notify everyone in the room about the deletion
                    socket.to(roomId).emit('messageDeleted', {
                        messageId,
                        roomId,
                        deleteType,
                        deletedBy: decoded.id
                    });
                }
            } catch (err) {
                console.error('deleteMessage socket error:', err);
            }
        });

        socket.on('editMessage', ({ token, roomId, messageId, newMessage }) => {
            try {
                if (!token) return;
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key_123');

                if (roomId) {
                    socket.to(roomId).emit('messageEdited', {
                        messageId,
                        roomId,
                        newMessage,
                        editedBy: decoded.id
                    });
                }
            } catch (err) {
                console.error('editMessage socket error:', err);
            }
        });



        socket.on('disconnect', () => {
            // Can handle cleanup here if using a custom user map
        });
    });
};

module.exports = socketHandler;

