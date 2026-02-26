const InvoicePaymentType = require("../models/invoicePaymentTypeModel");

// GET /api/invoice-payment-type
const getInvoicePaymentTypes = async (req, res) => {
    try {
        const query = {};
        // If you want to filter by company, uncomment the lines below:
        /*
        if (req.user.role !== 'SUPER_ADMIN') {
            query.companyId = req.user.companyId;
        } else if (req.query.companyId) {
            query.companyId = req.query.companyId;
        }
        */

        const types = await InvoicePaymentType.find(query).sort({ invoicePaymentTypeId: 1 });
        res.status(200).json(types);
    } catch (error) {
        console.error("Get InvoicePaymentTypes Error:", error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getInvoicePaymentTypes
};
