module.exports = {
    puppeteerOptions: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    },
    redisTTL: 300, // مدة التخزين المؤقت (بالثواني)
};