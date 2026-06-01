const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user') || '{}');

if (!token || user.role !== 'admin') {
    alert('Access denied. Admin only.');
    window.location.href = '/dashboard.html';
}

async function fetchWithAuth(url, options = {}) {
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    };
    
    const response = await fetch(url, { ...defaultOptions, ...options });
    
    if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login.html';
        return null;
    }
    
    return response;
}

document.getElementById('logoutBtn').addEventListener('click', async () => {
    await fetchWithAuth('/api/auth/logout', { method: 'POST' });
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
        
        if (view === 'stats') {
            loadStats();
        } else if (view === 'users') {
            loadUsers();
        } else if (view === 'reports') {
            loadReports();
        } else if (view === 'announcements') {
            loadAnnouncements();
        }
    });
});

async function loadStats() {
    const response = await fetchWithAuth('/api/admin/stats');
    if (!response) return;
    
    const data = await response.json();
    
    if (data.status === 'success') {
        displayStats(data.stats);
    }
}

function displayStats(stats) {
    const userStatsHtml = stats.users.map(u => `
        <div class="stat-card">
            <div class="stat-icon">👤</div>
            <div class="stat-info">
                <h3>${u.count}</h3>
                <p>${u.role}s</p>
            </div>
        </div>
    `).join('');
    document.getElementById('userStatsGrid').innerHTML = userStatsHtml;
    
    const sessionStatsHtml = stats.sessions.map(s => `
        <div class="stat-card">
            <div class="stat-icon">📚</div>
            <div class="stat-info">
                <h3>${s.count}</h3>
                <p>${s.status}</p>
            </div>
        </div>
    `).join('');
    document.getElementById('sessionStatsGrid').innerHTML = sessionStatsHtml;
    
    document.getElementById('contentStatsGrid').innerHTML = `
        <div class="stat-card">
            <div class="stat-icon">📖</div>
            <div class="stat-info">
                <h3>${stats.resources}</h3>
                <p>Resources</p>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon">📅</div>
            <div class="stat-info">
                <h3>${stats.events}</h3>
                <p>Active Events</p>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon">💬</div>
            <div class="stat-info">
                <h3>${stats.messages}</h3>
                <p>Messages</p>
            </div>
        </div>
    `;
    
    const reportStatsHtml = stats.reports.map(r => `
        <div class="stat-card">
            <div class="stat-icon">🚨</div>
            <div class="stat-info">
                <h3>${r.count}</h3>
                <p>${r.status}</p>
            </div>
        </div>
    `).join('');
    document.getElementById('reportStatsGrid').innerHTML = reportStatsHtml || '<p class="text-muted">No reports</p>';
}

let allUsers = [];

async function loadUsers() {
    const response = await fetchWithAuth('/api/admin/users');
    if (!response) return;
    
    const data = await response.json();
    
    if (data.status === 'success') {
        allUsers = data.users;
        displayUsers(allUsers);
    }
}

function displayUsers(users) {
    const table = document.getElementById('usersTable');
    
    if (users.length === 0) {
        table.innerHTML = '<p class="text-muted">No users found</p>';
        return;
    }
    
    table.innerHTML = `
        <table style="width: 100%; border-collapse: collapse;">
            <thead>
                <tr style="background: var(--light-color); text-align: left;">
                    <th style="padding: 1rem; border-bottom: 2px solid var(--border-color);">ID</th>
                    <th style="padding: 1rem; border-bottom: 2px solid var(--border-color);">Name</th>
                    <th style="padding: 1rem; border-bottom: 2px solid var(--border-color);">Email</th>
                    <th style="padding: 1rem; border-bottom: 2px solid var(--border-color);">Role</th>
                    <th style="padding: 1rem; border-bottom: 2px solid var(--border-color);">Activity</th>
                    <th style="padding: 1rem; border-bottom: 2px solid var(--border-color);">Actions</th>
                </tr>
            </thead>
            <tbody>
                ${users.map(u => `
                    <tr style="border-bottom: 1px solid var(--border-color);">
                        <td style="padding: 1rem;">${u.user_id}</td>
                        <td style="padding: 1rem;">${u.name}</td>
                        <td style="padding: 1rem;">${u.email}</td>
                        <td style="padding: 1rem;">
                            <select onchange="updateUserRole(${u.user_id}, this.value)" style="padding: 0.5rem; border: 1px solid var(--border-color); border-radius: 4px;">
                                <option value="mentee" ${u.role === 'mentee' ? 'selected' : ''}>Mentee</option>
                                <option value="mentor" ${u.role === 'mentor' ? 'selected' : ''}>Mentor</option>
                                <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
                            </select>
                        </td>
                        <td style="padding: 1rem; font-size: 0.875rem;">
                            Sessions: ${u.total_sessions}<br>
                            Resources: ${u.total_resources}<br>
                            Events: ${u.total_events}
                        </td>
                        <td style="padding: 1rem;">
                            <button class="btn-danger" onclick="deleteUser(${u.user_id}, '${u.name}')">Delete</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

document.getElementById('userSearch').addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    const filtered = allUsers.filter(u => 
        u.name.toLowerCase().includes(query) || 
        u.email.toLowerCase().includes(query)
    );
    displayUsers(filtered);
});

