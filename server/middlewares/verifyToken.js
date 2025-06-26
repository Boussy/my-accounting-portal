const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;

module.exports = function (req, res, next) {
  // Vérifier d'abord le header d'autorisation
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];
  
  // Si pas de token dans le header, chercher dans l'URL (pour les requêtes dans iframe/img)
  if (!token && req.query.token) {
    token = req.query.token;
  }

  if (!token) return res.status(401).json({ message: 'Token requis' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // Pour compatibilité avec les contrôleurs existants
    req.user = {
      id: decoded.id,
      role: decoded.role
    };
    // Garder aussi les propriétés individuelles pour rétrocompatibilité
    req.userId = decoded.id;  
    req.userRole = decoded.role;
    next();
  } catch (err) {
    return res.status(403).json({ message: 'Token invalide' });
  }
};
