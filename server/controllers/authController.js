const db = require('../models/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Valide la force du mot de passe
 * @param {string} password - Le mot de passe à valider
 * @returns {object} - Résultat de la validation { isValid: boolean, message: string }
 */
function validatePassword(password) {
  // Le mot de passe doit avoir au moins 8 caractères
  if (password.length < 8) {
    return { isValid: false, message: 'Le mot de passe doit contenir au moins 8 caractères' };
  }
  
  // Le mot de passe doit contenir au moins une majuscule
  if (!/[A-Z]/.test(password)) {
    return { isValid: false, message: 'Le mot de passe doit contenir au moins une lettre majuscule' };
  }
  
  // Le mot de passe doit contenir au moins une minuscule
  if (!/[a-z]/.test(password)) {
    return { isValid: false, message: 'Le mot de passe doit contenir au moins une lettre minuscule' };
  }
  
  // Le mot de passe doit contenir au moins un chiffre
  if (!/\d/.test(password)) {
    return { isValid: false, message: 'Le mot de passe doit contenir au moins un chiffre' };
  }
  
  // Le mot de passe doit contenir au moins un caractère spécial
  if (!/[\W_]/.test(password)) {
    return { isValid: false, message: 'Le mot de passe doit contenir au moins un caractère spécial (!, @, #, $, etc.)' };
  }
  
  // Le mot de passe ne doit pas contenir d'espaces
  if (/\s/.test(password)) {
    return { isValid: false, message: 'Le mot de passe ne doit pas contenir d\'espaces' };
  }
  
  // Le mot de passe est valide
  return { isValid: true, message: 'Mot de passe valide' };
}

exports.register = (req, res) => {
  const { email, password, role } = req.body;

  if (!email || !password || !role) {
    return res.status(400).json({ message: 'Champs requis manquants' });
  }
  
  // Validation professionnelle du format d'email
  const emailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: 'Format d\'email invalide' });
  }
  
  // Validation du rôle
  const validRoles = ['client', 'professionnel'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ message: `Rôle invalide. Les rôles valides sont: ${validRoles.join(', ')}` });
  }
  
  // Validation de la force du mot de passe
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.isValid) {
    return res.status(400).json({ message: passwordValidation.message });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);

  const query = `INSERT INTO users (email, password, role) VALUES (?, ?, ?)`;
  
  db.run(query, [email, hashedPassword, role], function (err) {
    if (err) {
      return res.status(400).json({ message: 'Erreur ou email déjà utilisé', error: err.message });
    }

    return res.status(201).json({ message: 'Utilisateur enregistré !' });
  });
};

exports.login = (req, res) => {
  const { email, password, userType } = req.body;

  // Vérifier que userType est fourni et valide
  if (!userType) {
    return res.status(400).json({ message: 'Type d\'utilisateur requis' });
  }

  if (!['client', 'professionnel'].includes(userType)) {
    return res.status(400).json({ message: 'Type d\'utilisateur invalide' });
  }

  db.get(`SELECT * FROM users WHERE email = ?`, [email], (err, user) => {
    if (err || !user) {
      return res.status(400).json({ message: 'Utilisateur introuvable' });
    }

    const isValid = bcrypt.compareSync(password, user.password);
    if (!isValid) {
      return res.status(401).json({ message: 'Mot de passe incorrect' });
    }

    // Vérification STRICTE de la correspondance du rôle
    if (user.role !== userType) {
      return res.status(403).json({ 
        message: `Accès refusé. Ce portail est réservé aux utilisateurs de type "${userType}".`,
        errorType: 'role_mismatch',
        actualRole: user.role 
      });
    }

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '1d' });
    return res.status(200).json({ token, role: user.role });
  });
};