window.updateUserRole = async function(userId, newRole) {
    const response = await fetchWithAuth('/api/admin/users/role', {
        method: 'PUT',
        body: JSON.stringify({ userId, role: newRole })
    });
    
    if (!response) return;
    
    const data = await response.json();
    
    const alertsDiv = document.getElementById('userAlerts');
    if (data.status === 'success') {
        alertsDiv.innerHTML = '<div class="alert alert-success">User role updated successfully</div>';
        setTimeout(() => alertsDiv.innerHTML = '', 3000);
        loadUsers();
    } else {
        alertsDiv.innerHTML = `<div class="alert alert-error">${data.message}</div>`;
    }
};

window.deleteUser = async function(userId, userName) {
    if (!confirm(`Are you sure you want to delete user "${userName}"? This action cannot be undone.`)) {
        return;
    }
    
    const response = await fetchWithAuth(`/api/admin/users/${userId}`, {
        method: 'DELETE'
    });
    
    if (!response) return;
    
    const data = await response.json();
    
    const alertsDiv = document.getElementById('userAlerts');
    if (data.status === 'success') {
        alertsDiv.innerHTML = '<div class="alert alert-success">User deleted successfully</div>';
        setTimeout(() => alertsDiv.innerHTML = '', 3000);
        loadUsers();
    } else {
        alertsDiv.innerHTML = `<div class="alert alert-error">${data.message}</div>`;
    }
};

async function loadReports() {
    const response = await fetchWithAuth('/api/admin/reports');
    if (!response) return;
    
    const data = await response.json();
    
    if (data.status === 'success') {
        displayReports(data.reports);
    }
}

