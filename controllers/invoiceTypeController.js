const InvoiceType = require("../models/invoiceTypeModel");

// GET /api/invoice-type
const getInvoiceTypes = async (req, res) => {
    try {
        const query = {};
        // You can enable company filtering later if needed:
        /*
        if (req.user.role !== 'SUPER_ADMIN') {
            query.companyId = req.user.companyId;
        } else if (req.query.companyId) {
            query.companyId = req.query.companyId;
        }
        */

        const types = await InvoiceType.find(query).sort({ invoiceTypeId: 1 });
        res.status(200).json(types);
    } catch (error) {
        console.error("Get InvoiceTypes Error:", error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getInvoiceTypes
};
