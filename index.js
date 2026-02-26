const express = require('express');
const mongoose = require('mongoose');
const app = express();

// JSON ডাটা পড়ার জন্য মিডলওয়্যার
app.use(express.json());

// ⚠️ MongoDB URL
const MONGO_URI = "mongodb+srv://alifhosson22_db_user:alifbot123@kabir.p8t5pl9.mongodb.net/sms_db?retryWrites=true&w=majority";

// ডাটাবেস কানেকশন (Vercel এর জন্য অপ্টিমাইজড)
if (mongoose.connection.readyState === 0) {
    mongoose.connect(MONGO_URI)
        .then(() => console.log("✅ Database Connected"))
        .catch(err => console.error("❌ DB Connection Error:", err));
}

// SMS Schema ও মডেল (একই মডেল বারবার তৈরি হওয়া রোধ করতে models.SMSData ব্যবহার করা হয়েছে)
const SMSDataSchema = new mongoose.Schema({
    trxId: { type: String, unique: true, required: true },
    amount: Number,
    used: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now, expires: 3600 } // ১ ঘণ্টা পর অটো ডিলিট
});

const SMSData = mongoose.models.SMSData || mongoose.model('SMSData', SMSDataSchema);

// ১. রুট: অ্যান্ড্রয়েড অ্যাপ থেকে ডাটা রিসিভ করা (POST)
app.post('/api/receive-sms', async (req, res) => {
    try {
        const { trxId, amount } = req.body;
        if (!trxId || !amount) return res.status(400).send("TrxID and Amount are required");

        await new SMSData({ 
            trxId: trxId.toUpperCase().trim(), 
            amount: parseFloat(amount) 
        }).save();
        
        res.status(200).send("Saved");
    } catch (e) {
        // যদি TrxID আগে থেকেই থাকে
        res.status(200).send("Exist"); 
    }
});

// ২. রুট: টেলিগ্রাম বট থেকে পেমেন্ট ভেরিফাই করা (GET)
app.get('/api/verify-payment', async (req, res) => {
    const { trx, amount } = req.query;
    if (!trx || !amount) return res.json({ status: "error", msg: "Missing parameters" });

    try {
        const record = await SMSData.findOne({ 
            trxId: trx.toUpperCase().trim(), 
            used: false 
        });

        if (record) {
            // টাকা কি সঠিক পাঠিয়েছে? (কমপক্ষে সমান বা বেশি হতে হবে)
            if (record.amount >= parseFloat(amount)) {
                record.used = true;
                await record.save();
                return res.json({ status: "success", amount: record.amount });
            } else {
                return res.json({ status: "wrong_amount", amount: record.amount });
            }
        }
        res.json({ status: "not_found" });
    } catch (e) {
        res.json({ status: "error", msg: e.message });
    }
});

// মেইন ফাইলে এক্সপোর্ট করার জন্য
module.exports = app;
