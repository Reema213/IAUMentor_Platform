const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user') || '{}');

if (!token) {
    window.location.href = '/login.html';
}

async function fetchWithAuth(url, options = {}) {
    const defaultOptions = {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    };
    
    if (options.body && !(options.body instanceof FormData)) {
        defaultOptions.headers['Content-Type'] = 'application/json';
    }
    
    const response = await fetch(url, { ...defaultOptions, ...options });
    
    if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login.html';
        return null;
    }
    
    return response;
}

document.getElementById('logoutBtn').addEventListener('click', async () => {
    await fetchWithAuth('/api/auth/logout', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    });
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login.html';
});

const viewLinks = document.querySelectorAll('.sidebar-menu a[data-view]');
viewLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        
        viewLinks.forEach(l => l.parentElement.classList.remove('active'));
        link.parentElement.classList.add('active');
        
        const view = link.dataset.view;
        document.querySelectorAll('.content-section').forEach(s => s.classList.add('hidden'));
        document.getElementById(`${view}View`).classList.remove('hidden');
        
        if (view === 'browse') {
            loadAllResources();
        } else if (view === 'my') {
            loadMyResources();
        }
    });
});

async function loadAllResources() {
    const response = await fetch('/api/resources');
    if (!response) return;
    
    const data = await response.json();
    
    if (data.status === 'success') {
        displayResources(data.resources, 'resourcesGrid', false);
    }
}

async function loadMyResources() {
    const response = await fetchWithAuth('/api/resources/my');
    if (!response) return;
    
    const data = await response.json();
    
    if (data.status === 'success') {
        displayResources(data.resources, 'myResourcesGrid', true);
    }
}

function displayResources(resources, containerId, isOwner) {
    const grid = document.getElementById(containerId);
    
    if (resources.length === 0) {
        grid.innerHTML = '<p class="text-muted">No resources available</p>';
        return;
    }
    
    grid.innerHTML = resources.map(resource => {
        const rating = resource.avg_rating ? Number(resource.avg_rating).toFixed(1) : 'N/A';
        const tags = resource.tags ? resource.tags.split(',').map(t => t.trim()).slice(0, 3) : [];
        const date = new Date(resource.created_at).toLocaleDateString();
        const fileName = resource.file_url.split('/').pop();
        const fileExt = fileName.split('.').pop().toLowerCase();
        
        let fileIcon = '📄';
        if (['pdf'].includes(fileExt)) fileIcon = '📕';
        else if (['doc', 'docx'].includes(fileExt)) fileIcon = '📘';
        else if (['ppt', 'pptx'].includes(fileExt)) fileIcon = '📊';
        else if (['xls', 'xlsx'].includes(fileExt)) fileIcon = '📗';
        else if (['zip', 'rar'].includes(fileExt)) fileIcon = '📦';
        else if (['jpg', 'jpeg', 'png'].includes(fileExt)) fileIcon = '🖼️';
        
        return `
            <div class="mentor-card" onclick="viewResourceDetail(${resource.resource_id})">
                <div class="mentor-header">
                    <h3>${fileIcon} ${resource.title}</h3>
                    <div class="mentor-rating">
                        <span>⭐ ${rating}</span>
                        <span>•</span>
                        <span>${resource.rating_count || 0} ratings</span>
                    </div>
                </div>
                
                <div class="mentor-bio">
                    ${resource.description}
                </div>
                
                ${tags.length > 0 ? `
                    <div class="mentor-interests">
                        ${tags.map(tag => `<span class="interest-tag">${tag}</span>`).join('')}
                    </div>
                ` : ''}
                
                <div class="mentor-footer">
                    <span class="mentor-stats">👤 ${isOwner ? 'You' : resource.owner_name}</span>
                    <span class="mentor-stats">📅 ${date}</span>
                </div>
                
                <div style="display: flex; gap: 0.5rem; margin-top: 1rem;">
                    <a href="${resource.file_url}" download class="btn-primary" style="flex: 1; text-align: center;" onclick="event.stopPropagation()">Download</a>
                    ${isOwner ? `
                        <button class="btn-danger" onclick="event.stopPropagation(); deleteResource(${resource.resource_id})">Delete</button>
                    ` : `
                        <button class="btn-secondary" onclick="event.stopPropagation(); openRatingModal(${resource.resource_id})">Rate</button>
                    `}
                </div>
            </div>
        `;
    }).join('');
}

async function viewResourceDetail(resourceId) {
    const modal = document.getElementById('resourceDetailModal');
    const modalBody = document.getElementById('resourceModalBody');
    
    modalBody.innerHTML = '<p class="text-muted">Loading resource details...</p>';
    modal.classList.remove('hidden');
    
    const response = await fetch(`/api/resources/${resourceId}`);
    const data = await response.json();
    
    if (data.status === 'success') {
        const resource = data.resource;
        const rating = resource.avg_rating ? Number(resource.avg_rating).toFixed(1) : 'N/A';
        const tags = resource.tags ? resource.tags.split(',').map(t => t.trim()) : [];
        const date = new Date(resource.created_at).toLocaleDateString();
        
        modalBody.innerHTML = `
            <h2>${resource.title}</h2>
            <div style="margin: 1rem 0;">
                <p><strong>⭐ Rating:</strong> ${rating} (${resource.rating_count} ratings)</p>
                <p><strong>👤 Owner:</strong> ${resource.owner_name}</p>
                <p><strong>📅 Uploaded:</strong> ${date}</p>
            </div>
            
            <h3>Description</h3>
            <p>${resource.description}</p>
            
            ${tags.length > 0 ? `
                <h3>Tags</h3>
                <div class="mentor-interests">
                    ${tags.map(tag => `<span class="interest-tag">${tag}</span>`).join('')}
                </div>
            ` : ''}
            
            <h3>Ratings & Reviews</h3>
            ${data.ratings.length > 0 ? `
                <div class="feedback-list">
                    ${data.ratings.map(rating => {
                        const stars = '⭐'.repeat(rating.stars);
                        const date = new Date(rating.created_at).toLocaleDateString();
                        return `
                            <div class="feedback-item">
                                <div class="feedback-header">
                                    <span class="feedback-author">${rating.user_name}</span>
                                    <span class="feedback-date">${date}</span>
                                </div>
                                <div class="feedback-rating">${stars}</div>
                                ${rating.comment ? `<p class="feedback-comment">${rating.comment}</p>` : ''}
                            </div>
                        `;
                    }).join('')}
                </div>
            ` : '<p class="text-muted">No ratings yet</p>'}
            
            <div style="display: flex; gap: 1rem; margin-top: 2rem;">
                <a href="${resource.file_url}" download class="btn-primary" style="flex: 1; text-align: center;">Download</a>
                <button class="btn-secondary" onclick="openRatingModal(${resource.resource_id})">Rate Resource</button>
                <button class="btn-danger" onclick="openReportModal(${resource.resource_id})">Report</button>
            </div>
        `;
    }
}

