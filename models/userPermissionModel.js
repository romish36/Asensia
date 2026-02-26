const mongoose = require("mongoose");

const userPermissionSchema = new mongoose.Schema({
    userId: {
        type: Number,
        required: true,
        unique: true
    },

    permissions: {
        type: Map,
        of: mongoose.Schema.Types.Mixed
    }

}, { timestamps: true });

module.exports = mongoose.model("UserPermissions", userPermissionSchema);
