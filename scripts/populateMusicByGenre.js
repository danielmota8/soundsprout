require('dotenv').config();
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { Pool } = require('pg');
const { faker } = require('@faker-js/faker');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const JAMENDO_CLIENT_ID = process.env.JAMENDO_CLIENT_ID;
if (!JAMENDO_CLIENT_ID) {
    console.error('❌ JAMENDO_CLIENT_ID não definido no .env');
    process.exit(1);
}

const DEST_DIR = path.join(__dirname, '../uploads/musicas');
fs.mkdirSync(DEST_DIR, { recursive: true });

const MÚSICAS_POR_GENERO = 30;
const CONCURRENCY_GÉNEROS = 3;
const CONCURRENCY_DOWNLOADS = 6;

async function getCategorias() {
    const { rows } = await pool.query('SELECT nome_categoria FROM Categoria');
    return rows.map(r => r.nome_categoria);
}

async function getUsernames() {
    const { rows } = await pool.query('SELECT username FROM Utilizador');
    return rows.map(r => r.username);
}

async function downloadFile(url, destPath) {
    const writer = fs.createWriteStream(destPath);
    const response = await axios.get(url, { responseType: 'stream' });
    response.data.pipe(writer);
    return new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
    });
}

async function processGenero(genero, usernames) {
    let encontrados = 0;
    let offset = 0;
    const vistos = new Set();
    const queue = [];

    while (encontrados < MÚSICAS_POR_GENERO && offset < 500) {
        const url = `https://api.jamendo.com/v3.0/tracks/?client_id=${JAMENDO_CLIENT_ID}&format=json&limit=50&offset=${offset}&include=musicinfo+stats&fuzzytags=${encodeURIComponent(genero.toLowerCase())}`;
        const { data } = await axios.get(url);
        const tracks = data.results;
        if (!tracks || tracks.length === 0) break;

        const válidas = tracks.filter(track => {
            if (vistos.has(track.id)) return false;
            vistos.add(track.id);
            const genres = track.musicinfo?.tags?.genres || [];
            const genresLower = genres.map(g => g.toLowerCase());
            return genresLower.includes(genero.toLowerCase()) && track.audiodownload_allowed && track.audio;
        });

        for (const track of válidas) {
            if (encontrados >= MÚSICAS_POR_GENERO) break;

            queue.push(track);
            encontrados++;
        }

        offset += 50;
    }

    console.log(`→ Total de músicas para ${genero}: ${queue.length}`);

    let idx = 0;

    while (idx < queue.length) {
        const batch = queue.slice(idx, idx + CONCURRENCY_DOWNLOADS);
        await Promise.all(batch.map(async (track, i) => {
            try {
                const username = usernames[(idx + i) % usernames.length];
                const titulo = track.name;
                const descricao = track.description || faker.lorem.sentence();
                const dataPub = new Date(Date.now() - Math.floor(Math.random() * 2 * 365 * 24 * 60 * 60 * 1000));
                const tipoFicheiro = 'audio/mpeg';
                const visualizacoes = faker.number.int({ min: 0, max: 50000 });

                const nomeFicheiro = `${username}_${track.id}.mp3`;
                const destPath = path.join(DEST_DIR, nomeFicheiro);
                const pathFicheiro = `uploads/musicas/${nomeFicheiro}`;

                await downloadFile(track.audio, destPath);

                const insertSql = `
                    INSERT INTO Musica
                    (titulo, username, descricao, dataPublicacao, tipoFicheiro,
                     pathFicheiro, video, foto, visualizacoes)
                    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
                    RETURNING id;
                `;
                const insertVals = [
                    titulo, username, descricao, dataPub,
                    tipoFicheiro, pathFicheiro, null, null, visualizacoes
                ];
                const { rows } = await pool.query(insertSql, insertVals);
                const musicaId = rows[0].id;

                await pool.query(
                    `INSERT INTO Musica_Categoria (musica_id, nome_categoria)
                     VALUES ($1, $2)
                     ON CONFLICT DO NOTHING;`,
                    [musicaId, genero]
                );

            } catch (err) {
            }
        }));
        idx += CONCURRENCY_DOWNLOADS;
    }
}

async function main() {
    console.log('🎵 Início do populate por género');

    const categorias = await getCategorias();
    const usernames = await getUsernames();

    for (let i = 0; i < categorias.length; i += CONCURRENCY_GÉNEROS) {
        const batch = categorias.slice(i, i + CONCURRENCY_GÉNEROS);
        await Promise.all(batch.map(genero => {
            console.log(`\n🎧 Processando género: ${genero}`);
            return processGenero(genero, usernames);
        }));
    }

    console.log('\n✅ Populate finalizado.');
}

main()
    .catch(err => {
        console.error('Erro no populate:', err);
    })
    .finally(async () => {
        await pool.end();
        console.log('🔒 Pool encerrado.');
    });
