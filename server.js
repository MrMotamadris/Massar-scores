const express = require('express');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const massarService = require('./massarService');
const cache = require('./cache');

const app = express();

// تحسين الأمان باستخدام Helmet
app.use(helmet());

// ضغط الردود لتحسين الأداء
app.use(compression());

// إعداد Body Parser لتحليل الطلبات
app.use(bodyParser.json());

// الحد من عدد الطلبات لكل IP
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 دقيقة
    max: 50, // 50 طلب لكل IP
    message: 'Too many requests, please try again later.',
});
app.use(limiter);

// نقطة الوصول الرئيسية
app.post('/fetch-massar', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).send({ error: 'Email and password are required' });
    }

    try {
        // التحقق من التخزين المؤقت
        const cacheKey = `massar:${email}`;
        const cachedData = await cache.get(cacheKey);

        if (cachedData) {
            return res.send(JSON.parse(cachedData));
        }

        // جلب البيانات من مسار
        const data = await massarService.fetchData(email, password);

        // تخزين البيانات مؤقتًا
        await cache.set(cacheKey, JSON.stringify(data), 300); // تخزين لمدة 5 دقائق

        res.send(data);
    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).send({ error: 'Failed to fetch data from Massar' });
    }
});

// تشغيل الخادم
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
