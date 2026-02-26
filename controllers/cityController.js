const City = require("../models/cityModel");

// Get next ID
const getNextId = async () => {
    const lastDoc = await City.findOne().sort({ cityId: -1 });
    return lastDoc && lastDoc.cityId ? lastDoc.cityId + 1 : 1;
};

// Create City
const createCity = async (req, res) => {
    try {
        const { cityName, stateId } = req.body;

        if (!cityName || !stateId) {
            return res.status(400).json({ message: "City Name and State ID are required" });
        }

        const existingCity = await City.findOne({
            cityName: cityName,
            stateId: stateId
        });
        if (existingCity) {
            return res.status(400).json({ message: "City already exists for this state" });
        }

        const nextId = await getNextId();
        const newCity = new City({
            cityId: nextId,
            stateId,
            cityName
        });

        await newCity.save();
        res.status(201).json({ message: "City created successfully", city: newCity });

    } catch (error) {
        res.status(500).json({ message: "Failed to create city", error: error.message });
    }
};

// Get Cities
const getCities = async (req, res) => {
    try {
        const { stateId } = req.query;
        let filter = {};

        if (stateId) {
            filter.stateId = stateId;
        }

        const cities = await City.find(filter).sort({ cityName: 1 });
        res.status(200).json(cities);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch cities", error: error.message });
    }
};

module.exports = {
    createCity,
    getCities
};
