const { faker } = require('@faker-js/faker');
const pool = require('../config/database');

async function populateLives() {
    try {
        // Busca todos os usernames existentes
        const { rows: users } = await pool.query('SELECT username FROM Utilizador');
        const types = ['concert', 'session', 'chat', 'Q&A'];

        for (let i = 0; i < 20; i++) {
            // Seleciona um criador aleatório
            const { username: criador } = faker.helpers.arrayElement(users);
            // URL único para a live (pode ser slug ou hash)
            const url = faker.internet.url();
            // Título e descrição
            const titulo = faker.music.songName();
            const descricao = faker.lorem.sentence(10);
            // DataHora: aleatória entre hoje e +7 dias
            const dataHora = faker.date.soon(7);
            // Tipo de evento
            const tipo = faker.helpers.arrayElement(types);
            // Capa: URL de imagem aleatória ou path local
            const capa = `uploads/fotos/${faker.system.fileName('jpg')}`;
            // Viewers: número aleatório entre 0 e 5000 (sem usar faker.number)
            const viewers = Math.floor(Math.random() * 5001);
            // is_live: aleatoriamente true ou false (80% true)
            const is_live = Math.random() < 0.8;

            await pool.query(
                `INSERT INTO Live
                 (url, criador_username, titulo, dataHora, tipo, descricao, capa, viewers, is_live)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
                [url, criador, titulo, dataHora, tipo, descricao, capa, viewers, is_live]
            );
            console.log(`Inserida live ${i+1}: ${titulo} by ${criador}`);
        }

        console.log('População de Live concluída.');
        process.exit(0);
    } catch (err) {
        console.error('Erro ao popular Lives:', err);
        process.exit(1);
    }
}

populateLives();
