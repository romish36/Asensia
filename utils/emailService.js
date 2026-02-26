const nodemailer = require('nodemailer');
require('dotenv').config();

const sendEmail = async (options) => {
    // 1) Create a transporter
    const transporter = nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE,
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        secure: process.env.EMAIL_SECURE === 'true',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    // 2) Define the email options
    const mailOptions = {
        from: `Asencia World <${process.env.EMAIL_USER}>`,
        to: options.email,
        subject: options.subject,
        text: options.message
    };

    // 3) Actually send the email
    try {
        await transporter.sendMail(mailOptions);
        console.log(`✅ Email sent successfully to ${options.email}`);
    } catch (error) {
        console.error('❌ Nodemailer error:', error);
        throw error;
    }
};

module.exports = sendEmail;
