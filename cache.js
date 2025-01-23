const redis = require('redis');
const client = redis.createClient();

client.on('error', (err) => console.error('Redis Error:', err));

async function get(key) {
    return new Promise((resolve, reject) => {
        client.get(key, (err, data) => {
            if (err) reject(err);
            resolve(data);
        });
    });
}

async function set(key, value, ttl) {
    return new Promise((resolve, reject) => {
        client.setex(key, ttl, value, (err) => {
            if (err) reject(err);
            resolve();
        });
    });
}

module.exports = { get, set };