const multer = require('multer');
const path = require('path');

// destina uploads para /uploads/musicas
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../uploads/musicas'));
    },
    filename: (req, file, cb) => {
        // podes adicionar timestamp ou um UUID para evitar colisões
        const unique = Date.now() + '-' + file.originalname;
        cb(null, unique);
    }
});

module.exports = multer({ storage });
