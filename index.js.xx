const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

const MONGO_URI = process.env.MONGODB_URI || 'mongodb+srv://alifhosson22_db_user:alifbot123@kabir.p8t5pl9.mongodb.net/sms_db?retryWrites=true&w=majority';

// Serverless-safe connection cache
let cachedConnection = null;

async function connectDB() {
    if (cachedConnection && mongoose.connection.readyState === 1) {
        return cachedConnection;
    }
    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
    }
    cachedConnection = await mongoose.connect(MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 10000,
        connectTimeoutMS: 10000,
        maxIdleTimeMS: 10000,
        maxPoolSize: 1
    });
    return cachedConnection;
}

const paymentSchema = new mongoose.Schema({
    sender:  { type: String, required: true },
    message: { type: String, required: true },
    trxId:   { type: String, required: true, unique: true },
    amount:  { type: Number, required: true },
    time:    { type: Date, default: Date.now },
    source:  { type: String, enum: ['bKash', 'Nagad', 'Unknown'], default: 'Unknown' }
});

const Payment = mongoose.models.Payment || mongoose.model('Payment', paymentSchema);

app.post('/api/receive', async function(req, res) {
    try {
        await connectDB();
        var body    = req.body;
        var sender  = body.sender;
        var message = body.message;
        var trxId   = body.trxId;
        var amount  = body.amount;
        var source  = body.source || 'Unknown';
        var time    = body.time ? new Date(body.time) : new Date();

        if (!sender || !message || !trxId || amount === undefined) {
            return res.status(400).json({ status: 'error', message: 'Missing required fields: sender, message, trxId, amount' });
        }

        var existing = await Payment.findOne({ trxId: trxId });
        if (existing) {
            return res.status(409).json({ status: 'duplicate', message: 'Transaction already recorded', data: existing });
        }

        var payment = new Payment({ sender: sender, message: message, trxId: trxId, amount: parseFloat(amount), time: time, source: source });
        await payment.save();

        return res.status(201).json({ status: 'success', message: 'Payment saved successfully', data: payment });
    } catch (err) {
        console.error('POST /api/receive error:', err.message);
        return res.status(500).json({ status: 'error', message: 'Internal server error', detail: err.message });
    }
});

app.get('/api/verify', async function(req, res) {
    try {
        await connectDB();
        var trxId  = req.query.trxId;
        var amount = req.query.amount;

        if (!trxId) {
            return res.status(400).json({ status: 'error', message: 'trxId is required' });
        }

        var query = { trxId: trxId };
        if (amount !== undefined && amount !== '') {
            query.amount = parseFloat(amount);
        }

        var payment = await Payment.findOne(query);

        if (payment) {
            return res.status(200).json({ status: 'verified', data: { trxId: payment.trxId, amount: payment.amount, sender: payment.sender, source: payment.source, time: payment.time } });
        } else {
            return res.status(200).json({ status: 'not_found' });
        }
    } catch (err) {
        console.error('GET /api/verify error:', err.message);
        return res.status(500).json({ status: 'error', message: 'Internal server error', detail: err.message });
    }
});

app.get('/api/payments', async function(req, res) {
    try {
        await connectDB();
        var limit = parseInt(req.query.limit) || 50;
        var payments = await Payment.find({}).sort({ time: -1 }).limit(limit);
        return res.status(200).json({ status: 'success', count: payments.length, data: payments });
    } catch (err) {
        return res.status(500).json({ status: 'error', message: err.message });
    }
});

app.get('/', function(req, res) {
    res.json({ status: 'ok', message: 'SMS Payment Receiver API is running...' });
});

var PORT = process.env.PORT || 3000;
app.listen(PORT, function() {
    console.log('Server running on port ' + PORT);
});

module.exports = app;
