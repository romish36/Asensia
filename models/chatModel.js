const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema(
    {
        senderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        senderRole: {
            type: String,
            required: true,
            enum: ['user', 'companyAdmin', 'superAdmin']
        },
        receiverId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        receiverRole: {
            type: String,
            required: true,
            enum: ['user', 'companyAdmin', 'superAdmin']
        },
        companyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Company'
        },
        message: {
            type: String,
            required: true,
            trim: true
        },
        roomId: {
            type: String,
            required: true,
            index: true
        },
        isRead: {
            type: Boolean,
            default: false
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model('Chat', chatSchema);
