const InvoiceCopy = require("../models/invoiceCopyModel");

const getInvoiceCopies = async (req, res) => {
    try {
        const query = {};
        const { search, companyId, page, limit } = req.query;

        if (req.user.role !== 'SUPER_ADMIN') {
            query.companyId = req.user.companyId;
        } else if (companyId) {
            query.companyId = companyId;
        }

        if (search) {
            query.invoiceCopyName = { $regex: search, $options: 'i' };
        }

        if (!page && !limit) {
            let copies = await InvoiceCopy.find(query).sort({ invoiceCopyId: 1 });

            // If no copies found for this company and no search is performed, seed default ones
            if (copies.length === 0 && !search && (req.user.companyId || (req.user.role === 'SUPER_ADMIN' && companyId))) {
                const seedCompanyId = req.user.role === 'SUPER_ADMIN' ? companyId : req.user.companyId;
                const defaults = ["Original", "Duplicate", "Triplicate"];

                const lastDoc = await InvoiceCopy.findOne().sort({ invoiceCopyId: -1 });
                let nextId = lastDoc && lastDoc.invoiceCopyId ? lastDoc.invoiceCopyId + 1 : 1;

                const newDocs = defaults.map((name, index) => ({
                    invoiceCopyId: nextId++,
                    invoiceCopyName: name,
                    companyId: seedCompanyId,
                    date: new Date().toLocaleDateString(),
                    time: new Date().toLocaleTimeString()
                }));

                await InvoiceCopy.insertMany(newDocs);
                copies = await InvoiceCopy.find(query).sort({ invoiceCopyId: 1 });
            }
            return res.status(200).json(copies);
        }

        const currentPage = parseInt(page) || 1;
        const currentLimit = parseInt(limit) || 10;
        const skip = (currentPage - 1) * currentLimit;

        let [invoiceCopies, total] = await Promise.all([
            InvoiceCopy.find(query).sort({ invoiceCopyId: 1 }).skip(skip).limit(currentLimit),
            InvoiceCopy.countDocuments(query)
        ]);

        // Seeding logic for paginated response as well if total is 0
        if (total === 0 && !search && (req.user.companyId || (req.user.role === 'SUPER_ADMIN' && companyId))) {
            const seedCompanyId = req.user.role === 'SUPER_ADMIN' ? companyId : req.user.companyId;
            const defaults = ["Original", "Duplicate", "Triplicate"];

            const lastDoc = await InvoiceCopy.findOne().sort({ invoiceCopyId: -1 });
            let nextId = lastDoc && lastDoc.invoiceCopyId ? lastDoc.invoiceCopyId + 1 : 1;

            const newDocs = defaults.map((name, index) => ({
                invoiceCopyId: nextId++,
                invoiceCopyName: name,
                companyId: seedCompanyId,
                date: new Date().toLocaleDateString(),
                time: new Date().toLocaleTimeString()
            }));

            await InvoiceCopy.insertMany(newDocs);

            // Re-fetch
            const [newCopies, newTotal] = await Promise.all([
                InvoiceCopy.find(query).sort({ invoiceCopyId: 1 }).skip(skip).limit(currentLimit),
                InvoiceCopy.countDocuments(query)
            ]);
            invoiceCopies = newCopies;
            total = newTotal;
        }

        res.status(200).json({
            invoiceCopies,
            total,
            page: currentPage,
            pages: Math.ceil(total / currentLimit)
        });
    } catch (error) {
        console.error("Get InvoiceCopies Error:", error);
        res.status(500).json({ message: "Failed to fetch invoice copies", error: error.message });
    }
};

// CREATE Invoice Copy (Helper to ensure data exists)
const createInvoiceCopy = async (req, res) => {
    try {
        const { invoiceCopyName, companyId } = req.body;

        if (!invoiceCopyName) {
            return res.status(400).json({ message: "Invoice Copy Name is required" });
        }

        // Scope company
        let finalCompanyId;
        if (req.user.role === 'SUPER_ADMIN') {
            finalCompanyId = companyId;
            if (!finalCompanyId) return res.status(400).json({ message: "Company ID required for Super Admin" });
        } else {
            finalCompanyId = req.user.companyId;
        }

        const lastDoc = await InvoiceCopy.findOne().sort({ invoiceCopyId: -1 });
        const nextId = lastDoc && lastDoc.invoiceCopyId ? lastDoc.invoiceCopyId + 1 : 1;

        const newCopy = new InvoiceCopy({
            invoiceCopyId: nextId,
            invoiceCopyName,
            companyId: finalCompanyId,
            date: new Date().toLocaleDateString(),
            time: new Date().toLocaleTimeString()
        });

        await newCopy.save();
        res.status(201).json(newCopy);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// PUT /api/invoice-copy/:id
const updateInvoiceCopy = async (req, res) => {
    try {
        const { id } = req.params;
        const { invoiceCopyName } = req.body;

        const copy = await InvoiceCopy.findById(id);
        if (!copy) return res.status(404).json({ message: "Invoice Copy not found" });

        // Permission
        if (req.user.role !== 'SUPER_ADMIN' && copy.companyId.toString() !== req.user.companyId.toString()) {
            return res.status(403).json({ message: "Access denied" });
        }

        copy.invoiceCopyName = invoiceCopyName || copy.invoiceCopyName;
        const updated = await copy.save();
        res.status(200).json(updated);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// DELETE /api/invoice-copy/:id
const deleteInvoiceCopy = async (req, res) => {
    try {
        const { id } = req.params;
        const copy = await InvoiceCopy.findById(id);
        if (!copy) return res.status(404).json({ message: "Invoice Copy not found" });

        // Permission
        if (req.user.role !== 'SUPER_ADMIN' && copy.companyId.toString() !== req.user.companyId.toString()) {
            return res.status(403).json({ message: "Access denied" });
        }

        await InvoiceCopy.findByIdAndDelete(id);
        res.status(200).json({ message: "Invoice Copy deleted" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getInvoiceCopies,
    createInvoiceCopy,
    updateInvoiceCopy,
    deleteInvoiceCopy
};
