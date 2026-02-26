const mongoose = require("mongoose");

const citySchema = new mongoose.Schema(
    {
        cityId: {
            type: Number,
            required: true,
            unique: true
        },

        stateId: {
            type: Number,
            required: true,
            ref: "State"   // relation with State collection
        },

        cityName: {
            type: String,
            required: true,
            trim: true
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("City", citySchema);
