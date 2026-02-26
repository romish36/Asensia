const mongoose = require("mongoose");

const dataTableSchema = new mongoose.Schema(
    {
        dataTableId: {
            type: Number,
            required: true,
            unique: true
        },

        dataTableName: {
            type: String,
            required: true,
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

module.exports = mongoose.model("DataTable", dataTableSchema);
