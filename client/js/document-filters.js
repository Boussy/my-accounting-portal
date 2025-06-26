// Fichier de gestion des filtres avancés pour les documents
document.addEventListener('DOMContentLoaded', function() {
  // Constantes et variables
  const API_URL = 'http://localhost:3000';
  
  // Éléments du DOM pour les filtres
  const statusFilter = document.getElementById('status-filter');
  const clientFilter = document.getElementById('client-filter');
  const doctypeFilter = document.getElementById('doctype-filter');
  const dateFromFilter = document.getElementById('date-from');
  const dateToFilter = document.getElementById('date-to');
  const searchInput = document.getElementById('search-input');
  const resetFiltersBtn = document.getElementById('reset-filters');
  
  // Initialiser les écouteurs d'événements si les éléments existent
  function initializeEventListeners() {
    // Filtres de base
    if (statusFilter) {
      statusFilter.addEventListener('change', applyFilters);
    }
    
    if (clientFilter) {
      clientFilter.addEventListener('change', function() {
        window.selectedClient = this.value;
        applyFilters();
      });
    }
    
    if (doctypeFilter) {
      doctypeFilter.addEventListener('change', applyFilters);
    }
    
    // Filtres de date
    if (dateFromFilter) {
      dateFromFilter.addEventListener('change', applyFilters);
    }
    
    if (dateToFilter) {
      dateToFilter.addEventListener('change', applyFilters);
    }
    
    // Recherche avec debounce
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
    
    // Bouton de réinitialisation
    if (resetFiltersBtn) {
      resetFiltersBtn.addEventListener('click', resetAllFilters);
    }
  }
  
  // Fonction exportée pour appliquer tous les filtres
  window.applyFilters = function() {
    // Récupérer les valeurs des filtres
    const statusValue = statusFilter ? statusFilter.value : '';
    const clientValue = window.selectedClient || '';
    const doctypeValue = doctypeFilter ? doctypeFilter.value : '';
    const dateFromValue = dateFromFilter ? dateFromFilter.value : '';
    const dateToValue = dateToFilter ? dateToFilter.value : '';
    const searchValue = searchInput ? searchInput.value.toLowerCase() : '';
    
    // Commencer avec tous les documents
    let docsFiltered = window.documentsData.allDocs;
    
    // Filtrer par client
    if (clientValue) {
      docsFiltered = docsFiltered.filter(doc => {
        const clientFullName = `${doc.nom || ''} ${doc.prenom || ''}`.trim();
        return clientFullName === clientValue || doc.client_email === clientValue;
      });
    }
    
    // Filtrer par statut
    if (statusValue) {
      docsFiltered = docsFiltered.filter(doc => {
        const status = doc.status || 'pending';
        return status === statusValue;
      });
    }
    
    // Filtrer par type de document
    if (doctypeValue) {
      docsFiltered = docsFiltered.filter(doc => {
        const extension = doc.filename.split('.').pop().toLowerCase();
        if (doctypeValue === 'other') {
          // Filtrer les documents qui ne sont pas dans les catégories connues
          const knownExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png', 'gif'];
          return !knownExtensions.includes(extension);
        }
        // Filtrer par extensions séparées par des virgules
        return doctypeValue.split(',').includes(extension);
      });
    }
    
    // Filtrer par date de début
    if (dateFromValue) {
      const fromDate = new Date(dateFromValue);
      docsFiltered = docsFiltered.filter(doc => {
        const uploadDate = new Date(doc.uploaded_at);
        return uploadDate >= fromDate;
      });
    }
    
    // Filtrer par date de fin
    if (dateToValue) {
      const toDate = new Date(dateToValue);
      // Ajouter 24h pour inclure toute la journée
      toDate.setHours(23, 59, 59, 999);
      docsFiltered = docsFiltered.filter(doc => {
        const uploadDate = new Date(doc.uploaded_at);
        return uploadDate <= toDate;
      });
    }
    
    // Filtrer par recherche textuelle
    if (searchValue) {
      docsFiltered = docsFiltered.filter(doc => {
        const clientFullName = `${doc.nom || ''} ${doc.prenom || ''}`.trim().toLowerCase();
        const docName = doc.filename.toLowerCase();
        const clientEmail = (doc.client_email || '').toLowerCase();
        
        return clientFullName.includes(searchValue) || 
               docName.includes(searchValue) || 
               clientEmail.includes(searchValue);
      });
    }
    
    // Rendre les documents filtrés
    if (window.renderFilteredDocuments) {
      window.renderFilteredDocuments(docsFiltered);
    } else {
      console.error('La fonction renderFilteredDocuments n\'est pas définie');
    }
  };
  
  // Fonction exportée pour réinitialiser tous les filtres
  window.resetAllFilters = function() {
    // Réinitialiser les valeurs des filtres
    if (statusFilter) statusFilter.value = '';
    if (clientFilter) clientFilter.value = '';
    if (doctypeFilter) doctypeFilter.value = '';
    if (dateFromFilter) dateFromFilter.value = '';
    if (dateToFilter) dateToFilter.value = '';
    if (searchInput) searchInput.value = '';
    
    // Réinitialiser les variables globales
    window.selectedClient = null;
    
    // Mettre à jour l'affichage
    applyFilters();
    
    // Afficher une notification de réinitialisation si la fonction existe
    if (window.showNotification) {
      window.showNotification('Filtres réinitialisés');
    }
  };
  
  // Initialiser les écouteurs d'événements
  initializeEventListeners();
});
