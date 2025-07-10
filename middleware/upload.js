
// Garante que a pasta existe
const multer = require('multer');
const path  = require('path');
const fs    = require('fs');
const crypto = require('crypto');

function ensureDir(dir) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

const storage = multer.diskStorage({
    destination(req, file, cb) {
        let uploadDir;
        if (file.fieldname === 'audio') {
            uploadDir = path.join(__dirname, '../uploads/musicas');
        } else if (file.fieldname === 'foto') {
            uploadDir = path.join(__dirname, '../uploads/fotos');
        } else if (file.fieldname === 'lyric') {
            uploadDir = path.join(__dirname, '../uploads/lyrics');
        } else {
            return cb(new Error(`Field "${file.fieldname}" não suportado`), null);
        }
        ensureDir(uploadDir);
        cb(null, uploadDir);
    },
    filename(req, file, cb) {
        // mantém o nome base e a extensão
        const { name, ext } = path.parse(file.originalname);
        // gera 8 bytes aleatórios em hex (16 chars)
        const random = crypto.randomBytes(8).toString('hex');
        // exemplo: mySong-1a2b3c4d5e6f7g8h.mp3
        const uniqueName = `${name}-${random}${ext}`;
        cb(null, uniqueName);
    }
});

module.exports = multer({ storage });
