const mongoose = require("mongoose");

const stateSchema = new mongoose.Schema(
    {
        stateId: {
            type: Number,
            required: true,
            unique: true
        },

        countryId: {
            type: Number,
            required: true,
            ref: "Country" // relation with Country collection
        },

        stateName: {
            type: String,
            required: true,
            trim: true
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("State", stateSchema);
