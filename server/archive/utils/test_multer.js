const multer = require('multer');
const express = require('express');
const app = express();

console.log("Multer version:", require('multer/package.json').version);

// Simple storage setup
const upload = multer({ dest: 'uploads/temp/' });

app.post('/upload', upload.single('file'), (req, res) => {
  console.log('File uploaded:', req.file);
  res.json({ message: 'File uploaded' });
});

app.listen(3001, () => {
  console.log('Test server listening on port 3001');
});
