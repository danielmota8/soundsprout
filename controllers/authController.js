const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const queries = require('../queries/queries');

const register = async (req, res) => {
    const { username, email, password, premium, foto } = req.body;
    try {
        const existingUser = await queries.obterUtilizadorPorEmail(email);
        if (existingUser) {
            return res.status(400).json({ error: 'Email já registrado' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await queries.criarUtilizador(username, email, hashedPassword, premium, foto);
        res.status(201).json(user);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao registrar utilizador' });
    }
};

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

        const token = jwt.sign({ username: user.username }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.json({ token, user: { username: user.username, email: user.email, premium: user.premium } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao fazer login' });
    }
};

module.exports = { register, login };