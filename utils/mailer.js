// utils/mailer.js
require('dotenv').config();
const nodemailer = require('nodemailer');

// Exemplo com Gmail:
// (poderás ter de gerar uma App Password ou permitir “Less secure apps”)
// Podes trocar por outro serviço SMTP (SendGrid, Mailgun, etc.).
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,       // teu email (ex.: soundsprout@gmail.com)
        pass: process.env.EMAIL_PASS        // a password ou App Password
    }
});

// Função auxiliar para enviar email
async function sendMail({ to, subject, html, text }) {
    const mailOptions = {
        from: `SoundSprout <${process.env.EMAIL_USER}>`,
        to,
        subject,
        text,
        html
    };
    return transporter.sendMail(mailOptions);
}

module.exports = { sendMail };
