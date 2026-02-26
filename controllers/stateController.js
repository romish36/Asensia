const State = require("../models/stateModel");

// Get next ID
const getNextId = async () => {
    const lastDoc = await State.findOne().sort({ stateId: -1 });
    return lastDoc && lastDoc.stateId ? lastDoc.stateId + 1 : 1;
};

// Create State
const createState = async (req, res) => {
    try {
        const { stateName, countryId } = req.body;

        if (!stateName || !countryId) {
            return res.status(400).json({ message: "State Name and Country ID are required" });
        }

        const existingState = await State.findOne({
            stateName: stateName,
            countryId: countryId
        });
        if (existingState) {
            return res.status(400).json({ message: "State already exists for this country" });
        }

        const nextId = await getNextId();
        const newState = new State({
            stateId: nextId,
            countryId,
            stateName
        });

        await newState.save();
        res.status(201).json({ message: "State created successfully", state: newState });

    } catch (error) {
        res.status(500).json({ message: "Failed to create state", error: error.message });
    }
};

// Get States
const getStates = async (req, res) => {
    try {
        const { countryId } = req.query;
        let filter = {};

        // Use == to allow both string and number comparison as countryId is a Number in schema
        if (countryId) {
            filter.countryId = countryId;
        }

        const states = await State.find(filter).sort({ stateName: 1 });
        res.status(200).json(states);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch states", error: error.message });
    }
};

module.exports = {
    createState,
    getStates
};
