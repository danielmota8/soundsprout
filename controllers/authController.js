require('dotenv').config();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const queries = require('../queries/queries');
const auth_queries = require('../queries/authQueries');
const crypto = require('crypto');
const { sendMail } = require('../utils/mailer');
// Desestruturar variáveis de ambiente e fallback
const {
    JWT_SECRET,
    ACCESS_TOKEN_SECRET,
    REFRESH_TOKEN_SECRET,
    NODE_ENV
} = process.env;
const accessSecret = ACCESS_TOKEN_SECRET || JWT_SECRET;
const refreshSecret = REFRESH_TOKEN_SECRET || JWT_SECRET;

// Registar novo utilizador
const register = async (req, res) => {
    let { username, email, password, premium=false, foto=null } = req.body;
    const isPremium = typeof premium === 'boolean' ? premium : false;
    const fotoUrl = foto || null;
    try {
        const existingUser = await queries.obterUtilizadorPorEmail(email);
        if (existingUser) {
            return res.status(400).json({ error: 'Email já registado' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await queries.criarUtilizador(
            username,
            email,
            hashedPassword,
            isPremium,
            fotoUrl
        );
        res.status(201).json(user);
    } catch (err) {
        console.error('💥 ERRO EM authController.register:', err);
        res.status(500).json({
            error: 'Erro ao registrar utilizador',
            details: err.message
        });
    }
};

// Login e emissão de Access + Refresh Tokens
const login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await queries.obterUtilizadorPorEmail(email);
        if (!user) {
            return res.status(400).json({ error: 'Utilizador não encontrado' });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Password incorreta' });
        }
        const payload = { username: user.username };
        const accessToken = jwt.sign(payload, accessSecret, { expiresIn: '15m' });
        const refreshToken = jwt.sign(payload, refreshSecret, { expiresIn: '7d' });

        await auth_queries.salvarRefreshToken(user.username, refreshToken);
        res
            .cookie('refreshToken', refreshToken, {
                httpOnly: true,
                secure: NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000
            })
            .json({ accessToken, user: { username: user.username, email: user.email, premium: user.premium } });
    } catch (err) {
        console.error('Erro em authController.login:', err);
        res.status(500).json({ error: 'Erro ao fazer login', details: err.message });
    }
};

// Refresh do Access Token guarda em cookie httpOnly + BD).
const refreshToken = async (req, res) => {
    const token = req.cookies.refreshToken || req.body.refreshToken;
    if (!token) return res.status(401).json({ error: 'Sem token' });
    try {
        const stored = await auth_queries.obterRefreshToken(token);
        if (!stored) return res.status(403).json({ error: 'Token inválido' });
        jwt.verify(token, refreshSecret, (err, payload) => {
            if (err) return res.status(403).json({ error: 'Token expirado ou inválido' });
            const newAccessToken = jwt.sign({ username: payload.username }, accessSecret, { expiresIn: '15m' });
            res.json({ accessToken: newAccessToken });
        });
    } catch (err) {
        console.error('Erro em authController.refreshToken:', err);
        res.status(500).json({ error: 'Erro no refresh token', details: err.message });
    }
};

// Logout: remover Refresh Token
const logout = async (req, res) => {
    const token = req.cookies.refreshToken || req.body.refreshToken;
    if (token) {
        await auth_queries.apagarRefreshToken(token);
        res.clearCookie('refreshToken');
    }
    res.status(204).end();
};



const forgotPassword = async (req, res) => {
    const { identifier } = req.body; // recebes email ou username
    try {
        // 1. Encontrar o utilizador por email ou username
        let user = await queries.obterUtilizadorPorEmail(identifier);
        if (!user) {
            user = await queries.obterUtilizadorPorUsername(identifier);
        }
        if (!user) {
            return res.status(400).json({ error: 'Utilizador não encontrado.' });
        }

        // 2. Gerar token aleatório e expiração (ex.: 1h)
        const token = crypto.randomBytes(32).toString('hex');
        const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hora depois

        // 3. Gravar token e expiração no BD
        await auth_queries.setResetToken(user.username, token, expires);

        // 4. Construir link de reset:
        //    FRONTEND_URL deve ser algo como http://localhost:3000
        const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

        // 5. Enviar email
        const subject = 'SoundSprout: redefinição de password';
        const text = `Olá ${user.username},\n\nClique no link abaixo para redefinir a tua password:\n\n${resetLink}\n\nSe não pediste isto, ignora esta mensagem.\n\nAbraço,\nSoundSprout Team`;
        const html = `
      <p>Olá <strong>${user.username}</strong>,</p>
      <p>Para redefinires a tua password, clica no link em baixo (válido por 1 hora):</p>
      <p><a href="${resetLink}">Redefinir a password</a></p>
      <br/>
      <p>Se não pedires isto, ignora esta mensagem.</p>
      <p>Abraço,<br/>SoundSprout Team</p>
    `;

        await sendMail({ to: user.email, subject, text, html });

        return res.json({ message: 'Email de redefinição enviado.' });
    } catch (err) {
        console.error('Erro em forgotPassword:', err);
        return res.status(500).json({ error: 'Erro a processar pedido de reset.' });
    }
};

const resetPassword = async (req, res) => {
    const { token, newPassword } = req.body;
    try {
        // 1. Encontrar utilizador pelo token (e que ainda não expirou)
        const user = await auth_queries.getUserByResetToken(token);
        if (!user) {
            return res.status(400).json({ error: 'Token inválido ou expirado.' });
        }

        // 2. Hash da nova password
        const hashed = await bcrypt.hash(newPassword, 10);

        // 3. Atualizar password e limpar campos de reset no BD
        await auth_queries.updatePasswordWithToken(user.username, hashed);

        return res.json({ message: 'Password alterada com sucesso.' });
    } catch (err) {
        console.error('Erro em resetPassword:', err);
        return res.status(500).json({ error: 'Erro a redefinir a password.' });
    }
};

module.exports = { register, login, refreshToken, logout,forgotPassword, resetPassword };
