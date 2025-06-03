// test-mail.js
require('dotenv').config();
const { sendMail } = require('./utils/mailer');

sendMail({
    to: 'danielmota8@gmail.com',
    subject: 'Teste SoundSprout',
    text: 'Se recebes isto, o envio de email via Gmail está a funcionar!'
})
    .then(() => console.log('Email enviado com sucesso!'))
    .catch(err => console.error('Erro ao enviar email:', err));
