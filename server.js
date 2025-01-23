const express = require('express');
const puppeteer = require('puppeteer');
const bodyParser = require('body-parser');
const redis = require('redis');
const cluster = require('cluster');
const os = require('os');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');

// عدد المعالجات المتوفرة
const numCPUs = os.cpus().length;

// إعداد Redis للتخزين المؤقت
const redisClient = redis.createClient();
redisClient.on('error', (err) => console.error('Redis Error:', err));

// إذا كان المعالج الأساسي
if (cluster.isMaster) {
    console.log(`Master ${process.pid} is running`);

    // إنشاء عمليات فرعية لكل معالج
    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    // عند انتهاء عملية فرعية، يتم استبدالها
    cluster.on('exit', (worker, code, signal) => {
        console.log(`Worker ${worker.process.pid} died`);
        cluster.fork();
    });
} else {
    // إنشاء التطبيق
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

        // التحقق من صحة الإدخال
        if (!email || !password) {
            return res.status(400).send({ error: 'Email and password are required' });
        }

        // إنشاء مفتاح فريد لتخزين النتائج في Redis
        const cacheKey = `massar:${email}`;

        try {
            // التحقق من وجود البيانات في Redis
            redisClient.get(cacheKey, async (err, cachedData) => {
                if (err) throw err;

                if (cachedData) {
                    // إعادة البيانات المخزنة مؤقتًا
                    return res.send(JSON.parse(cachedData));
                } else {
                    // تشغيل Puppeteer لجلب البيانات
                    const browser = await puppeteer.launch({
                        headless: true,
                        args: ['--no-sandbox', '--disable-setuid-sandbox'],
                    });
                    const page = await browser.newPage();

                    try {
                        // الانتقال إلى صفحة تسجيل الدخول في مسار
                        await page.goto('https://massar.men.gov.ma', { waitUntil: 'networkidle2' });

                        // إدخال البريد الإلكتروني وكلمة المرور
                        await page.type('#email', email); // قم بتحديث المحدد (selector) حسب موقع مسار
                        await page.type('#password', password); // قم بتحديث المحدد (selector) حسب موقع مسار

                        // النقر على زر تسجيل الدخول
                        await page.click('#login-button'); // قم بتحديث المحدد (selector) حسب موقع مسار

                        // الانتظار حتى يتم تحميل الصفحة
                        await page.waitForNavigation({ waitUntil: 'networkidle2' });

                        // جلب المعلومات المطلوبة
                        const data = await page.evaluate(() => {
                            // قم بتحديد العناصر التي تحتوي على البيانات المطلوبة
                            const name = document.querySelector('.student-name').innerText; // قم بتحديث المحدد
                            const points = document.querySelector('.student-points').innerText; // قم بتحديث المحدد
                            return { name, points };
                        });

                        // تخزين البيانات في Redis لمدة 5 دقائق
                        redisClient.setex(cacheKey, 300, JSON.stringify(data));

                        // إرسال البيانات إلى العميل
                        res.send(data);
                    } catch (error) {
                        console.error('Error fetching data:', error);
                        res.status(500).send({ error: 'Failed to fetch data from Massar' });
                    } finally {
                        // إغلاق المتصفح
                        await browser.close();
                    }
                }
            });
        } catch (error) {
            console.error('Server Error:', error);
            res.status(500).send({ error: 'Internal Server Error' });
        }
    });

    // تشغيل الخادم
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Worker ${process.pid} is running on port ${PORT}`);
    });
                                                           }
