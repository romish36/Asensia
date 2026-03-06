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
            trim: true
        },
        fileUrl: {
            type: String,
            default: null
        },
        fileType: {
            type: String,
            enum: ['text', 'image', 'video', 'document', 'other'],
            default: 'text'
        },
        fileName: {
            type: String,
            default: null
        },
        fileSize: {
            type: Number,
            default: null
        },
        roomId: {
            type: String,
            required: true,
            index: true
        },
        isRead: {
            type: Boolean,
            default: false
        },
        isDelivered: {
            type: Boolean,
            default: false
        },
        deletedBy: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }],
        isDeletedForEveryone: {
            type: Boolean,
            default: false
        },
        isEdited: {
            type: Boolean,
            default: false
        }
    },
    { timestamps: true }
);


module.exports = mongoose.model('Chat', chatSchema);

