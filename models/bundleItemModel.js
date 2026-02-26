const mongoose = require("mongoose");

const bundleItemSchema = new mongoose.Schema({
    bundleItemId: {
        type: Number
    },

    productBundleId: {
        type: Number
    },

    productId: {
        type: Number
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

}, {
    timestamps: true
});

module.exports = mongoose.model("bundleItem", bundleItemSchema);