document.getElementById('searchBtn').addEventListener('click', async () => {
    const query = document.getElementById('searchInput').value.trim();
    
    if (!query) {
        loadAllResources();
        return;
    }
    
    const response = await fetch(`/api/resources/search?query=${encodeURIComponent(query)}`);
    const data = await response.json();
    
    if (data.status === 'success') {
        displayResources(data.resources, 'resourcesGrid', false);
    }
});

document.getElementById('searchInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        document.getElementById('searchBtn').click();
    }
});

document.getElementById('uploadResourceForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData();
    formData.append('title', document.getElementById('resourceTitle').value);
    formData.append('description', document.getElementById('resourceDescription').value);
    formData.append('tags', document.getElementById('resourceTags').value);
    formData.append('file', document.getElementById('resourceFile').files[0]);
    
    const uploadBtn = document.getElementById('uploadBtn');
    uploadBtn.disabled = true;
    uploadBtn.innerHTML = '<span class="loading"></span> Uploading...';
    
    const response = await fetchWithAuth('/api/resources/upload', {
        method: 'POST',
        body: formData
    });
    
    uploadBtn.disabled = false;
    uploadBtn.innerHTML = 'Upload Resource';
    
    if (!response) return;
    
    const data = await response.json();
    
    const alertsDiv = document.getElementById('uploadAlerts');
    if (data.status === 'success') {
        alertsDiv.innerHTML = '<div class="alert alert-success">Resource uploaded successfully!</div>';
        document.getElementById('uploadResourceForm').reset();
        setTimeout(() => {
            alertsDiv.innerHTML = '';
            document.querySelector('[data-view="my"]').click();
        }, 2000);
    } else {
        alertsDiv.innerHTML = `<div class="alert alert-error">${data.message}</div>`;
    }
});

function openRatingModal(resourceId) {
    document.getElementById('ratingResourceId').value = resourceId;
    document.getElementById('ratingModal').classList.remove('hidden');
    closeResourceModal();
}

function closeRatingModal() {
    document.getElementById('ratingModal').classList.add('hidden');
    document.getElementById('ratingForm').reset();
}

document.getElementById('ratingForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const resourceId = document.getElementById('ratingResourceId').value;
    const stars = document.getElementById('ratingStars').value;
    const comment = document.getElementById('ratingComment').value;
    
    const response = await fetchWithAuth('/api/resources/rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resourceId: parseInt(resourceId), stars: parseInt(stars), comment })
    });
    
    if (!response) return;
    
    const data = await response.json();
    
    if (data.status === 'success') {
        alert('Rating submitted successfully!');
        closeRatingModal();
        loadAllResources();
    } else {
        alert(data.message);
    }
});

function openReportModal(resourceId) {
    document.getElementById('reportResourceId').value = resourceId;
    document.getElementById('reportModal').classList.remove('hidden');
    closeResourceModal();
}

function closeReportModal() {
    document.getElementById('reportModal').classList.add('hidden');
    document.getElementById('reportForm').reset();
}

document.getElementById('reportForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const resourceId = document.getElementById('reportResourceId').value;
    const reason = document.getElementById('reportReason').value;
    
    const response = await fetchWithAuth('/api/resources/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resourceId: parseInt(resourceId), reason })
    });
    
    if (!response) return;
    
    const data = await response.json();
    
    if (data.status === 'success') {
        alert('Report submitted successfully. Thank you for helping maintain quality.');
        closeReportModal();
    } else {
        alert(data.message);
    }
});

async function deleteResource(resourceId) {
    if (!confirm('Are you sure you want to delete this resource? This action cannot be undone.')) {
        return;
    }
    
    const response = await fetchWithAuth(`/api/resources/${resourceId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response) return;
    
    const data = await response.json();
    
    if (data.status === 'success') {
        alert('Resource deleted successfully');
        loadMyResources();
    } else {
        alert(data.message);
    }
}

function closeResourceModal() {
    document.getElementById('resourceDetailModal').classList.add('hidden');
}

window.onclick = function(event) {
    const resourceModal = document.getElementById('resourceDetailModal');
    const ratingModal = document.getElementById('ratingModal');
    const reportModal = document.getElementById('reportModal');
    
    if (event.target === resourceModal) {
        closeResourceModal();
    } else if (event.target === ratingModal) {
        closeRatingModal();
    } else if (event.target === reportModal) {
        closeReportModal();
    }
};

window.viewResourceDetail = viewResourceDetail;
window.openRatingModal = openRatingModal;
window.openReportModal = openReportModal;
window.deleteResource = deleteResource;

loadAllResources();