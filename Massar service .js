const puppeteer = require('puppeteer');

async function fetchData(email, password) {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();

    try {
        await page.goto('https://massar.men.gov.ma', { waitUntil: 'networkidle2' });

        await page.type('#email', email); // قم بتحديث المحدد حسب موقع مسار
        await page.type('#password', password);

        await page.click('#login-button'); // قم بتحديث المحدد حسب موقع مسار
        await page.waitForNavigation({ waitUntil: 'networkidle2' });

        const data = await page.evaluate(() => {
            const name = document.querySelector('.student-name').innerText; // قم بتحديث المحدد
            const points = document.querySelector('.student-points').innerText; // قم بتحديث المحدد
            return { name, points };
        });

        return data;
    } catch (error) {
        throw new Error('Failed to fetch data from Massar');
    } finally {
        await browser.close();
    }
}

module.exports = { fetchData };