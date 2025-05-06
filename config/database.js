const { Pool } = require('pg');
require('dotenv').config();

// Configuração da ligação à base de dados
const pool = new Pool({
    user: "postgres",
    host: "localhost",
    database: "soundsprout",
    password: "root",
    port: 5432,
});

// Testar a ligação à base de dados
pool.connect()
    .then(() => console.log("🟢 Ligação ao PostgreSQL bem-sucedida!"))
    .catch(err => console.error("🔴 Erro ao ligar ao PostgreSQL:", err));

module.exports = pool;