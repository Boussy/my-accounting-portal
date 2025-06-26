// dashboard-comptable.js
// Fichier JavaScript spécifique au tableau de bord comptable

document.addEventListener('DOMContentLoaded', function() {
  // Variables pour l'API
  const API_URL = 'http://localhost:3000';
  let documentsData = { byClient: {}, allDocs: [] };
  let documentStats = { clientsCount: 0, pendingDocs: 0, processedDocs: 0, urgentDocs: 0 };
  let selectedClient = null;
  
  // Fonction pour charger tous les documents (mode comptable)
  async function loadAllDocuments() {
    try {
      const authToken = localStorage.getItem('authToken');
      if (!authToken) return;

      const response = await fetch(`${API_URL}/api/docs/all`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Échec de la récupération des documents');
      }

      documentsData = await response.json();
      updateClientsDropdown();
      updateDocumentsTable();
      updateStatistics();
    } catch (error) {
      console.error('Erreur lors du chargement des documents:', error);
    }
  }
  
  // Fonction pour mettre à jour la liste déroulante des clients
  function updateClientsDropdown() {
    const clientsDropdown = document.getElementById('client-filter');
    if (!clientsDropdown) return;
    
    // Vider la liste
    clientsDropdown.innerHTML = '<option value="">Tous les clients</option>';
    
    // Trier les clients par ordre alphabétique
    const clients = Object.keys(documentsData.byClient).sort((a, b) => a.localeCompare(b, 'fr'));
    
    // Ajouter chaque client dans la liste
    clients.forEach(client => {
      const option = document.createElement('option');
      option.value = client;
      option.textContent = client;
      clientsDropdown.appendChild(option);
    });
    
    // Mettre à jour le nombre total de clients actifs
    documentStats.clientsCount = clients.length;
    document.getElementById('clients-count').textContent = documentStats.clientsCount;
  }
  
  // Fonction pour mettre à jour le tableau des documents
  function updateDocumentsTable() {
    const tableBody = document.getElementById('documents-table-body');
    if (!tableBody) return;

    // Vider la table
    tableBody.innerHTML = '';
    
    // Récupérer les documents à afficher
    let docsToShow = [];
    const statusFilter = document.getElementById('status-filter').value;
    
    if (selectedClient) {
      // Afficher les documents d'un client spécifique
      const clientDocs = [];
      if (documentsData.byClient[selectedClient]) {
        Object.keys(documentsData.byClient[selectedClient]).forEach(date => {
          documentsData.byClient[selectedClient][date].forEach(doc => {
            clientDocs.push(doc);
          });
        });
      }
      docsToShow = clientDocs;
    } else {
      // Afficher tous les documents
      docsToShow = documentsData.allDocs;
    }
    
    // Filtrer par statut si nécessaire
    if (statusFilter) {
      docsToShow = docsToShow.filter(doc => {
        const status = doc.status || 'pending';
        if (statusFilter === 'urgent') return status === 'urgent';
        if (statusFilter === 'pending') return status === 'pending';
        if (statusFilter === 'processing') return status === 'processing';
        if (statusFilter === 'validated') return status === 'validated';
        return true;
      });
    }
    
    // Trier les documents par date (du plus récent au plus ancien)
    docsToShow.sort((a, b) => {
      return new Date(b.uploaded_at) - new Date(a.uploaded_at);
    });
    
    // Si aucun document à afficher
    if (docsToShow.length === 0) {
      const emptyRow = document.createElement('tr');
      emptyRow.innerHTML = `
        <td colspan="5" class="px-6 py-8 text-center text-gray-500">
          <i class="fas fa-folder-open text-gray-300 text-4xl mb-3"></i>
          <p>Aucun document trouvé</p>
        </td>
      `;
      tableBody.appendChild(emptyRow);
      return;
    }
    
    // Ajouter chaque document dans la table
    docsToShow.forEach(doc => {
      renderDocumentRow(doc, tableBody);
    });
    
    // Ajouter les écouteurs d'événements pour les changements de statut
    addStatusEventListeners();
  }
  
  // Fonction pour rendre une ligne de document
  function renderDocumentRow(doc, tableBody) {
    const row = document.createElement('tr');
    row.className = 'hover:bg-gray-50 transition';
    
    // Récupérer le nom du client
    const clientName = doc.nom && doc.prenom ? `${doc.nom} ${doc.prenom}` : doc.client_email;
    
    // Formater la date
    const uploadDate = new Date(doc.uploaded_at);
    const formattedDate = uploadDate.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    
    const formattedTime = uploadDate.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
    
    // Déterminer le statut du document
    let status = doc.status || 'pending';
    let statusClass = 'bg-yellow-100 text-yellow-800';
    
    if (status === 'processing') {
      statusClass = 'bg-blue-100 text-blue-800';
    } else if (status === 'validated') {
      statusClass = 'bg-green-100 text-green-800';
    } else if (status === 'urgent') {
      statusClass = 'bg-red-100 text-red-800';
    }
    
    // Déterminer l'icône en fonction de l'extension du fichier
    const extension = doc.filename.split('.').pop().toLowerCase();
    let fileIcon = 'far fa-file';
    
    if (['pdf'].includes(extension)) {
      fileIcon = 'far fa-file-pdf';
    } else if (['doc', 'docx'].includes(extension)) {
      fileIcon = 'far fa-file-word';
    } else if (['xls', 'xlsx'].includes(extension)) {
      fileIcon = 'far fa-file-excel';
    } else if (['jpg', 'jpeg', 'png', 'gif'].includes(extension)) {
      fileIcon = 'far fa-file-image';
    }
    
    // Générer les initiales du client pour l'avatar
    const initials = doc.nom && doc.prenom ? `${doc.nom.charAt(0)}${doc.prenom.charAt(0)}`.toUpperCase() : 'CL';
    
    row.innerHTML = `
      <td class="px-6 py-4 whitespace-nowrap">
        <div class="flex items-center">
          <div class="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
            <span class="font-medium text-gray-700">${initials}</span>
          </div>
          <div class="ml-4">
            <div class="text-sm font-medium text-gray-900">${clientName}</div>
            <div class="text-xs text-gray-500">${doc.client_email || ''}</div>
          </div>
        </div>
      </td>
      <td class="px-6 py-4 whitespace-nowrap">
        <div class="flex items-center">
          <i class="${fileIcon} text-custom-red mr-2"></i>
          <div class="text-sm text-gray-900">${doc.filename}</div>
        </div>
      </td>
      <td class="px-6 py-4 whitespace-nowrap">
        <div class="text-sm text-gray-900">${formattedDate}</div>
        <div class="text-xs text-gray-500">${formattedTime}</div>
      </td>
      <td class="px-6 py-4 whitespace-nowrap">
        <select data-doc-id="${doc.id}" class="status-select px-2 py-1 text-xs rounded-full border ${statusClass} focus:outline-none focus:ring-2 focus:ring-custom-red focus:border-custom-red appearance-none cursor-pointer">
          <option value="pending" ${status === 'pending' ? 'selected' : ''}>En attente</option>
          <option value="processing" ${status === 'processing' ? 'selected' : ''}>En traitement</option>
          <option value="validated" ${status === 'validated' ? 'selected' : ''}>Traité</option>
          <option value="urgent" ${status === 'urgent' ? 'selected' : ''}>Urgent</option>
        </select>
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
        <a href="#" class="text-custom-red hover:text-red-800 mr-3 inline-flex items-center preview-document" data-doc-id="${doc.id}" data-filename="${doc.filename}">
          <i class="fas fa-eye mr-1"></i> Voir
        </a>
        <a href="#" class="text-custom-red hover:text-red-800 inline-flex items-center download-document" data-doc-id="${doc.id}">
          <i class="fas fa-download mr-1"></i> Télécharger
        </a>
      </td>
    `;
    
    tableBody.appendChild(row);
  }
  
  // Ajouter les écouteurs d'événements pour les changements de statut
  function addStatusEventListeners() {
    document.querySelectorAll('.status-select').forEach(select => {
      select.addEventListener('change', function() {
        updateDocumentStatus(this.dataset.docId, this.value);
        
        // Mettre à jour la couleur du select
        let statusClass = 'bg-yellow-100 text-yellow-800';
        if (this.value === 'processing') {
          statusClass = 'bg-blue-100 text-blue-800';
        } else if (this.value === 'validated') {
          statusClass = 'bg-green-100 text-green-800';
        } else if (this.value === 'urgent') {
          statusClass = 'bg-red-100 text-red-800';
        }
        
        // Supprimer les classes précédentes
        this.className = this.className
          .replace('bg-yellow-100 text-yellow-800', '')
          .replace('bg-blue-100 text-blue-800', '')
          .replace('bg-green-100 text-green-800', '')
          .replace('bg-red-100 text-red-800', '');
        
        // Ajouter la nouvelle classe
        this.className += ' ' + statusClass;
      });
    });
  }
  
  // Fonction pour mettre à jour le statut d'un document
  async function updateDocumentStatus(docId, status) {
    try {
      const authToken = localStorage.getItem('authToken');
      
      // Appel de l'API pour mettre à jour le statut
      const response = await fetch(`${API_URL}/api/docs/status/${docId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      // Mise à jour du statut localement après confirmation du serveur
      documentsData.allDocs.forEach(doc => {
        if (doc.id === parseInt(docId)) {
          doc.status = status;
        }
      });
      
      // Mettre à jour les statistiques
      updateStatistics();
      
      // Afficher une notification temporaire
      const statusText = {
        'pending': 'En attente',
        'processing': 'En traitement',
        'validated': 'Traité',
        'urgent': 'Urgent'
      }[status];
      
      showNotification(`Statut mis à jour : ${statusText}`);
    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut:', error);
      showNotification('Erreur lors de la mise à jour du statut', true);
    }
  }
  
  // Fonction pour afficher une notification temporaire
  function showNotification(message, isError = false) {
    const notification = document.getElementById('notification');
    if (!notification) return;
    
    notification.textContent = message;
    notification.classList.remove('hidden');
    notification.classList.remove('bg-green-100', 'text-green-800', 'bg-red-100', 'text-red-800');
    
    if (isError) {
      notification.classList.add('bg-red-100', 'text-red-800');
    } else {
      notification.classList.add('bg-green-100', 'text-green-800');
    }
    
    // Masquer après 3 secondes
    setTimeout(() => {
      notification.classList.add('hidden');
    }, 3000);
  }
  
  // Fonction pour mettre à jour les statistiques
  function updateStatistics() {
    // Compter les documents par statut
    documentStats.pendingDocs = documentsData.allDocs.filter(doc => 
      !doc.status || doc.status === 'pending' || doc.status === 'processing'
    ).length;
    
    documentStats.processedDocs = documentsData.allDocs.filter(doc => 
      doc.status === 'validated'
    ).length;
    
    documentStats.urgentDocs = documentsData.allDocs.filter(doc => 
      doc.status === 'urgent'
    ).length;
    
    // Calculer le taux de traitement
    const totalDocs = documentsData.allDocs.length;
    const processingRate = totalDocs > 0 ? Math.round((documentStats.processedDocs / totalDocs) * 100) : 0;
    
    // Mettre à jour les compteurs dans l'interface
    document.getElementById('pending-count').textContent = documentStats.pendingDocs;
    document.getElementById('processed-count').textContent = documentStats.processedDocs;
    document.getElementById('urgent-count').textContent = documentStats.urgentDocs;
    document.getElementById('processing-rate').textContent = `${processingRate}%`;
    
    // Mettre à jour l'information de pagination
    const paginationInfo = document.getElementById('pagination-info');
    if (paginationInfo) {
      paginationInfo.textContent = `${documentsData.allDocs.length} document(s) au total`;
    }
  }
  
  // Fonction pour exporter les documents en CSV
  function exportToCSV() {
    // Récupérer les documents filtrés actuellement affichés
    const tableBody = document.getElementById('documents-table-body');
    if (!tableBody) return;
    
    // Vérifier s'il y a des documents à exporter
    const rows = tableBody.querySelectorAll('tr');
    if (rows.length === 0 || (rows.length === 1 && rows[0].querySelector('td[colspan]'))) {
      showNotification('Aucun document à exporter', true);
      return;
    }
    
    // Construire l'en-tête CSV
    let csvContent = 'Client,Email,Document,Date,Statut\n';
    
    // Parcourir les documents à exporter
    const docsToExport = documentsData.allDocs.filter(doc => {
      if (selectedClient) {
        const clientFullName = `${doc.nom || ''} ${doc.prenom || ''}`.trim();
        if (clientFullName !== selectedClient && doc.client_email !== selectedClient) {
          return false;
        }
      }
      return true;
    });
    
    // Ajouter chaque document au CSV
    docsToExport.forEach(doc => {
      const clientName = doc.nom && doc.prenom ? `${doc.nom} ${doc.prenom}` : 'N/A';
      const clientEmail = doc.client_email || 'N/A';
      const docName = doc.filename || 'N/A';
      const uploadDate = new Date(doc.uploaded_at).toLocaleDateString('fr-FR');
      
      // Déterminer le statut du document
      let status = 'En attente';
      if (doc.status === 'processing') status = 'En traitement';
      else if (doc.status === 'validated') status = 'Traité';
      else if (doc.status === 'urgent') status = 'Urgent';
      
      // Échapper les virgules dans les champs
      const escapeField = field => `"${field.replace(/"/g, '""')}"`;
      
      // Ajouter la ligne au CSV
      csvContent += `${escapeField(clientName)},${escapeField(clientEmail)},${escapeField(docName)},${escapeField(uploadDate)},${escapeField(status)}\n`;
    });
    
    // Créer un fichier Blob pour le téléchargement
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    // Créer un lien de téléchargement
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `documents_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.display = 'none';
    
    // Ajouter le lien au document et déclencher le téléchargement
    document.body.appendChild(link);
    link.click();
    
    // Nettoyer
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showNotification('Export CSV réussi');
  }
  
  // Fonction pour imprimer les documents
  function printDocuments() {
    // Créer une nouvelle fenêtre pour l'impression
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showNotification('Veuillez autoriser les popups pour l\'impression', true);
      return;
    }
    
    // Construire le contenu HTML pour l'impression
    const printContent = `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <title>Documents FinExpert Comptabilité</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #9a1f40; text-align: center; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background-color: #9a1f40; color: white; padding: 10px; text-align: left; }
          td { padding: 8px; border-bottom: 1px solid #ddd; }
          .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
          @media print {
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <h1>Liste des Documents - FinExpert Comptabilité</h1>
        <p>Date d'impression: ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        <div class="no-print" style="text-align: right; margin-bottom: 20px;">
          <button onclick="window.print();" style="background: #9a1f40; color: white; border: none; padding: 8px 16px; cursor: pointer; border-radius: 4px;">Imprimer</button>
        </div>
        <table>
          <thead>
            <tr>
              <th>Client</th>
              <th>Document</th>
              <th>Date</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            ${generatePrintRows()}
          </tbody>
        </table>
        <div class="footer">
          &copy; 2025 FinExpert Comptabilité - Document généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}
        </div>
      </body>
      </html>
    `;
    
    // Écrire le contenu dans la nouvelle fenêtre
    printWindow.document.open();
    printWindow.document.write(printContent);
    printWindow.document.close();
    
    // Fonction pour générer les lignes du tableau
    function generatePrintRows() {
      // Filtrer les documents selon les critères actuels
      const filteredDocs = documentsData.allDocs.filter(doc => {
        if (selectedClient) {
          const clientFullName = `${doc.nom || ''} ${doc.prenom || ''}`.trim();
          if (clientFullName !== selectedClient && doc.client_email !== selectedClient) {
            return false;
          }
        }
        return true;
      });
      
      // Si aucun document à imprimer
      if (filteredDocs.length === 0) {
        return '<tr><td colspan="4" style="text-align: center; padding: 20px;">Aucun document à imprimer</td></tr>';
      }
      
      // Générer le HTML pour chaque ligne
      return filteredDocs.map(doc => {
        const clientName = doc.nom && doc.prenom ? `${doc.nom} ${doc.prenom}` : doc.client_email;
        const docName = doc.filename;
        const uploadDate = new Date(doc.uploaded_at).toLocaleDateString('fr-FR');
        
        // Déterminer le statut du document
        let status = 'En attente';
        let statusStyle = 'color: #9ca3af;';
        
        if (doc.status === 'processing') {
          status = 'En traitement';
          statusStyle = 'color: #3b82f6;';
        } else if (doc.status === 'validated') {
          status = 'Traité';
          statusStyle = 'color: #10b981;';
        } else if (doc.status === 'urgent') {
          status = 'Urgent';
          statusStyle = 'color: #ef4444;';
        }
        
        return `
          <tr>
            <td>${clientName}</td>
            <td>${docName}</td>
            <td>${uploadDate}</td>
            <td style="${statusStyle}">${status}</td>
          </tr>
        `;
      }).join('');
    }
    
    // Afficher une notification
    showNotification('Préparation de l\'impression...');
  }
  
  // Fonction pour appliquer tous les filtres
  function applyFilters() {
    updateDocumentsTable();
  }
  
  // Fonction pour réinitialiser tous les filtres
  function resetAllFilters() {
    // Réinitialiser les valeurs des filtres
    document.getElementById('status-filter').value = '';
    document.getElementById('client-filter').value = '';
    document.getElementById('doctype-filter').value = '';
    document.getElementById('date-from').value = '';
    document.getElementById('date-to').value = '';
    document.getElementById('search-input').value = '';
    
    // Réinitialiser la variable de client sélectionné
    selectedClient = null;
    
    // Appliquer les filtres réinitialisés
    applyFilters();
  }
  
  // Initialisation
  loadAllDocuments();
  
  // Gestionnaire d'événements pour le filtre client
  const clientFilter = document.getElementById('client-filter');
  if (clientFilter) {
    clientFilter.addEventListener('change', function() {
      selectedClient = this.value;
      applyFilters();
    });
  }
  
  // Gestionnaire d'événements pour le filtre de statut
  const statusFilter = document.getElementById('status-filter');
  if (statusFilter) {
    statusFilter.addEventListener('change', function() {
      applyFilters();
    });
  }
  
  // Gestionnaire d'événements pour le filtre de type de document
  const doctypeFilter = document.getElementById('doctype-filter');
  if (doctypeFilter) {
    doctypeFilter.addEventListener('change', function() {
      applyFilters();
    });
  }
  
  // Gestionnaires d'événements pour les filtres de date
  const dateFromFilter = document.getElementById('date-from');
  const dateToFilter = document.getElementById('date-to');
  
  if (dateFromFilter) {
    dateFromFilter.addEventListener('change', function() {
      applyFilters();
    });
  }
  
  if (dateToFilter) {
    dateToFilter.addEventListener('change', function() {
      applyFilters();
    });
  }
  
  // Gestionnaire pour la recherche
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    let debounceTimer;
    searchInput.addEventListener('input', function() {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (this.value.length >= 2 || this.value.length === 0) {
          applyFilters();
        }
      }, 300);
    });
  }
  
  // Gestionnaire pour le bouton de réinitialisation des filtres
  const resetFiltersBtn = document.getElementById('reset-filters');
  if (resetFiltersBtn) {
    resetFiltersBtn.addEventListener('click', resetAllFilters);
  }
  
  // Gestionnaire pour les boutons d'exportation et d'impression
  const exportBtn = document.getElementById('export-csv');
  if (exportBtn) {
    exportBtn.addEventListener('click', exportToCSV);
  }
  
  const printBtn = document.getElementById('print-docs');
  if (printBtn) {
    printBtn.addEventListener('click', printDocuments);
  }
});
