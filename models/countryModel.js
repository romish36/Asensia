const mongoose = require("mongoose");

const countrySchema = new mongoose.Schema(
    {
        countryId: {
            type: Number,
            required: true,
            unique: true
        },

        countryName: {
            type: String,
            required: true,
            trim: true
        },

        countryCode: {
            type: String,
            required: true,
            uppercase: true,
            trim: true
        },

        // For consistency with other models if needed
        active: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Country", countrySchema);
