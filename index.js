const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

const MONGO_URI = 'mongodb+srv://alifhosson22_db_user:alifbot123@kabir.p8t5pl9.mongodb.net/sms_db?retryWrites=true&w=majority';

mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(function() {
    console.log('MongoDB connected successfully');
}).catch(function(err) {
    console.error('MongoDB connection error:', err);
});

const paymentSchema = new mongoose.Schema({
    sender: { type: String, required: true },
    message: { type: String, required: true },
    trxId: { type: String, required: true, unique: true },
    amount: { type: Number, required: true },
    time: { type: Date, default: Date.now },
    source: { type: String, enum: ['bKash', 'Nagad', 'Unknown'], default: 'Unknown' }
});

const Payment = mongoose.model('Payment', paymentSchema);

// POST /api/receive - Save SMS payment data
app.post('/api/receive', async function(req, res) {
    try {
        var body = req.body;
        var sender = body.sender;
        var message = body.message;
        var trxId = body.trxId;
        var amount = body.amount;
        var time = body.time ? new Date(body.time) : new Date();
        var source = body.source || 'Unknown';

        if (!sender || !message || !trxId || amount === undefined) {
            return res.status(400).json({
                status: 'error',
                message: 'Missing required fields: sender, message, trxId, amount'
            });
        }

        var existing = await Payment.findOne({ trxId: trxId });
        if (existing) {
            return res.status(409).json({
                status: 'duplicate',
                message: 'Transaction already recorded',
                data: existing
            });
        }

        var payment = new Payment({
            sender: sender,
            message: message,
            trxId: trxId,
            amount: parseFloat(amount),
            time: time,
            source: source
        });

        await payment.save();

        return res.status(201).json({
            status: 'success',
            message: 'Payment saved successfully',
            data: payment
        });
    } catch (err) {
        console.error('Error in /api/receive:', err);
        return res.status(500).json({
            status: 'error',
            message: 'Internal server error'
        });
    }
});

// GET /api/verify - Verify transaction by trxId and amount
app.get('/api/verify', async function(req, res) {
    try {
        var trxId = req.query.trxId;
        var amount = req.query.amount;

        if (!trxId) {
            return res.status(400).json({
                status: 'error',
                message: 'trxId is required'
            });
        }

        var query = { trxId: trxId };
        if (amount !== undefined) {
            query.amount = parseFloat(amount);
        }

        var payment = await Payment.findOne(query);

        if (payment) {
            return res.status(200).json({
                status: 'verified',
                data: {
                    trxId: payment.trxId,
                    amount: payment.amount,
                    sender: payment.sender,
                    source: payment.source,
                    time: payment.time
                }
            });
        } else {
            return res.status(200).json({
                status: 'not_found'
            });
        }
    } catch (err) {
        console.error('Error in /api/verify:', err);
        return res.status(500).json({
            status: 'error',
            message: 'Internal server error'
        });
    }
});

// GET /api/payments - List recent payments (bonus endpoint)
app.get('/api/payments', async function(req, res) {
    try {
        var limit = parseInt(req.query.limit) || 50;
        var payments = await Payment.find({}).sort({ time: -1 }).limit(limit);
        return res.status(200).json({
            status: 'success',
            count: payments.length,
            data: payments
        });
    } catch (err) {
        return res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
});

// Health check
app.get('/', function(req, res) {
    res.json({ status: 'ok', message: 'SMS Payment Receiver API is running' });
});

var PORT = process.env.PORT || 3000;
app.listen(PORT, function() {
    console.log('Server running on port ' + PORT);
});

module.exports = app;