function displayReports(reports) {
    const table = document.getElementById('reportsTable');
    
    if (reports.length === 0) {
        table.innerHTML = '<div class="card"><p class="text-muted">No reports found</p></div>';
        return;
    }
    
    table.innerHTML = reports.map(r => {
        const date = new Date(r.created_at).toLocaleString();
        
        return `
            <div class="card">
                <h3>${r.target_type} Report #${r.report_id}</h3>
                <p><strong>Reported by:</strong> ${r.reporter_name} (${r.reporter_email})</p>
                <p><strong>Target:</strong> ${r.target_title || 'N/A'}</p>
                <p><strong>Reason:</strong> ${r.reason}</p>
                <p><strong>Date:</strong> ${date}</p>
                <p><strong>Status:</strong> <span class="status ${r.status}">${r.status}</span></p>
                
                ${r.status === 'pending' ? `
                    <div style="display: flex; gap: 1rem; margin-top: 1rem;">
                        <button class="btn-danger" onclick="deleteReportedContent(${r.report_id})">Delete Content</button>
                        <button class="btn-secondary" onclick="closeReport(${r.report_id})">Close Report</button>
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

window.deleteReportedContent = async function(reportId) {
    if (!confirm('Are you sure you want to delete this content? This action cannot be undone.')) {
        return;
    }
    
    const response = await fetchWithAuth('/api/admin/reports/delete-content', {
        method: 'POST',
        body: JSON.stringify({ reportId })
    });
    
    if (!response) return;
    
    const data = await response.json();
    
    const alertsDiv = document.getElementById('reportAlerts');
    if (data.status === 'success') {
        alertsDiv.innerHTML = '<div class="alert alert-success">Content deleted successfully</div>';
        setTimeout(() => alertsDiv.innerHTML = '', 3000);
        loadReports();
    } else {
        alertsDiv.innerHTML = `<div class="alert alert-error">${data.message}</div>`;
    }
};

window.closeReport = async function(reportId) {
    const response = await fetchWithAuth('/api/admin/reports/status', {
        method: 'PUT',
        body: JSON.stringify({ reportId, status: 'closed' })
    });
    
    if (!response) return;
    
    const data = await response.json();
    
    const alertsDiv = document.getElementById('reportAlerts');
    if (data.status === 'success') {
        alertsDiv.innerHTML = '<div class="alert alert-success">Report closed successfully</div>';
        setTimeout(() => alertsDiv.innerHTML = '', 3000);
        loadReports();
    } else {
        alertsDiv.innerHTML = `<div class="alert alert-error">${data.message}</div>`;
    }
};

async function loadAnnouncements() {
    const response = await fetchWithAuth('/api/admin/announcements');
    if (!response) return;
    
    const data = await response.json();
    
    if (data.status === 'success') {
        displayAnnouncements(data.announcements);
    }
}

function displayAnnouncements(announcements) {
    const list = document.getElementById('announcementsList');
    
    if (announcements.length === 0) {
        list.innerHTML = '<p class="text-muted">No announcements</p>';
        return;
    }
    
    list.innerHTML = announcements.map(a => {
        const startDate = new Date(a.start_at).toLocaleString();
        const endDate = a.end_at ? new Date(a.end_at).toLocaleString() : 'No end date';
        
        return `
            <div style="padding: 1rem; border: 1px solid var(--border-color); border-radius: 6px; margin-bottom: 1rem;">
                <h4>${a.title}</h4>
                <p>${a.body}</p>
                <p style="font-size: 0.875rem; color: var(--text-secondary);">
                    <strong>By:</strong> ${a.creator_name}<br>
                    <strong>Start:</strong> ${startDate}<br>
                    <strong>End:</strong> ${endDate}
                </p>
                <button class="btn-danger" onclick="deleteAnnouncement(${a.announce_id})">Delete</button>
            </div>
        `;
    }).join('');
}

document.getElementById('announcementForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const title = document.getElementById('announceTitle').value;
    const body = document.getElementById('announceBody').value;
    const startAt = document.getElementById('announceStartDate').value + ':00';
    const endAt = document.getElementById('announceEndDate').value ? document.getElementById('announceEndDate').value + ':00' : null;
    
    const response = await fetchWithAuth('/api/admin/announcements', {
        method: 'POST',
        body: JSON.stringify({ title, body, startAt, endAt })
    });
    
    if (!response) return;
    
    const data = await response.json();
    
    const alertsDiv = document.getElementById('announcementAlerts');
    if (data.status === 'success') {
        alertsDiv.innerHTML = '<div class="alert alert-success">Announcement created successfully</div>';
        document.getElementById('announcementForm').reset();
        setTimeout(() => alertsDiv.innerHTML = '', 3000);
        loadAnnouncements();
    } else {
        alertsDiv.innerHTML = `<div class="alert alert-error">${data.message}</div>`;
    }
});

window.deleteAnnouncement = async function(announceId) {
    if (!confirm('Are you sure you want to delete this announcement?')) {
        return;
    }
    
    const response = await fetchWithAuth(`/api/admin/announcements/${announceId}`, {
        method: 'DELETE'
    });
    
    if (!response) return;
    
    const data = await response.json();
    
    const alertsDiv = document.getElementById('announcementAlerts');
    if (data.status === 'success') {
        alertsDiv.innerHTML = '<div class="alert alert-success">Announcement deleted successfully</div>';
        setTimeout(() => alertsDiv.innerHTML = '', 3000);
        loadAnnouncements();
    } else {
        alertsDiv.innerHTML = `<div class="alert alert-error">${data.message}</div>`;
    }
};

loadStats();