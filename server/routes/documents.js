const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { uploadDoc, getDocsByUser, getAllDocs } = require('../controllers/docController');
const verifyToken = require('../middlewares/verifyToken');

// Config Multer pour enregistrer les fichiers dans /uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

router.post('/upload', verifyToken, upload.single('file'), uploadDoc);

router.get('/mydocs', verifyToken, getDocsByUser);

router.get('/all', verifyToken, getAllDocs); // Pour les comptables

module.exports = router;
