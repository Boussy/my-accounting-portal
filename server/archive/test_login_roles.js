// Script pour tester la connexion avec vérification de rôle
const fetch = require('node-fetch');

// Pour s'assurer que toutes les erreurs sont affichées
process.on('unhandledRejection', (reason, promise) => {
  console.log('Unhandled Rejection at:', promise, 'reason:', reason);
});

async function testLoginWithRoleCheck() {
  try {
    console.log('🔍 Test de connexion avec vérification du rôle');
    
    // Récupérer d'abord la liste des utilisateurs existants pour les tests
    const testUsers = [
      { email: 'client1@email.com', password: 'Password123!', role: 'client' }, // Utilisateur existant
      { email: 'pro_1750806973364@test.com', password: 'Password123!', role: 'professionnel' }
    ];
    
    // Tester chaque combinaison utilisateur/type d'interface
    const tests = [
      { user: testUsers[0], userType: 'client' },      // Client essayant de se connecter en tant que client - Devrait réussir
      { user: testUsers[0], userType: 'professionnel' }, // Client essayant de se connecter en tant que professionnel - Devrait échouer
      { user: testUsers[1], userType: 'professionnel' }, // Professionnel essayant de se connecter en tant que professionnel - Devrait réussir
      { user: testUsers[1], userType: 'client' }        // Professionnel essayant de se connecter en tant que client - Devrait échouer
    ];
    
    for (const test of tests) {
      const { user, userType } = test;
      console.log(`\n📝 Test: ${user.email} (${user.role}) essaie de se connecter en tant que ${userType}`);
      
      const response = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          email: user.email,
          password: user.password,
          userType: userType
        })
      });
      
      const data = await response.json();
      
      console.log(`Status: ${response.status}`);
      console.log('Réponse:', data);
      
      if (user.role === userType) {
        if (response.ok) {
          console.log('✅ Test réussi: L\'utilisateur avec le bon rôle peut se connecter.');
        } else {
          console.log('❌ Test échoué: L\'utilisateur avec le bon rôle devrait pouvoir se connecter.');
        }
      } else {
        if (response.ok) {
          console.log('❌ Test échoué: L\'utilisateur avec le mauvais rôle ne devrait PAS pouvoir se connecter.');
        } else {
          console.log('✅ Test réussi: L\'utilisateur avec le mauvais rôle ne peut pas se connecter.');
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

testLoginWithRoleCheck();
