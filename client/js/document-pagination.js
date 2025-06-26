// Pagination pour les tableaux de documents
document.addEventListener('DOMContentLoaded', function() {
  // Configuration
  const itemsPerPage = 10;
  let currentPage = 1;
  let totalPages = 1;
  let currentData = [];
  
  // Éléments du DOM
  const paginationStart = document.getElementById('pagination-start');
  const paginationEnd = document.getElementById('pagination-end');
  const paginationTotal = document.getElementById('pagination-total');
  const pageNumbers = document.getElementById('page-numbers');
  const prevPageBtn = document.getElementById('prev-page');
  const nextPageBtn = document.getElementById('next-page');
  
  // Fonction pour paginer les données
  window.paginateData = function(data, page = 1) {
    // Mettre à jour les variables
    currentData = data;
    currentPage = page;
    totalPages = Math.max(1, Math.ceil(data.length / itemsPerPage));
    
    // Calculer les indices
    const startIdx = (page - 1) * itemsPerPage;
    const endIdx = Math.min(startIdx + itemsPerPage, data.length);
    
    // Mettre à jour les informations de pagination
    if (paginationStart) paginationStart.textContent = data.length > 0 ? startIdx + 1 : 0;
    if (paginationEnd) paginationEnd.textContent = endIdx;
    if (paginationTotal) paginationTotal.textContent = data.length;
    
    // Générer les numéros de page
    generatePageNumbers();
    
    // Mettre à jour l'état des boutons précédent/suivant
    updatePaginationControls();
    
    // Retourner la sous-section des données
    return data.slice(startIdx, endIdx);
  };
  
  // Fonction pour générer les boutons de numéro de page
  function generatePageNumbers() {
    if (!pageNumbers) return;
    
    pageNumbers.innerHTML = '';
    
    // Limiter le nombre de boutons affichés
    let pagesToShow = [];
    const maxButtonsToShow = 5;
    
    if (totalPages <= maxButtonsToShow) {
      // Si peu de pages, montrer toutes les pages
      pagesToShow = Array.from({length: totalPages}, (_, i) => i + 1);
    } else {
      // Toujours montrer la première page
      pagesToShow.push(1);
      
      // Calculer la plage autour de la page actuelle
      const rangeStart = Math.max(2, currentPage - 1);
      const rangeEnd = Math.min(totalPages - 1, currentPage + 1);
      
      // Ajouter des points de suspension si nécessaire après la page 1
      if (rangeStart > 2) {
        pagesToShow.push('...');
      }
      
      // Ajouter les pages dans la plage
      for (let i = rangeStart; i <= rangeEnd; i++) {
        pagesToShow.push(i);
      }
      
      // Ajouter des points de suspension si nécessaire avant la dernière page
      if (rangeEnd < totalPages - 1) {
        pagesToShow.push('...');
      }
      
      // Toujours montrer la dernière page
      if (totalPages > 1) {
        pagesToShow.push(totalPages);
      }
    }
    
    // Créer les boutons de page
    pagesToShow.forEach(page => {
      if (page === '...') {
        // Points de suspension
        const ellipsis = document.createElement('span');
        ellipsis.className = 'px-3 py-1 text-gray-500';
        ellipsis.textContent = '...';
        pageNumbers.appendChild(ellipsis);
      } else {
        // Bouton de page numérotée
        const button = document.createElement('button');
        button.className = page === currentPage 
          ? 'px-3 py-1 rounded-md bg-custom-red text-white' 
          : 'px-3 py-1 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200';
        button.textContent = page;
        
        if (page !== currentPage) {
          button.addEventListener('click', () => goToPage(page));
        }
        
        pageNumbers.appendChild(button);
      }
    });
  }
  
  // Fonction pour mettre à jour l'état des boutons de pagination
  function updatePaginationControls() {
    if (prevPageBtn) {
      prevPageBtn.disabled = currentPage <= 1;
    }
    
    if (nextPageBtn) {
      nextPageBtn.disabled = currentPage >= totalPages;
    }
  }
  
  // Fonction pour aller à une page spécifique
  function goToPage(page) {
    if (page < 1 || page > totalPages) return;
    
    const paginatedData = window.paginateData(currentData, page);
    
    // Mettre à jour la table
    if (window.renderPaginatedDocuments) {
      window.renderPaginatedDocuments(paginatedData);
    } else if (window.updateDocumentsTable) {
      // Fallback pour la compatibilité avec le code existant
      window.updateDocumentsTable(paginatedData);
    }
  }
  
  // Initialisation des écouteurs d'événements
  if (prevPageBtn) {
    prevPageBtn.addEventListener('click', () => {
      if (currentPage > 1) {
        goToPage(currentPage - 1);
      }
    });
  }
  
  if (nextPageBtn) {
    nextPageBtn.addEventListener('click', () => {
      if (currentPage < totalPages) {
        goToPage(currentPage + 1);
      }
    });
  }
  
  // Exposer la fonction pour changer de page
  window.goToDocumentsPage = goToPage;
});
