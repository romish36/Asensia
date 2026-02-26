const express = require("express");
const router = express.Router();
const {
    createGrade,
    getGrades,
    updateGrade,
    deleteGrade
} = require("../controllers/gradeController");
const authMiddleware = require("../middlewares/authMiddleware");
const companyScopeMiddleware = require("../middlewares/companyScopeMiddleware");
const Grade = require("../models/gradeModel");
const checkPermission = require('../middlewares/permissionMiddleware');

// All routes require authentication
router.use(authMiddleware);

// GET /api/grade (List) - Middleware will filter by company
router.get("/", companyScopeMiddleware(Grade), checkPermission('Grade', 'view'), getGrades);

// POST /api/grade (Create)
router.post("/", checkPermission('Grade', 'add'), createGrade);

// PUT /api/grade/:id (Update)
router.put("/:id", checkPermission('Grade', 'update'), updateGrade);

// DELETE /api/grade/:id (Delete)
router.delete("/:id", checkPermission('Grade', 'delete'), deleteGrade);

module.exports = router;
