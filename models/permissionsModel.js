const mongoose = require("mongoose");

const permissionsSchema = new mongoose.Schema(
    {
        permissionsId: {
            type: Number
        },

        permissionsName: {
            type: String,
            trim: true
        },

        date: {
            type: String
        },

        time: {
            type: String
        },

        insertId: {
            type: Number
        },

        updateId: {
            type: Number
        },

        deleteId: {
            type: Number
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Permissions", permissionsSchema);
