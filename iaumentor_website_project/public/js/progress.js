const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user') || '{}');

if (!token) {
    window.location.href = '/login.html';
}

let allGoals = [];

async function fetchWithAuth(url, options = {}) {
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    };
    
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
        
        if (view === 'overview') {
            loadStats();
        } else if (view === 'goals') {
            loadGoals();
        } else if (view === 'create') {
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('goalTargetDate').setAttribute('min', today);
        }
    });
});

async function loadStats() {
    const response = await fetchWithAuth('/api/progress/stats');
    if (!response) return;
    
    const data = await response.json();
    
    if (data.status === 'success') {
        displayStats(data.stats);
    }
}

function displayStats(stats) {
    const completionRate = stats.totalGoals > 0 
        ? Math.round((stats.completedGoals / stats.totalGoals) * 100) 
        : 0;
    
    const milestoneRate = stats.totalMilestones > 0
        ? Math.round((stats.completedMilestones / stats.totalMilestones) * 100)
        : 0;
    
    document.getElementById('progressStatsGrid').innerHTML = `
        <div class="stat-card">
            <div class="stat-icon">🎯</div>
            <div class="stat-info">
                <h3>${stats.totalGoals}</h3>
                <p>Total Goals</p>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon">✅</div>
            <div class="stat-info">
                <h3>${stats.completedGoals}</h3>
                <p>Completed</p>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon">⏳</div>
            <div class="stat-info">
                <h3>${stats.inProgressGoals}</h3>
                <p>In Progress</p>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon">📊</div>
            <div class="stat-info">
                <h3>${completionRate}%</h3>
                <p>Completion Rate</p>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon">🏆</div>
            <div class="stat-info">
                <h3>${stats.completedMilestones}/${stats.totalMilestones}</h3>
                <p>Milestones</p>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon">📈</div>
            <div class="stat-info">
                <h3>${milestoneRate}%</h3>
                <p>Milestone Rate</p>
            </div>
        </div>
    `;
    
    if (stats.categoryBreakdown.length > 0) {
        const categoryHtml = stats.categoryBreakdown.map(cat => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; border-bottom: 1px solid var(--border-color);">
                <span style="font-weight: 500; text-transform: capitalize;">${cat.category}</span>
                <span style="background: var(--primary-color); color: white; padding: 0.25rem 0.75rem; border-radius: 12px;">${cat.count}</span>
            </div>
        `).join('');
        document.getElementById('categoryBreakdown').innerHTML = categoryHtml;
    } else {
        document.getElementById('categoryBreakdown').innerHTML = '<p class="text-muted">No goals yet</p>';
    }
}

async function loadGoals() {
    const response = await fetchWithAuth('/api/progress/goals');
    if (!response) return;
    
    const data = await response.json();
    
    if (data.status === 'success') {
        allGoals = data.goals;
        filterAndDisplayGoals();
    }
}

document.getElementById('statusFilter').addEventListener('change', filterAndDisplayGoals);
document.getElementById('categoryFilter').addEventListener('change', filterAndDisplayGoals);

function filterAndDisplayGoals() {
    const statusFilter = document.getElementById('statusFilter').value;
    const categoryFilter = document.getElementById('categoryFilter').value;
    
    let filtered = allGoals;
    
    if (statusFilter !== 'all') {
        filtered = filtered.filter(g => g.status === statusFilter);
    }
    
    if (categoryFilter !== 'all') {
        filtered = filtered.filter(g => g.category === categoryFilter);
    }
    
    displayGoals(filtered);
}

function displayGoals(goals) {
    const grid = document.getElementById('goalsGrid');
    
    if (goals.length === 0) {
        grid.innerHTML = '<p class="text-muted">No goals found. Create your first goal!</p>';
        return;
    }
    
    grid.innerHTML = goals.map(goal => {
        const targetDate = goal.target_date ? new Date(goal.target_date).toLocaleDateString() : 'No deadline';
        const progress = goal.total_milestones > 0 
            ? Math.round((goal.completed_milestones / goal.total_milestones) * 100) 
            : 0;
        
        let statusColor = 'var(--text-secondary)';
        if (goal.status === 'completed') statusColor = 'var(--success-color)';
        else if (goal.status === 'in_progress') statusColor = 'var(--primary-color)';
        else if (goal.status === 'abandoned') statusColor = 'var(--danger-color)';
        else if (goal.status === 'not_started') statusColor = 'var(--warning-color)';
        
        return `
            <div class="mentor-card" onclick="viewGoalDetail(${goal.goal_id})">
                <div class="mentor-header">
                    <h3>${goal.title}</h3>
                    <span class="interest-tag" style="background: ${statusColor}; color: white;">${goal.status.replace('_', ' ')}</span>
                </div>
                
                <div class="mentor-bio">
                    ${goal.description || 'No description'}
                </div>
                
                <div style="margin: 1rem 0;">
                    <div style="background: var(--light-color); height: 8px; border-radius: 4px; overflow: hidden;">
                        <div style="background: var(--primary-color); height: 100%; width: ${progress}%;"></div>
                    </div>
                    <p style="font-size: 0.875rem; color: var(--text-secondary); margin-top: 0.5rem;">
                        ${goal.completed_milestones}/${goal.total_milestones} milestones completed (${progress}%)
                    </p>
                </div>
                
                <div class="mentor-footer">
                    <span class="mentor-stats" style="text-transform: capitalize;">📂 ${goal.category}</span>
                    <span class="mentor-stats">📅 ${targetDate}</span>
                </div>
            </div>
        `;
    }).join('');
}

async function viewGoalDetail(goalId) {
    const modal = document.getElementById('goalDetailModal');
    const modalBody = document.getElementById('goalModalBody');
    
    modalBody.innerHTML = '<p class="text-muted">Loading goal details...</p>';
    modal.classList.remove('hidden');
    
    const response = await fetchWithAuth(`/api/progress/goals/${goalId}`);
    const data = await response.json();
    
    if (data.status === 'success') {
        displayGoalDetail(data.goal, data.milestones, data.updates);
    }
}

function displayGoalDetail(goal, milestones, updates) {
    const targetDate = goal.target_date ? new Date(goal.target_date).toLocaleDateString() : 'No deadline';
    
    const modalBody = document.getElementById('goalModalBody');
    modalBody.innerHTML = `
        <h2>${goal.title}</h2>
        <p>${goal.description || 'No description'}</p>
        
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; margin: 1rem 0;">
            <div>
                <strong>Category:</strong><br>
                <span style="text-transform: capitalize;">${goal.category}</span>
            </div>
            <div>
                <strong>Status:</strong><br>
                <span class="status ${goal.status}">${goal.status.replace('_', ' ')}</span>
            </div>
            <div>
                <strong>Target Date:</strong><br>
                ${targetDate}
            </div>
        </div>
        
        <div style="display: flex; gap: 1rem; margin-bottom: 2rem;">
            <button class="btn-primary" onclick="editGoal(${goal.goal_id})">Edit Goal</button>
            <button class="btn-danger" onclick="deleteGoal(${goal.goal_id})">Delete Goal</button>
        </div>
        
        <h3>Milestones</h3>
        <div id="milestonesList">
            ${milestones.length > 0 ? milestones.map(m => `
                <div style="display: flex; align-items: center; gap: 1rem; padding: 1rem; border: 1px solid var(--border-color); border-radius: 6px; margin-bottom: 0.5rem;">
                    <input type="checkbox" ${m.completed ? 'checked' : ''} onchange="toggleMilestone(${m.milestone_id})" style="width: 20px; height: 20px; cursor: pointer;">
                    <div style="flex: 1;">
                        <strong style="${m.completed ? 'text-decoration: line-through; color: var(--text-secondary);' : ''}">${m.title}</strong>
                        ${m.description ? `<p style="font-size: 0.875rem; color: var(--text-secondary); margin: 0.25rem 0 0 0;">${m.description}</p>` : ''}
                    </div>
                    <button class="btn-danger" onclick="deleteMilestone(${m.milestone_id})">Delete</button>
                </div>
            `).join('') : '<p class="text-muted">No milestones yet</p>'}
        </div>
        
        <form id="addMilestoneForm" style="margin-top: 1rem;">
            <div style="display: flex; gap: 1rem;">
                <input type="text" id="milestoneTitle" placeholder="Milestone title..." style="flex: 1; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 6px;" required>
                <button type="submit" class="btn-primary">Add Milestone</button>
            </div>
        </form>
        
        <h3 style="margin-top: 2rem;">Progress Updates</h3>
        <div id="updatesList">
            ${updates.length > 0 ? updates.map(u => {
                const date = new Date(u.created_at).toLocaleString();
                return `
                    <div style="padding: 1rem; background: var(--light-color); border-radius: 6px; margin-bottom: 1rem;">
                        <p style="font-size: 0.875rem; color: var(--text-secondary); margin: 0 0 0.5rem 0;">${date}</p>
                        <p style="margin: 0;">${u.notes}</p>
                    </div>
                `;
            }).join('') : '<p class="text-muted">No progress updates yet</p>'}
        </div>
        
        <form id="addUpdateForm" style="margin-top: 1rem;">
            <textarea id="updateNotes" rows="3" placeholder="Add a progress update..." style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 6px;" required></textarea>
            <button type="submit" class="btn-primary" style="margin-top: 0.5rem;">Add Update</button>
        </form>
    `;
    
    document.getElementById('addMilestoneForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await addMilestone(goal.goal_id);
    });
    
    document.getElementById('addUpdateForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await addProgressUpdate(goal.goal_id);
    });
}

async function addMilestone(goalId) {
    const title = document.getElementById('milestoneTitle').value;
    
    const response = await fetchWithAuth('/api/progress/milestones', {
        method: 'POST',
        body: JSON.stringify({ goalId, title, description: '' })
    });
    
    if (!response) return;
    
    const data = await response.json();
    
    if (data.status === 'success') {
        viewGoalDetail(goalId);
    }
}

window.toggleMilestone = async function(milestoneId) {
    const response = await fetchWithAuth(`/api/progress/milestones/${milestoneId}/toggle`, {
        method: 'PUT'
    });
    
    if (!response) return;
    
    const data = await response.json();
    
    if (data.status === 'success') {
        if (currentThreadId) {
            await viewGoalDetail(currentThreadId);
        }
        loadGoals();
        loadStats();
    }
};

window.deleteMilestone = async function(milestoneId) {
    if (!confirm('Delete this milestone?')) return;
    
    const response = await fetchWithAuth(`/api/progress/milestones/${milestoneId}`, {
        method: 'DELETE'
    });
    
    if (!response) return;
    
    const data = await response.json();
    
    if (data.status === 'success') {
        const currentGoalId = parseInt(document.querySelector('#goalModalBody h2').dataset.goalId || 0);
        if (currentGoalId) {
            viewGoalDetail(currentGoalId);
        }
    }
};

async function addProgressUpdate(goalId) {
    const notes = document.getElementById('updateNotes').value;
    
    const response = await fetchWithAuth('/api/progress/updates', {
        method: 'POST',
        body: JSON.stringify({ goalId, notes })
    });
    
    if (!response) return;
    
    const data = await response.json();
    
    if (data.status === 'success') {
        viewGoalDetail(goalId);
    }
}

document.getElementById('createGoalForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const title = document.getElementById('goalTitle').value;
    const description = document.getElementById('goalDescription').value;
    const category = document.getElementById('goalCategory').value;
    const targetDate = document.getElementById('goalTargetDate').value || null;
    
    const response = await fetchWithAuth('/api/progress/goals', {
        method: 'POST',
        body: JSON.stringify({ title, description, category, targetDate })
    });
    
    if (!response) return;
    
    const data = await response.json();
    
    const alertsDiv = document.getElementById('createAlerts');
    if (data.status === 'success') {
        alertsDiv.innerHTML = '<div class="alert alert-success">Goal created successfully!</div>';
        document.getElementById('createGoalForm').reset();
        setTimeout(() => {
            alertsDiv.innerHTML = '';
            document.querySelector('[data-view="goals"]').click();
        }, 1500);
    } else {
        alertsDiv.innerHTML = `<div class="alert alert-error">${data.message}</div>`;
    }
});

window.editGoal = async function(goalId) {
    const response = await fetchWithAuth(`/api/progress/goals/${goalId}`);
    if (!response) return;
    
    const data = await response.json();
    
    if (data.status === 'success') {
        const goal = data.goal;
        
        document.getElementById('editGoalId').value = goal.goal_id;
        document.getElementById('editGoalTitle').value = goal.title;
        document.getElementById('editGoalDescription').value = goal.description || '';
        document.getElementById('editGoalCategory').value = goal.category;
        document.getElementById('editGoalTargetDate').value = goal.target_date ? goal.target_date.split('T')[0] : '';
        document.getElementById('editGoalStatus').value = goal.status;
        
        closeGoalModal();
        document.getElementById('editGoalModal').classList.remove('hidden');
    }
};

function closeEditGoalModal() {
    document.getElementById('editGoalModal').classList.add('hidden');
    document.getElementById('editAlerts').innerHTML = '';
}

document.getElementById('editGoalForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const goalId = document.getElementById('editGoalId').value;
    const title = document.getElementById('editGoalTitle').value;
    const description = document.getElementById('editGoalDescription').value;
    const category = document.getElementById('editGoalCategory').value;
    const targetDate = document.getElementById('editGoalTargetDate').value || null;
    const status = document.getElementById('editGoalStatus').value;
    
    const response = await fetchWithAuth(`/api/progress/goals/${goalId}`, {
        method: 'PUT',
        body: JSON.stringify({ title, description, category, targetDate, status })
    });
    
    if (!response) return;
    
    const data = await response.json();
    
    const alertsDiv = document.getElementById('editAlerts');
    if (data.status === 'success') {
        alertsDiv.innerHTML = '<div class="alert alert-success">Goal updated successfully!</div>';
        setTimeout(() => {
            closeEditGoalModal();
            loadGoals();
            loadStats();
        }, 1500);
    } else {
        alertsDiv.innerHTML = `<div class="alert alert-error">${data.message}</div>`;
    }
});

window.closeEditGoalModal = closeEditGoalModal;

window.deleteGoal = async function(goalId) {
    if (!confirm('Are you sure you want to delete this goal? This action cannot be undone.')) {
        return;
    }
    
    const response = await fetchWithAuth(`/api/progress/goals/${goalId}`, {
        method: 'DELETE'
    });
    
    if (!response) return;
    
    const data = await response.json();
    
    if (data.status === 'success') {
        closeGoalModal();
        loadGoals();
        alert('Goal deleted successfully');
    }
};

function closeGoalModal() {
    document.getElementById('goalDetailModal').classList.add('hidden');
}

window.onclick = function(event) {
    const goalModal = document.getElementById('goalDetailModal');
    const editModal = document.getElementById('editGoalModal');
    
    if (event.target === goalModal) {
        closeGoalModal();
    } else if (event.target === editModal) {
        closeEditGoalModal();
    }
};

window.viewGoalDetail = viewGoalDetail;
window.closeGoalModal = closeGoalModal;

loadStats();