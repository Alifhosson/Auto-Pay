const express = require('express');
const mongoose = require('mongoose');
const app = express();
app.use(express.json());

// ⚠️ পেমেন্টের জন্য নতুন MongoDB (ipbd)
const PAYMENT_DB_URI = "mongodb+srv://ipshop_db_user:alifbot123@ipbd.jvlfwqi.mongodb.net/sms_db?retryWrites=true&w=majority";

if (mongoose.connection.readyState === 0) {
    mongoose.connect(PAYMENT_DB_URI);
}

const SMSData = mongoose.models.SMSData || mongoose.model('SMSData', new mongoose.Schema({
    trxId: { type: String, unique: true },
    amount: Number,
    sender: String,
    used: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now, expires: 3600 } 
}));

// অ্যাপ থেকে ডাটা সেভ করা
app.post('/api/receive-sms', async (req, res) => {
    try {
        const { trxId, amount, sender } = req.body;
        await new SMSData({ trxId: trxId.toUpperCase(), amount: parseFloat(amount), sender }).save();
        res.send("Saved");
    } catch (e) { res.send("Exist"); }
});

// বটকে পেমেন্ট ভেরিফাই করে দেওয়া
app.get('/api/verify-payment', async (req, res) => {
    const { trx, amount } = req.query;
    try {
        const record = await SMSData.findOne({ trxId: trx.toUpperCase(), used: false });
        if (record && record.amount >= parseFloat(amount)) {
            record.used = true;
            await record.save();
            return res.json({ status: "success", amount: record.amount });
        }
        res.json({ status: "not_found" });
    } catch (e) { res.json({ status: "error" }); }
});

module.exports = app;
