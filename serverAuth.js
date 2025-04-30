require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const nodemailer = require('nodemailer');
const pendingOTPs = new Map();
const pendingResets = new Map();

const router = express.Router();

const userSchema = new mongoose.Schema({
    username: { type: String, unique: true },
    email: String,
    password: String
});
const User = mongoose.model('User', userSchema);

class Database {
    static async connect() {
        try {
            await mongoose.connect(process.env.MONGODB_URI);
            console.log('✅ Kết nối MongoDB thành công!');
        } catch (err) {
            console.error('❌ Kết nối MongoDB thất bại:', err);
            process.exit(1);
        }
    }
}

class UserService {
    static async register({ username, email, password }) {
        const existingUser = await User.findOne({ username });
        if (existingUser) throw new Error('Tên người dùng đã tồn tại.');
        const hashedPassword = await bcrypt.hash(password, 10);
        await new User({ username, email, password: hashedPassword }).save();
    }

    static async login({ username, password }) {
        const user = await User.findOne({ username });
        if (!user) throw new Error('Tên người dùng không tồn tại.');
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) throw new Error('Mật khẩu không đúng.');
        return user;
    }
}

async function sendOTPEmail(to, otp) {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    await transporter.sendMail({
        from: '"OTP System" <no-reply@game.com>',
        to,
        subject: 'Xác minh OTP cho đăng ký',
        html: `<h2>Mã OTP của bạn là:</h2><h3>${otp}</h3><p>Hết hạn sau 5 phút.</p>`
    });
}

router.post('/api/register', async (req, res) => {
    const { username, email, password } = req.body;

    // Validate sơ bộ...

    const existing = await User.findOne({ username });
    if (existing) return res.json({ message: 'Tên đã tồn tại' });

    const otp = Math.floor(100000 + Math.random() * 900000);
    pendingOTPs.set(email, {
        otp: otp.toString(),
        type: "register",
        expires: Date.now() + 5 * 60 * 1000,
        attempts: 0,
        userData: { username, email, password }
    });

    await sendOTPEmail(email, otp);
    res.json({ message: 'OTP đã gửi', redirect: '/otp.html' });
});

router.post('/api/verify-otp', async (req, res) => {
    const { email, otp, username, type } = req.body;

    const reset = pendingResets.get(email);
    if (reset) {
        if (Date.now() > reset.expires)
            return res.json({ message: 'OTP đã hết hạn.', success: false, expired: true });

        reset.attempts += 1;
        if (reset.attempts > 3)
            return res.json({ message: 'Bạn đã nhập sai quá 3 lần.', success: false, expired: true });

        if (reset.otp !== otp)
            return res.json({ message: 'OTP không đúng.', success: false });

        const user = await User.findOne({ email, username });
        if (!user) return res.json({ message: 'Tài khoản không hợp lệ.', success: false });

        const isSame = await bcrypt.compare(reset.newpass, user.password);
        if (isSame) {
            return res.json({ message: 'Mật khẩu mới không được trùng với mật khẩu cũ.', success: false });
        }

        const hashed = await bcrypt.hash(reset.newpass, 10);
        await User.findOneAndUpdate({ email, username }, { password: hashed });

        pendingResets.delete(email);
        return res.json({ message: 'Đặt lại mật khẩu thành công!', success: true });
    }

    const record = pendingOTPs.get(email);

    if (!record) return res.json({ message: 'Không tìm thấy OTP', success: false });
    if (Date.now() > record.expires) return res.json({ message: 'Mã OTP đã hết hạn. Vui lòng nhấn GỬI LẠI.', success: false, expired: true });
    record.attempts += 1;
    if (record.attempts > 3) return res.json({ message: 'Bạn đã nhập sai quá 3 lần. Hãy gửi lại OTP mới.', success: false, expired: true });
    if (record.otp !== otp) return res.json({ message: 'OTP không chính xác', success: false });

    // Lưu user vào DB
    const hashed = await bcrypt.hash(record.userData.password, 10);
    const newUser = new User({
        username: record.userData.username,
        email: record.userData.email,
        password: hashed
    });
    await newUser.save();

    pendingOTPs.delete(email);
    res.json({ message: 'Xác minh thành công!', success: true });
});

router.post('/api/forgot-password', async (req, res) => {
    const { username, email, newpass } = req.body;
    const user = await User.findOne({ username, email });

    if (!user) {
        return res.json({ message: 'Không tìm thấy người dùng với thông tin đã cung cấp.', success: false });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    pendingResets.set(email, {
        otp,
        type: "reset",
        newpass,
        username,
        expires: Date.now() + 5 * 60 * 1000,
        attempts: 0
    });

    await sendOTPEmail(email, otp);
    res.json({ message: 'Mã OTP đã được gửi đến email của bạn.', success: true });
});

router.post('/api/resend-otp', async (req, res) => {
    const { email } = req.body;
    const record = pendingOTPs.get(email);
    if (!record) return res.json({ message: 'Không tìm thấy thông tin để gửi lại OTP.', success: false });

    const newOTP = Math.floor(100000 + Math.random() * 900000).toString();
    record.otp = newOTP;
    record.expires = Date.now() + 5 * 60 * 1000;
    record.attempts = 0;

    await sendOTPEmail(email, newOTP);
    res.json({ message: 'Mã OTP mới đã được gửi lại.', success: true });
});

router.post('/api/resend-reset-otp', async (req, res) => {
    const { email, username } = req.body;
    const record = pendingResets.get(email);

    if (!record || record.username !== username) {
        return res.json({ message: 'Không tìm thấy thông tin tài khoản để gửi lại OTP.', success: false });
    }

    const newOTP = Math.floor(100000 + Math.random() * 900000).toString();
    record.otp = newOTP;
    record.expires = Date.now() + 5 * 60 * 1000;
    record.attempts = 0;

    await sendOTPEmail(email, newOTP);
    res.json({ message: 'OTP mới đã được gửi lại!', success: true });
});

router.post('/api/login', async (req, res) => {
    try {
        await UserService.login(req.body);
        res.json({ message: 'Đăng nhập thành công!' });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

module.exports = { authRouter: router, connectDB: Database.connect };