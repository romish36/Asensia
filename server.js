const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./config/dbConfig");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

dotenv.config();
connectDB();

const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const socketHandler = require('./socketHandler');
socketHandler(io);

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

app.get("/", (req, res) => {
    res.status(200).send("Backend server is running with Socket.IO");
});

app.use("/api/product", require("./routes/productRoutes"));
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/company", require("./routes/companyRoutes"));
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/category", require("./routes/categoryRoutes"));
app.use("/api/instock", require("./routes/inStockRoutes"));
app.use("/api/outstock", require("./routes/outStockRoutes"));
app.use("/api/transporter", require("./routes/transporterRoutes"));
app.use("/api/grade", require("./routes/gradeRoutes"));
app.use("/api/customer-type", require("./routes/customerTypeRoutes"));
app.use("/api/payment-mode", require("./routes/paymentModeRoutes"));
app.use("/api/sale-type", require("./routes/saleTypeRoutes"));
app.use("/api/color", require("./routes/colorRoutes"));
app.use("/api/customer", require("./routes/customerRoutes"));
app.use("/api/seller", require("./routes/sellerRoutes"));
app.use("/api/invoice-name", require("./routes/invoiceNameRoutes"));
app.use("/api/sales-invoice", require("./routes/salesInvoiceRoutes"));
app.use("/api/purchase-order", require("./routes/purchaseOrderRoutes"));
app.use("/api/country", require("./routes/countryRoutes"));
app.use("/api/state", require("./routes/stateRoutes"));
app.use("/api/city", require("./routes/cityRoutes"));
app.use("/api/user-permissions", require("./routes/userPermissionRoutes"));
app.use("/api/invoice-copy", require("./routes/invoiceCopyRoutes"));
app.use("/api/invoice-payment-type", require("./routes/invoicePaymentTypeRoutes"));
app.use("/api/invoice-type", require("./routes/invoiceTypeRoutes"));
app.use("/api/permissions", require("./routes/permissionsRoutes"));
app.use("/api/invoice-payment", require("./routes/invoicePaymentRoutes"));
app.use("/api/purchase-order-payment", require("./routes/purchaseOrderPaymentRoutes"));
app.use("/api/transporter-payment", require("./routes/transporterPaymentRoutes"));
app.use("/api/dashboard", require("./routes/dashboardRoutes"));
app.use("/api/bundle", require("./routes/bundleItemRoutes"));
app.use("/api/expense", require("./routes/expenseRoutes"));
app.use("/api/plan", require("./routes/planRoutes"));
app.use("/api/coupon", require("./routes/couponRoutes"));
app.use("/api/chat", require("./routes/chatRoutes"));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
