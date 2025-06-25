const db = require('../models/db');

exports.uploadDoc = (req, res) => {
  const userId = req.user.id;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ message: 'Aucun fichier envoyé' });
  }

  db.run(
    `INSERT INTO documents (filename, user_id) VALUES (?, ?)`,
    [file.filename, userId],
    function (err) {
      if (err) return res.status(500).json({ message: 'Erreur base de données' });

      res.status(201).json({ message: 'Fichier enregistré', file: file.filename });
    }
  );
};

exports.getDocsByUser = (req, res) => {
  const userId = req.user.id;

  db.all(`SELECT * FROM documents WHERE user_id = ?`, [userId], (err, rows) => {
    if (err) return res.status(500).json({ message: 'Erreur base' });

    res.status(200).json(rows);
  });
};

exports.getAllDocs = (req, res) => {
  if (req.user.role !== 'professionnel') {
    return res.status(403).json({ message: 'Accès refusé' });
  }

  db.all(
    `SELECT d.*, u.email FROM documents d JOIN users u ON d.user_id = u.id`,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ message: 'Erreur base' });

      res.status(200).json(rows);
    }
  );
};
