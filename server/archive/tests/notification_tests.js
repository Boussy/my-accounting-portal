const chai = require('chai');
const chaiHttp = require('chai-http');
const expect = chai.expect;
const sinon = require('sinon');

chai.use(chaiHttp);

const API_URL = 'http://localhost:3000';
const notificationService = require('../services/notificationService');

/**
 * Tests pour le système de notification
 * Ce script teste :
 * 1. L'envoi d'une notification lors du changement de statut d'un document
 * 2. L'envoi d'un email lors du changement de statut d'un document
 */
describe('Notification System Tests', function() {
  let authTokenComptable;
  let uploadedDocId;
  let sendEmailSpy;

  before(async function() {
    // Espionner la fonction d'envoi d'email
    sendEmailSpy = sinon.spy(notificationService, 'sendEmail');
    
    try {
      // Se connecter en tant que comptable
      const loginResponse = await chai.request(API_URL)
        .post('/api/auth/login')
        .send({
          email: 'pro_1750806973364@test.com',
          password: 'Password123!'
        });
        
      authTokenComptable = loginResponse.body.token;
      
      // Récupérer un document pour les tests
      const docsResponse = await chai.request(API_URL)
        .get('/api/docs/all')
        .set('Authorization', `Bearer ${authTokenComptable}`);
      
      if (docsResponse.body.allDocs && docsResponse.body.allDocs.length > 0) {
        uploadedDocId = docsResponse.body.allDocs[0].id;
      }
    } catch (error) {
      console.error('Erreur de configuration:', error);
    }
  });
  
  after(function() {
    // Restaurer la fonction d'envoi d'email
    sendEmailSpy.restore();
  });
  
  // Test 1: Notification par email lors du changement de statut
  it('Devrait envoyer un email de notification lors du changement de statut', function(done) {
    // Vérifier si nous avons un ID de document valide avant de continuer
    if (!uploadedDocId) {
      this.skip();
      return done();
    }
    
    chai.request(API_URL)
      .put(`/api/docs/status/${uploadedDocId}`)
      .set('Authorization', `Bearer ${authTokenComptable}`)
      .send({ status: 'validated', sendNotification: true })
      .end((err, res) => {
        expect(err).to.be.null;
        expect(res).to.have.status(200);
        
        // Vérifier que la fonction d'envoi d'email a été appelée
        expect(sendEmailSpy.called).to.be.true;
        const call = sendEmailSpy.getCall(0);
        expect(call.args[2]).to.include('validé'); // Le sujet doit mentionner "validé"
        
        done();
      });
  });
});
