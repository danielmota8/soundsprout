// backend/scripts/populateMusicByGenre.js

require('dotenv').config();
const fs      = require('fs');
const path    = require('path');
const axios   = require('axios');
// Reutiliza o pool que já tens em config/database.js
const pool    = require('../config/database');
const { faker } = require('@faker-js/faker');

const JAMENDO_CLIENT_ID = process.env.JAMENDO_CLIENT_ID;
if (!JAMENDO_CLIENT_ID) {
    console.error('❌ JAMENDO_CLIENT_ID não definido no .env');
    process.exit(1);
}

// Onde vamos descarregar os ficheiros mp3
const DEST_DIR = path.join(__dirname, '../uploads/musicas');
fs.mkdirSync(DEST_DIR, { recursive: true });

// Quantas músicas queremos por género
// Quantos géneros processamos em paralelo
const CONCURRENCY_GENEROS    = 2;
// Quantos downloads em paralelo por batch
const CONCURRENCY_DOWNLOADS  = 3;

// 1) Busca todas as categorias da BD
async function getCategorias() {
    const { rows } = await pool.query('SELECT nome_categoria FROM Categoria');
    return rows.map(r => r.nome_categoria);
}

// 2) Busca todos os usernames da BD
async function getUsernames() {
    const { rows } = await pool.query('SELECT username FROM Utilizador');
    return rows.map(r => r.username);
}

// 3) Descarrega um ficheiro remoto para o caminho local
async function downloadFile(url, destPath) {
    const writer = fs.createWriteStream(destPath);
    const response = await axios.get(url, { responseType: 'stream' });
    response.data.pipe(writer);
    return new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
    });
}

// 4) Para cada género, faz fetch ao Jamendo e descarrega até MUSICAS_POR_GENERO
async function processGenero(genero, usernames) {
    const vistos = new Set();
    const queue = [];
    let encontrados = 0;
    let offset = 0;
    const LIMIT = 50;

    while (encontrados < 30) {
        let data;
        try {
            const url = `https://api.jamendo.com/v3.0/tracks/?client_id=${JAMENDO_CLIENT_ID}` +
                `&format=json&limit=${LIMIT}&offset=${offset}` +
                `&include=musicinfo+stats&fuzzytags=${encodeURIComponent(genero)}`;
            const resp = await axios.get(url);
            data = resp.data;
        } catch (err) {
            if (err.response?.status === 429) {
                console.warn(`🔶 Rate limit atingido ao processar ${genero}; interrompendo paginação.`);
                break;
            } else {
                console.error(`❌ Erro ao buscar Jamendo para ${genero}:`, err.message);
                break;
            }
        }

        const tracks = data.results || [];
        if (tracks.length === 0) break;

        for (const track of tracks) {
            if (vistos.has(track.id)) continue;
            vistos.add(track.id);

            const genres = track.musicinfo?.tags?.genres?.map(g=>g.toLowerCase()) || [];
            if (genres.includes(genero.toLowerCase()) && track.audio) {
                queue.push(track);
                encontrados++;
                if (encontrados >= 30) break;
            }
        }

        if (tracks.length < LIMIT) break;  // sem mais páginas
        offset += LIMIT;
    }

    console.log(`→ ${queue.length} músicas encontradas para género "${genero}"`);

    // Descarrega em batches de CONCURRENCY_DOWNLOADS
    for (let i = 0; i < queue.length; i += CONCURRENCY_DOWNLOADS) {
        const batch = queue.slice(i, i + CONCURRENCY_DOWNLOADS);
        await Promise.all(batch.map(async (track, idx) => {
            try {
                // Escolhe um username cíclico da lista
                const username   = usernames[(i + idx) % usernames.length];
                const titulo     = track.name;
                const descricao  = track.description || faker.lorem.sentence();
                const dataPub    = faker.date.past({ years: 2 });
                const tipoFich   = 'audio/mpeg';
                const visualiz   = faker.number.int({ min: 0, max: 50000 });

                const slugGenero   = genero.toLowerCase().replace(/\s+/g, '_');          // ex: "Rock" → "rock"
                const nomeFicheiro = `${slugGenero}_${username}_${track.id}.mp3`;
                const destPath     = path.join(DEST_DIR, nomeFicheiro);
                const pathFicheiro = `uploads/musicas/${nomeFicheiro}`;

                // Descarrega o MP3
                await downloadFile(track.audio, destPath);

                // Insere na tabela Musica
                const insertSql = `
          INSERT INTO Musica
            (titulo, username, descricao, datapublicacao, tipoficheiro,
             pathficheiro, video, foto, visualizacoes)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
          RETURNING id;
        `;
                const vals = [
                    titulo, username, descricao, dataPub,
                    tipoFich, pathFicheiro, null, null, visualiz
                ];
                const { rows } = await pool.query(insertSql, vals);
                const musicaId = rows[0].id;

                // Associa a categoria
                await pool.query(
                    `INSERT INTO Musica_Categoria (musica_id, nome_categoria)
             VALUES ($1, $2)
             ON CONFLICT DO NOTHING;`,
                    [musicaId, genero]
                );
            } catch (err) {
                console.error(`✗ Erro a processar track ${track.id}:`, err.message);
            }
        }));
    }
}

async function main() {
    console.log('🎵 Início do populate por género');

    const categorias = await getCategorias();
    const usernames  = await getUsernames();

    // Processa em paralelo CONCURRENCY_GENEROS géneros
    for (let i = 0; i < categorias.length; i += CONCURRENCY_GENEROS) {
        const batch = categorias.slice(i, i + CONCURRENCY_GENEROS);
        await Promise.all(batch.map(g => processGenero(g, usernames)));
    }

    console.log('✅ Populate por género concluído.');
    await pool.end();
}

main().catch(err => {
    console.error('❌ Erro no populate:', err);
    pool.end();
});
