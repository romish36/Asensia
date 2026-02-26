const PurchaseOrder = require("../models/purchaseOrderModel");
const SalesInvoice = require("../models/salesInvoiceModel");
const PurchaseOrderPayment = require("../models/purchaseOrderPaymentModel");
const InvoicePayment = require("../models/invoicePaymentModel");
const Product = require("../models/productModel");
const Seller = require("../models/sellerModel");
const Customer = require("../models/customerModel");
const Transporter = require("../models/transporterModel");
const Category = require("../models/categoryModel");
const InStock = require("../models/inStockModel");
const OutStock = require("../models/outStockModel");
const Company = require("../models/companyModel");
const mongoose = require("mongoose");

const getDashboardStats = async (req, res) => {
    try {
        const query = {};
        if (req.user.role !== 'SUPER_ADMIN') {
            query.companyId = new mongoose.Types.ObjectId(req.user.companyId);
        } else if (req.query.companyId) {
            query.companyId = new mongoose.Types.ObjectId(req.query.companyId);
        }

        // 1. Basic Counts & Totals
        const [
            purchaseCount,
            salesCount,
            sellerCount,
            customerCount,
            transporterCount,
            productCount,
            categoryCount,
            companyCount
        ] = await Promise.all([
            PurchaseOrder.countDocuments({ ...query, active: true }),
            SalesInvoice.countDocuments({ ...query, active: true }),
            Seller.countDocuments({ ...query, active: true }),
            Customer.countDocuments(query),
            Transporter.countDocuments(query),
            Product.countDocuments(query),
            Category.countDocuments(query),
            Company.countDocuments({})
        ]);

        // Purchase Total (Include 18% GST)
        const purchaseTotalAgg = await PurchaseOrder.aggregate([
            { $match: { ...query, active: true } },
            {
                $group: {
                    _id: null,
                    total: { $sum: "$totalAmount" }
                }
            }
        ]);
        const counts_totalPurchaseAmount = (purchaseTotalAgg[0]?.total || 0) * 1.18;

        // Sales Total (Include 18% GST)
        const salesTotalAgg = await SalesInvoice.aggregate([
            { $match: { ...query, active: true } },
            {
                $group: {
                    _id: null,
                    total: { $sum: "$totalAmount" }
                }
            }
        ]);
        const counts_totalSalesAmount = (salesTotalAgg[0]?.total || 0) * 1.18;


        // Stock Totals - Need to parse string quantities
        const inStockAgg = await InStock.aggregate([
            { $match: { ...query } },
            {
                $group: {
                    _id: null,
                    total: { $sum: { $toDouble: "$inQuantity" } }
                }
            }
        ]);

        const outStockAgg = await OutStock.aggregate([
            { $match: { ...query } },
            {
                $group: {
                    _id: null,
                    total: { $sum: { $toDouble: "$outQuantity" } }
                }
            }
        ]);

        const totalIn = inStockAgg[0]?.total || 0;
        const totalOut = outStockAgg[0]?.total || 0;
        const totalLoss = counts_totalPurchaseAmount - counts_totalSalesAmount;


        // 2. Low Stock Alerts (Stock <= 10)
        const productQuery = req.user.role !== 'SUPER_ADMIN' ? { companyId: req.user.companyId } : {};
        // Exclude 'Without Stock' products (stockType: 2)
        const lowStockProducts = await Product.find({
            ...productQuery,
            productStock: { $lte: 10 },
            stockType: { $ne: 2 }
        })
            .populate('categoryId', 'categoryName')
            .select('productName productStock productHsnCode sizeName categoryId')
            .sort({ productStock: 1 });

        // 3. Top Sellers with Pending Balances (Instead of Recent Payments)
        // Aggregate Total Debit from Purchase Orders (Include 18% GST)
        const poAgg = await PurchaseOrder.aggregate([
            { $match: { ...query, active: true } },
            {
                $group: {
                    _id: "$purchaseCompanyId",
                    totalDebit: { $sum: { $multiply: ["$totalAmount", 1.18] } },
                    tradeName: { $first: "$companyName" }
                }
            }
        ]);

        // Aggregate Total Credit from Payments
        const payAgg = await PurchaseOrderPayment.aggregate([
            { $match: { companyId: query.companyId } },
            {
                $group: {
                    _id: "$buyerId",
                    totalCredit: { $sum: { $toDouble: "$paymentAmount" } }
                }
            }
        ]);

        // Map and Calculate Balances
        const sellerBalances = poAgg.map(po => {
            const pay = payAgg.find(p => p._id === po._id);
            const debit = po.totalDebit || 0;
            const credit = pay ? (pay.totalCredit || 0) : 0;
            return {
                _id: po._id, // Using numeric ID for unique key
                buyerTradeName: po.tradeName || 'N/A',
                paymentAmount: (debit - credit).toFixed(2), // Redirecting to paymentAmount field for frontend compatibility
                paymentDate: 'Balance',
                paymentModeName: 'Current'
            };
        }).filter(s => parseFloat(s.paymentAmount) > 0)
            .sort((a, b) => b.paymentAmount - a.paymentAmount)
            .slice(0, 5);

        const recentPurchasePayments = sellerBalances;

        // 4. Recent Sales Payments
        const recentSalesPayments = await InvoicePayment.find(query)
            .sort({ createdAt: -1 })
            .limit(5);


        // 5. Sales History (Last 12 Months) (Include 18% GST)
        const allSales = await SalesInvoice.find({ ...query, active: true }).select('invoiceDate totalAmount');
        const salesHistory = processMonthlyData(allSales, 'invoiceDate', 'totalAmount', 1.18);

        // 6. Purchase vs Payment Chart (Purchases Include 18% GST)
        const allPurchases = await PurchaseOrder.find({ ...query, active: true }).select('invoiceDate totalAmount');
        const purchaseMonthly = processMonthlyData(allPurchases, 'invoiceDate', 'totalAmount', 1.18);

        const allPurchasePayments = await PurchaseOrderPayment.find(query).select('paymentDate paymentAmount');
        const paymentMonthly = processMonthlyData(allPurchasePayments, 'paymentDate', 'paymentAmount');

        const purchaseVsPayment = mergeMonthlyData(purchaseMonthly, paymentMonthly, 'invoice', 'payment');

        res.json({
            counts: {
                purchaseInvoices: purchaseCount,
                invoices: salesCount,
                sellers: sellerCount,
                customers: customerCount,
                transporters: transporterCount,
                products: productCount,
                categories: categoryCount,
                companies: companyCount,
                totalInStock: totalIn,
                totalOutStock: totalOut,
                totalPurchaseAmount: counts_totalPurchaseAmount,
                totalSalesAmount: counts_totalSalesAmount,
                totalLoss
            },
            lowStockProducts,
            recentPurchasePayments,
            recentSalesPayments,
            pieData: [
                { name: 'Purchase Cost', value: counts_totalPurchaseAmount },
                { name: 'Sales Revenue', value: counts_totalSalesAmount }
            ],
            salesHistory,
            purchaseVsPayment
        });

    } catch (error) {
        console.error("Dashboard Stats Error:", error);
        res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
};

// Helper to aggregate monthly data in JS (since date formats might be mixed strings)
function processMonthlyData(data, dateField, amountField, multiplier = 1) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonthIndex = new Date().getMonth(); // 0-11

    // Initialize last 12 months with 0
    const result = [];
    for (let i = 11; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const mIndex = d.getMonth();
        const y = d.getFullYear();
        result.push({
            monthName: months[mIndex],
            year: y,
            fullLabel: `${months[mIndex]}`, // Simplified label
            amount: 0,
            sortKey: `${y}-${String(mIndex + 1).padStart(2, '0')}` // for reliable sorting/matching if needed
        });
    }

    data.forEach(item => {
        if (!item[dateField]) return;

        let d = new Date(item[dateField]);
        if (isNaN(d.getTime())) return; // invalid date

        const mIndex = d.getMonth();
        const y = d.getFullYear();
        const sortKey = `${y}-${String(mIndex + 1).padStart(2, '0')}`;

        // Find matching entry in result
        const entry = result.find(r => r.sortKey === sortKey);

        let amt = parseFloat(item[amountField]);
        if (isNaN(amt) && typeof item[amountField] === 'string') {
            amt = parseFloat(item[amountField].replace(/[^\d.-]/g, ''));
        }

        if (entry && !isNaN(amt)) {
            entry.amount += (amt * multiplier);
        }
    });

    return result.map(r => ({ month: r.fullLabel, amount: r.amount }));
}

function mergeMonthlyData(listA, listB, keyA, keyB) {
    // Assuming both lists are generated by processMonthlyData and have same length/order
    // But to be safe, we map by index or month name
    return listA.map((item, index) => {
        const other = listB[index];
        return {
            name: item.month,
            [keyA]: item.amount,
            [keyB]: other ? other.amount : 0
        };
    });
}

module.exports = { getDashboardStats };
