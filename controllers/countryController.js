const Country = require("../models/countryModel");

// Get next ID
const getNextId = async () => {
    const lastDoc = await Country.findOne().sort({ countryId: -1 });
    return lastDoc && lastDoc.countryId ? lastDoc.countryId + 1 : 1;
};

// Create Country
const createCountry = async (req, res) => {
    try {
        const { countryName, countryCode } = req.body;

        if (!countryName || !countryCode) {
            return res.status(400).json({ message: "Country Name and Code are required" });
        }

        const existingCountry = await Country.findOne({
            $or: [{ countryName: countryName }, { countryCode: countryCode }]
        });
        if (existingCountry) {
            return res.status(400).json({ message: "Country already exists" });
        }

        const nextId = await getNextId();
        const newCountry = new Country({
            countryId: nextId,
            countryName,
            countryCode
        });

        await newCountry.save();
        res.status(201).json({ message: "Country created successfully", country: newCountry });

    } catch (error) {
        res.status(500).json({ message: "Failed to create country", error: error.message });
    }
};

// Get All Countries
const getCountries = async (req, res) => {
    try {
        // Return all active countries, sorted by name
        const countries = await Country.find({ active: { $ne: false } }).sort({ countryName: 1 });
        res.status(200).json(countries);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch countries", error: error.message });
    }
};

module.exports = {
    createCountry,
    getCountries
};
