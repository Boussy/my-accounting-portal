const nodemailer = require('nodemailer');
const db = require('../models/db');

/**
 * Service de notification pour le portail comptable
 * Gère l'envoi d'emails et de notifications système
 */
class NotificationService {
  constructor() {
    // Configuration du transporteur d'email
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.example.com',
      port: process.env.EMAIL_PORT || 587,
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER || 'notification@finexpert.com',
        pass: process.env.EMAIL_PASS || 'password'
      }
    });
  }

  /**
   * Envoie un email de notification
   * @param {string} to - Adresse email du destinataire
   * @param {string} name - Nom du destinataire
   * @param {string} subject - Sujet de l'email
   * @param {string} text - Contenu en texte brut
   * @param {string} html - Contenu en HTML (optionnel)
   * @returns {Promise} - Promesse résolue lorsque l'email est envoyé
   */
  async sendEmail(to, name, subject, text, html) {
    // En mode test/développement, ne pas envoyer réellement d'email
    if (process.env.NODE_ENV === 'test') {
      console.log(`[TEST] Email simulé à ${to}: ${subject}`);
      return Promise.resolve({ messageId: 'test-message-id' });
    }

    const mailOptions = {
      from: `"FinExpert Comptabilité" <${process.env.EMAIL_USER || 'notification@finexpert.com'}>`,
      to: to,
      subject: subject,
      text: text,
      html: html || text
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('Email envoyé:', info.messageId);
      return info;
    } catch (error) {
      console.error('Erreur lors de l\'envoi de l\'email:', error);
      throw error;
    }
  }

  /**
   * Notifie un client du changement de statut de son document
   * @param {number} documentId - ID du document
   * @param {string} status - Nouveau statut ('pending', 'processing', 'validated', 'urgent')
   * @returns {Promise} - Promesse résolue lorsque la notification est envoyée
   */
  async notifyDocumentStatusChange(documentId, status) {
    return new Promise((resolve, reject) => {
      // Récupérer les informations sur le document et le client
      db.get(
        `SELECT documents.filename, documents.status, 
                users.email, users.nom, users.prenom
         FROM documents
         JOIN users ON documents.user_id = users.id
         WHERE documents.id = ?`,
        [documentId],
        async (err, doc) => {
          if (err) {
            console.error('Erreur lors de la récupération des informations du document:', err);
            return reject(err);
          }

          if (!doc) {
            return reject(new Error('Document non trouvé'));
          }

          try {
            // Préparer le sujet et le contenu en fonction du statut
            let subject = '';
            let text = '';
            let statusText = '';

            switch (status) {
              case 'processing':
                statusText = 'en cours de traitement';
                break;
              case 'validated':
                statusText = 'validé';
                break;
              case 'urgent':
                statusText = 'marqué comme urgent';
                break;
              default:
                statusText = 'mis à jour';
            }

            subject = `FinExpert: Votre document "${doc.filename}" a été ${statusText}`;
            
            text = `Bonjour ${doc.prenom} ${doc.nom},

Nous vous informons que le statut de votre document "${doc.filename}" a changé.

Nouveau statut: ${statusText.charAt(0).toUpperCase() + statusText.slice(1)}

Vous pouvez consulter ce document et son statut actuel en vous connectant à votre espace client.

Cordialement,
L'équipe FinExpert Comptabilité
            `;

            const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background-color: #9a1f40; color: white; padding: 20px; text-align: center;">
                <h1 style="margin: 0;">FinExpert Comptabilité</h1>
              </div>
              <div style="padding: 20px; border: 1px solid #e1e1e1; border-top: none;">
                <p>Bonjour <strong>${doc.prenom} ${doc.nom}</strong>,</p>
                <p>Nous vous informons que le statut de votre document <strong>"${doc.filename}"</strong> a changé.</p>
                <p style="font-size: 18px; margin: 20px 0;">
                  Nouveau statut: <span style="color: ${
                    status === 'validated' ? 'green' : 
                    status === 'urgent' ? 'red' : 
                    status === 'processing' ? 'blue' : 
                    'orange'
                  }; font-weight: bold;">${statusText.charAt(0).toUpperCase() + statusText.slice(1)}</span>
                </p>
                <p>Vous pouvez consulter ce document et son statut actuel en vous connectant à votre <a href="http://finexpert.com/login" style="color: #9a1f40;">espace client</a>.</p>
                <p style="margin-top: 30px;">Cordialement,<br>L'équipe FinExpert Comptabilité</p>
              </div>
              <div style="background-color: #f5f5f5; color: #666; padding: 10px; text-align: center; font-size: 12px;">
                <p>Ce message est automatique, merci de ne pas y répondre.</p>
              </div>
            </div>
            `;

            // Envoyer l'email
            await this.sendEmail(doc.email, `${doc.prenom} ${doc.nom}`, subject, text, html);
            resolve({ success: true });
          } catch (error) {
            console.error('Erreur lors de l\'envoi de la notification:', error);
            reject(error);
          }
        }
      );
    });
  }
}

module.exports = new NotificationService();
