const Chat = require('./models/chatModel');
const jwt = require('jsonwebtoken');
const User = require('./models/userModel');

const socketHandler = (io) => {
    io.on('connection', (socket) => {
        // console.log('A user connected:', socket.id);

        socket.on('joinRoom', async ({ token, roomId }) => {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key_123');
                const user = await User.findById(decoded.id);

                if (!user) {
                    return socket.emit('error', 'Authentication failed');
                }

                // Room authorization logic
                // company_<companyId>_admin_user_<userId>
                // superadmin_companyadmin_<companyAdminId>

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
                socket.join(`user_${decoded.id}`);
            } catch (err) {
                socket.emit('error', 'Identification failed');
            }
        });

        socket.on('sendMessage', async (data) => {
            try {
                const { token, roomId, message, receiverId, receiverRole } = data;
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
                    roomId
                });

                io.to(roomId).emit('receiveMessage', chatMessage);

                // Notify the receiver about new unread message
                io.to(`user_${receiverId}`).emit('unreadUpdate', {
                    roomId,
                    senderId: sender._id,
                    message: chatMessage
                });
            } catch (err) {
                console.error('Socket error:', err);
            }
        });

        socket.on('markRead', (token) => {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key_123');
                // Notify all of this user's connections to refresh unread count
                io.to(`user_${decoded.id}`).emit('unreadCleared');
            } catch (err) { }
        });

        socket.on('disconnect', () => {
            // console.log('User disconnected');
        });
    });
};

module.exports = socketHandler;
