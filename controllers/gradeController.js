const Grade = require("../models/gradeModel");
const mongoose = require("mongoose");

// Helper to get next ID
const getNextId = async () => {
    const lastDoc = await Grade.findOne().sort({ gradeId: -1 });
    return lastDoc && lastDoc.gradeId ? lastDoc.gradeId + 1 : 1;
};

// CREATE Grade
const createGrade = async (req, res) => {
    try {
        const { gradeName, companyId } = req.body;

        if (!gradeName) {
            return res.status(400).json({ message: "Grade Name is required" });
        }

        const nextId = await getNextId();

        // Scope company
        let finalCompanyId;
        if (req.user.role === 'SUPER_ADMIN') {
            finalCompanyId = companyId;
            if (!finalCompanyId) return res.status(400).json({ message: "Company ID required for Super Admin" });
        } else {
            finalCompanyId = req.user.companyId;
        }

        // Check if grade already exists for this company
        const existingGrade = await Grade.findOne({
            gradeName: { $regex: new RegExp(`^${gradeName}$`, 'i') },
            companyId: finalCompanyId
        });

        if (existingGrade) {
            return res.status(400).json({ message: "Grade already exists" });
        }

        const newGrade = new Grade({
            gradeId: nextId,
            gradeName,
            companyId: finalCompanyId,
            date: new Date().toLocaleDateString(),
            time: new Date().toLocaleTimeString(),
            // insertId: req.user.id // Removed: Type mismatch (ObjectId string vs Number)
        });

        console.log("Saving Grade:", newGrade);
        await newGrade.save();
        console.log("Grade saved successfully");
        res.status(201).json({ message: "Grade created successfully", grade: newGrade });

    } catch (error) {
        console.error("Create Grade Error:", error);
        res.status(500).json({ message: "Failed to create grade", error: error.message });
    }
};

// GET All Grades (Company Scoped)
const getGrades = async (req, res) => {
    try {
        const query = {};
        const { search, companyId, page, limit } = req.query;

        if (req.user.role !== 'SUPER_ADMIN') {
            query.companyId = req.user.companyId;
        } else if (companyId) {
            query.companyId = companyId;
        }

        if (search) {
            query.gradeName = { $regex: search, $options: 'i' };
        }

        if (!page && !limit) {
            const grades = await Grade.find(query).sort({ gradeName: 1 });
            return res.status(200).json(grades);
        }

        const currentPage = parseInt(page) || 1;
        const currentLimit = parseInt(limit) || 10;
        const skip = (currentPage - 1) * currentLimit;

        const [grades, total] = await Promise.all([
            Grade.find(query).sort({ gradeName: 1 }).skip(skip).limit(currentLimit),
            Grade.countDocuments(query)
        ]);

        res.status(200).json({
            grades,
            total,
            page: currentPage,
            pages: Math.ceil(total / currentLimit)
        });

    } catch (error) {
        console.error("Get Grades Error:", error);
        res.status(500).json({ message: "Failed to fetch grades", error: error.message });
    }
};

// UPDATE Grade
const updateGrade = async (req, res) => {
    try {
        const { id } = req.params;
        const { gradeName } = req.body;

        const grade = await Grade.findById(id);
        if (!grade) return res.status(404).json({ message: "Grade not found" });

        // Permission Check
        if (req.user.role !== 'SUPER_ADMIN' && grade.companyId.toString() !== req.user.companyId.toString()) {
            return res.status(403).json({ message: "Access denied" });
        }

        // Check if new name already exists
        if (gradeName && gradeName.toLowerCase() !== grade.gradeName.toLowerCase()) {
            const existingGrade = await Grade.findOne({
                gradeName: { $regex: new RegExp(`^${gradeName}$`, 'i') },
                companyId: grade.companyId,
                _id: { $ne: id }
            });
            if (existingGrade) {
                return res.status(400).json({ message: "Grade Name already exists" });
            }
        }

        const updatedGrade = await Grade.findByIdAndUpdate(
            id,
            { gradeName },
            { new: true }
        );

        res.status(200).json({ message: "Grade updated successfully", grade: updatedGrade });

    } catch (error) {
        console.error("Update Grade Error:", error);
        res.status(500).json({ message: "Failed to update grade", error: error.message });
    }
};

// DELETE Grade
const deleteGrade = async (req, res) => {
    try {
        const { id } = req.params;
        const grade = await Grade.findById(id);

        if (!grade) return res.status(404).json({ message: "Grade not found" });

        // Permission Check
        if (req.user.role !== 'SUPER_ADMIN' && grade.companyId.toString() !== req.user.companyId.toString()) {
            return res.status(403).json({ message: "Access denied" });
        }

        await Grade.findByIdAndDelete(id);
        res.status(200).json({ message: "Grade deleted successfully" });

    } catch (error) {
        console.error("Delete Grade Error:", error);
        res.status(500).json({ message: "Failed to delete grade", error: error.message });
    }
};

module.exports = {
    createGrade,
    getGrades,
    updateGrade,
    deleteGrade
};
