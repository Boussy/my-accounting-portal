const chai = require('chai');
const chaiHttp = require('chai-http');
const fs = require('fs');
const path = require('path');
const expect = chai.expect;

chai.use(chaiHttp);

const API_URL = 'http://localhost:3000';

/**
 * Tests pour les API de gestion des documents
 * Ce script teste :
 * 1. L'upload de documents
 * 2. La récupération des documents d'un utilisateur
 * 3. La modification du statut d'un document
 * 4. Les notifications de changement de statut
 */
describe('Document API Tests', function() {
  let authToken;
  let authTokenComptable;
  let uploadedDocId;

  before(async function() {
    // Se connecter en tant que client
    try {
      const loginResponse = await chai.request(API_URL)
        .post('/api/auth/login')
        .send({
          email: 'testclient@example.com',
          password: 'TestClient123!'
        });
        
      authToken = loginResponse.body.token;
      
      // Se connecter en tant que comptable/professionnel
      const loginComptableResponse = await chai.request(API_URL)
        .post('/api/auth/login')
        .send({
          email: 'pro_1750806973364@test.com',
          password: 'Password123!'
        });
        
      authTokenComptable = loginComptableResponse.body.token;
    } catch (error) {
      console.error('Erreur de connexion:', error);
    }
  });
  
  // Test 1: Upload d'un document
  it('Devrait uploader un document avec succès', function(done) {
    const testFilePath = path.join(__dirname, 'test-files', 'test-document.pdf');
    
    // Vérifier que le dossier et le fichier existent
    if (!fs.existsSync(path.join(__dirname, 'test-files'))) {
      fs.mkdirSync(path.join(__dirname, 'test-files'), { recursive: true });
    }
    
    // Créer un fichier test si nécessaire
    if (!fs.existsSync(testFilePath)) {
      fs.writeFileSync(testFilePath, 'Test PDF Content');
    }
    
    chai.request(API_URL)
      .post('/api/docs/upload')
      .set('Authorization', `Bearer ${authToken}`)
      .attach('file', testFilePath)
      .end((err, res) => {
        expect(err).to.be.null;
        expect(res).to.have.status(201);
        expect(res.body).to.have.property('message').to.equal('Fichier uploadé avec succès.');
        expect(res.body).to.have.property('documentId');
        expect(res.body).to.have.property('status').to.equal('pending');
        
        // Stocker l'ID du document pour les tests suivants
        uploadedDocId = res.body.documentId;
        done();
      });
  });
  
  // Test 2: Récupération des documents d'un utilisateur
  it('Devrait récupérer les documents du client connecté', function(done) {
    chai.request(API_URL)
      .get('/api/docs/mydocs')
      .set('Authorization', `Bearer ${authToken}`)
      .end((err, res) => {
        expect(err).to.be.null;
        expect(res).to.have.status(200);
        expect(res.body).to.have.property('allDocs').to.be.an('array');
        expect(res.body).to.have.property('byDate').to.be.an('object');
        done();
      });
  });
  
  // Test 3: Récupération de tous les documents par un comptable
  it('Devrait permettre à un comptable de voir tous les documents', function(done) {
    chai.request(API_URL)
      .get('/api/docs/all')
      .set('Authorization', `Bearer ${authTokenComptable}`)
      .end((err, res) => {
        expect(err).to.be.null;
        expect(res).to.have.status(200);
        expect(res.body).to.have.property('allDocs').to.be.an('array');
        expect(res.body).to.have.property('byClient').to.be.an('object');
        done();
      });
  });
  
  // Test 4: Modification du statut d'un document
  it('Devrait permettre à un comptable de modifier le statut d'un document', function(done) {
    // Vérifier si nous avons un ID de document valide avant de continuer
    if (!uploadedDocId) {
      this.skip();
    }
    
    chai.request(API_URL)
      .put(`/api/docs/status/${uploadedDocId}`)
      .set('Authorization', `Bearer ${authTokenComptable}`)
      .send({ status: 'processing' })
      .end((err, res) => {
        expect(err).to.be.null;
        expect(res).to.have.status(200);
        expect(res.body).to.have.property('message').to.equal('Statut mis à jour avec succès.');
        expect(res.body).to.have.property('newStatus').to.equal('processing');
        done();
      });
  });
  
  // Test 5: Un client ne devrait pas pouvoir modifier le statut d'un document
  it('Ne devrait pas permettre à un client de modifier le statut d'un document', function(done) {
    // Vérifier si nous avons un ID de document valide avant de continuer
    if (!uploadedDocId) {
      this.skip();
    }
    
    chai.request(API_URL)
      .put(`/api/docs/status/${uploadedDocId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ status: 'validated' })
      .end((err, res) => {
        expect(res).to.have.status(403); // Accès refusé
        done();
      });
  });
});
