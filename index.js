const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// MongoDB Connection
const mongoURI = "mongodb+srv://alifhosson22_db_user:alifbot123@kabir.p8t5pl9.mongodb.net/sms_db";
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("MongoDB Connected"))
    .catch(err => console.log(err));

// Schema
const PaymentSchema = new mongoose.Schema({
    sender: String,
    message: String,
    trxId: { type: String, unique: true },
    amount: Number,
    time: { type: Date, default: Date.now }
});
const Payment = mongoose.model('Payment', PaymentSchema);

// API: Receive SMS Data
app.post('/api/receive', async (req, res) => {
    try {
        const { sender, message, trxId, amount } = req.body;
        const newPayment = new Payment({ sender, message, trxId, amount });
        await newPayment.save();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// API: Verify Payment
app.get('/api/verify', async (req, res) => {
    const { trx, amount } = req.query;
    try {
        const payment = await Payment.findOne({ trxId: trx, amount: parseFloat(amount) });
        if (payment) {
            res.json({ status: "verified" });
        } else {
            res.json({ status: "not_found" });
        }
    } catch (error) {
        res.status(500).json({ status: "error" });
    }
});

app.get('/', (req, res) => res.send("SMS Server is Running..."));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = app;
