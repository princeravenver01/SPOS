const nodemailer = require('nodemailer');

async function test(host, port, secure) {
    console.log(`Testing ${host}:${port} (secure: ${secure})`);
    const transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: {
            user: 'noreply@silingan.online',
            pass: 'SilinganCucina2026!'
        },
        tls: {
            rejectUnauthorized: false
        }
    });

    try {
        await transporter.verify();
        console.log(`✅ Success for ${host}:${port}`);
    } catch (err) {
        console.error(`❌ Failed for ${host}:${port} -> ${err.message}`);
    }
}

async function run() {
    await test('mail.silingan.online', 465, true);
    await test('mail.silingan.online', 587, false);
    await test('smtp.hostinger.com', 465, true);
    await test('smtp.hostinger.com', 587, false);
    process.exit();
}

run();
