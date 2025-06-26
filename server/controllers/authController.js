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
  const { email, password, role, nom, prenom, entreprise, adresse, numero, rgpd_accepted, cgu_accepted } = req.body;

  if (!email || !password || !role) {
    return res.status(400).json({ message: 'Champs requis manquants' });
  }
  
  if (!rgpd_accepted || !cgu_accepted) {
    return res.status(400).json({ message: 'Vous devez accepter les CGU et la politique de RGPD' });
  }
  
  if (role === 'client' && (!nom || !prenom || !entreprise || !adresse || !numero)) {
    return res.status(400).json({ message: 'Tous les champs sont requis pour l\'inscription' });
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

  const query = `INSERT INTO users (email, password, role, nom, prenom, entreprise, adresse, numero, rgpd_accepted, cgu_accepted) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  
  db.run(query, [
    email, 
    hashedPassword, 
    role, 
    nom || null, 
    prenom || null, 
    entreprise || null, 
    adresse || null, 
    numero || null,
    rgpd_accepted ? 1 : 0,
    cgu_accepted ? 1 : 0
  ], function (err) {
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

    // Mettre à jour la date de dernière connexion
    db.run(`UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?`, [user.id], (err) => {
      if (err) {
        console.error('Erreur lors de la mise à jour de la date de dernière connexion:', err);
        // Continuer malgré l'erreur pour que l'utilisateur puisse quand même se connecter
      }

      const token = jwt.sign({ 
        id: user.id, 
        role: user.role,
        nom: user.nom,
        prenom: user.prenom,
        entreprise: user.entreprise,
        adresse: user.adresse,
        numero: user.numero
      }, JWT_SECRET, { expiresIn: '1d' });
      return res.status(200).json({ token, role: user.role });
    });
  });
};

/**
 * Récupère les informations du profil de l'utilisateur connecté
 */
exports.getUserProfile = (req, res) => {
  const userId = req.userId;

  db.get(`SELECT id, email, role, nom, prenom, entreprise, adresse, numero, 
          datetime(created_at, 'localtime') as dateInscription,
          datetime(last_login_at, 'localtime') as derniere_connexion
          FROM users WHERE id = ?`, [userId], (err, user) => {
    if (err) {
      return res.status(500).json({ message: 'Erreur lors de la récupération du profil', error: err.message });
    }
    
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    // Ne pas renvoyer le mot de passe
    delete user.password;
    
    return res.status(200).json(user);
  });
};

/**
 * Met à jour les informations du profil de l'utilisateur connecté
 */
exports.updateUserProfile = (req, res) => {
  const userId = req.userId;
  const { nom, prenom, email, entreprise, adresse, numero } = req.body;

  // Validation professionnelle du format d'email
  const emailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  if (email && !emailRegex.test(email)) {
    return res.status(400).json({ message: 'Format d\'email invalide' });
  }

  // Vérifier si l'email existe déjà pour un autre utilisateur
  if (email) {
    db.get('SELECT id FROM users WHERE email = ? AND id != ?', [email, userId], (err, existingUser) => {
      if (err) {
        return res.status(500).json({ message: 'Erreur lors de la vérification de l\'email', error: err.message });
      }

      if (existingUser) {
        return res.status(400).json({ message: 'Cet email est déjà utilisé par un autre compte' });
      }

      // L'email est disponible, procéder à la mise à jour
      updateProfile();
    });
  } else {
    // Pas besoin de vérifier l'email, procéder directement
    updateProfile();
  }

  function updateProfile() {
    const query = `UPDATE users SET 
                  nom = COALESCE(?, nom), 
                  prenom = COALESCE(?, prenom), 
                  email = COALESCE(?, email), 
                  entreprise = COALESCE(?, entreprise), 
                  adresse = COALESCE(?, adresse), 
                  numero = COALESCE(?, numero),
                  updated_at = CURRENT_TIMESTAMP
                  WHERE id = ?`;

    db.run(query, [
      nom || null, 
      prenom || null, 
      email || null, 
      entreprise || null, 
      adresse || null, 
      numero || null,
      userId
    ], function(err) {
      if (err) {
        return res.status(500).json({ message: 'Erreur lors de la mise à jour du profil', error: err.message });
      }

      if (this.changes === 0) {
        return res.status(404).json({ message: 'Profil non trouvé ou aucune modification effectuée' });
      }

      return res.status(200).json({ message: 'Profil mis à jour avec succès' });
    });
  }
};

/**
 * Change le mot de passe de l'utilisateur
 */
exports.changePassword = (req, res) => {
  const userId = req.userId;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Le mot de passe actuel et le nouveau mot de passe sont requis' });
  }

  // Validation de la force du nouveau mot de passe
  const passwordValidation = validatePassword(newPassword);
  if (!passwordValidation.isValid) {
    return res.status(400).json({ message: passwordValidation.message });
  }

  // Vérifier le mot de passe actuel
  db.get('SELECT password FROM users WHERE id = ?', [userId], (err, user) => {
    if (err || !user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    const isValid = bcrypt.compareSync(currentPassword, user.password);
    if (!isValid) {
      return res.status(401).json({ message: 'Mot de passe actuel incorrect' });
    }

    // Hasher le nouveau mot de passe
    const hashedPassword = bcrypt.hashSync(newPassword, 10);

    // Mettre à jour le mot de passe
    db.run('UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', 
      [hashedPassword, userId], function(err) {
        if (err) {
          return res.status(500).json({ message: 'Erreur lors de la mise à jour du mot de passe' });
        }

        return res.status(200).json({ message: 'Mot de passe mis à jour avec succès' });
    });
  });
};
