const express = require('express');
const router = express.Router();
const { register, login } = require('../controllers/authController');

router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', (req, res) => {
  const { email } = req.body;
  
  // Cette route simule l'envoi d'un email de réinitialisation
  // Dans une vraie application, vous enverriez un email avec un lien unique
  
  if (!email) {
    return res.status(400).json({ message: 'Veuillez fournir une adresse email' });
  }
  
  // Ici, on simule simplement une réponse positive
  return res.status(200).json({ message: 'Un email de réinitialisation a été envoyé à votre adresse' });
});

module.exports = router;
