// Script pour tester la politique de mot de passe
const fetch = require('node-fetch');

/**
 * Teste différents mots de passe pour vérifier la politique de sécurité
 */
async function testPasswordPolicy() {
  const API_URL = 'http://localhost:3000';
  
  // Liste des mots de passe à tester
  const testPasswords = [
    { 
      password: 'password', 
      description: 'Trop simple (sans majuscule, chiffre ou caractère spécial)'
    },
    { 
      password: 'Password', 
      description: 'Avec majuscule mais sans chiffre ni caractère spécial'
    },
    { 
      password: 'Password1', 
      description: 'Avec majuscule et chiffre mais sans caractère spécial'
    },
    { 
      password: 'Password1!', 
      description: 'Avec majuscule, chiffre et caractère spécial (valide)'
    },
    { 
      password: 'Pass 1!', 
      description: 'Avec espace (non valide)'
    },
    { 
      password: 'Pa1!', 
      description: 'Trop court (moins de 8 caractères)'
    }
  ];
  
  console.log('🧪 Test de la politique de mot de passe\n');
  
  for (const test of testPasswords) {
    console.log(`\n📝 Test: "${test.password}" - ${test.description}`);
    
    try {
      // Tenter d'enregistrer un utilisateur avec ce mot de passe
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          email: `test_${Date.now()}@example.com`,
          password: test.password,
          role: 'client'
        })
      });
      
      const data = await response.json();
      
      console.log(`🔍 Code HTTP: ${response.status}`);
      console.log(`🔍 Message: ${data.message}`);
      
      if (response.status === 201) {
        console.log('✅ Résultat: Mot de passe accepté');
      } else {
        console.log('❌ Résultat: Mot de passe rejeté');
      }
    } catch (error) {
      console.error('💥 Erreur:', error.message);
    }
  }
}

testPasswordPolicy();
