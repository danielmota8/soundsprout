require('dotenv').config();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const queries = require('../queries/queries');
const auth_queries = require('../queries/authQueries');

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

// Refresh do Access Token
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

module.exports = { register, login, refreshToken, logout };
