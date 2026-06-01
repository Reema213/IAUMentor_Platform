const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user') || '{}');

if (!token) {
    window.location.href = '/login.html';
}

const alertContainer = document.getElementById('alertContainer');

function showAlert(message, type = 'error') {
    alertContainer.innerHTML = `
        <div class="alert alert-${type}">
            ${message}
        </div>
    `;
    setTimeout(() => {
        alertContainer.innerHTML = '';
    }, 5000);
}

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

document.getElementById('userName').textContent = user.name;
document.getElementById('welcomeName').textContent = user.name;

if (user.role === 'mentee') {
    document.getElementById('mentorsLink').classList.remove('hidden');
} else if (user.role === 'mentor') {
    document.getElementById('availabilityLink').classList.remove('hidden');
}

document.getElementById('logoutBtn').addEventListener('click', async () => {
    await fetchWithAuth('/api/auth/logout', { method: 'POST' });
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login.html';
});

const sidebarLinks = document.querySelectorAll('.sidebar-menu a[data-section]');
sidebarLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        
        sidebarLinks.forEach(l => l.parentElement.classList.remove('active'));
        link.parentElement.classList.add('active');
        
        const section = link.dataset.section;
        document.querySelectorAll('.content-section').forEach(s => s.classList.add('hidden'));
        document.getElementById(`${section}Section`).classList.remove('hidden');
        
        if (section === 'profile') {
            loadProfile();
        } else if (section === 'availability') {
            loadAvailability();
        } else if (section === 'sessions') {
            loadMySessions();
        }
    });
});

async function loadDashboardStats() {
    const response = await fetchWithAuth('/api/user/dashboard/stats');
    if (!response) return;
    
    const data = await response.json();
    
    if (data.status === 'success') {
        const stats = data.stats;
        
        if (user.role === 'mentee') {
            document.getElementById('stat1Value').textContent = stats.totalSessions;
            document.getElementById('stat1Label').textContent = 'Total Sessions';
            document.getElementById('stat2Value').textContent = stats.availableResources;
            document.getElementById('stat2Label').textContent = 'Resources';
            document.getElementById('stat3Value').textContent = stats.registeredEvents;
            document.getElementById('stat3Label').textContent = 'Events Joined';
        } else if (user.role === 'mentor') {
            document.getElementById('stat1Value').textContent = stats.totalSessions;
            document.getElementById('stat1Label').textContent = 'Total Sessions';
            document.getElementById('stat2Value').textContent = stats.uploadedResources;
            document.getElementById('stat2Label').textContent = 'Resources Shared';
            document.getElementById('stat3Value').textContent = stats.averageRating.toFixed(1);
            document.getElementById('stat3Label').textContent = 'Average Rating';
        }
    }
}

async function loadRecentActivity() {
    const response = await fetchWithAuth('/api/user/dashboard/activity');
    if (!response) return;
    
    const data = await response.json();
    
    if (data.status === 'success' && data.activity.length > 0) {
        const activityHtml = data.activity.map(item => {
            const name = user.role === 'mentee' ? item.mentor_name : item.mentee_name;
            const date = new Date(item.start_time).toLocaleDateString();
            
            return `
                <div class="activity-item">
                    <h4>Session with ${name}</h4>
                    <p>${date}</p>
                  ${item.status === 'pending' && user.role === 'mentor' ? `
                <div class="session-actions">
                    <button class="btn-primary" onclick="approveSession(${item.booking_id})">Approve</button>
                    <button class="btn-danger" onclick="rejectSession(${item.booking_id})">Reject</button>
                </div>
            ` : `<span class="status ${item.status}">${item.status}</span>`}


                </div>
            `;
        }).join('');
        
        document.getElementById('recentActivity').innerHTML = activityHtml;
    }
}

async function loadProfile() {
    const response = await fetchWithAuth('/api/auth/profile');
    if (!response) return;
    
    const data = await response.json();
    
    if (data.status === 'success') {
        const profile = data.user;
        document.getElementById('profileName').value = profile.name;
        document.getElementById('profileEmail').value = profile.email;
        document.getElementById('profileRole').value = profile.role;
        document.getElementById('profileBio').value = profile.bio || '';
        document.getElementById('profileInterests').value = profile.interests || '';
        document.getElementById('profileContact').value = profile.contact || '';
    }
}

document.getElementById('profileForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = {
        name: document.getElementById('profileName').value,
        bio: document.getElementById('profileBio').value,
        interests: document.getElementById('profileInterests').value,
        contact: document.getElementById('profileContact').value
    };
    
    const response = await fetchWithAuth('/api/user/profile', {
        method: 'PUT',
        body: JSON.stringify(formData)
    });
    
    if (!response) return;
    
    const data = await response.json();
    
    if (data.status === 'success') {
        showAlert('Profile updated successfully', 'success');
        user.name = formData.name;
        localStorage.setItem('user', JSON.stringify(user));
        document.getElementById('userName').textContent = user.name;
        document.getElementById('welcomeName').textContent = user.name;
    } else {
        showAlert(data.message);
    }
});

document.getElementById('passwordForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmNewPassword = document.getElementById('confirmNewPassword').value;
    
    if (newPassword !== confirmNewPassword) {
        showAlert('New passwords do not match');
        return;
    }
    
    const response = await fetchWithAuth('/api/user/password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword, newPassword })
    });
    
    if (!response) return;
    
    const data = await response.json();
    
    if (data.status === 'success') {
        showAlert('Password changed successfully', 'success');
        document.getElementById('passwordForm').reset();
    } else {
        showAlert(data.message);
    }
});

document.getElementById('deleteAccountBtn').addEventListener('click', async () => {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
        return;
    }
    
    const response = await fetchWithAuth('/api/user/account', {
        method: 'DELETE'
    });
    
    if (!response) return;
    
    const data = await response.json();
    
    if (data.status === 'success') {
        alert('Account deleted successfully');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/index.html';
    } else {
        showAlert(data.message);
    }
});

async function loadAvailability() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('slotDate').setAttribute('min', today);
    
    if (user.role !== 'mentor') return;
    
    const response = await fetchWithAuth('/api/mentors/availability/my');
    if (!response) return;
    
    const data = await response.json();
    
    if (data.status === 'success' && data.slots.length > 0) {
        const slotsHtml = data.slots.map(slot => {
            const date = new Date(slot.start_time);
            const dateStr = date.toLocaleDateString();
            const timeStr = date.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
            
            return `
                <div class="slot-item">
                    <div class="slot-info">
                        <h4>${dateStr} at ${timeStr}</h4>
                        <p>Duration: ${slot.duration} minutes | Status: ${slot.status}</p>
                    </div>
                    <div class="slot-actions">
                        <button class="btn-danger" onclick="deleteSlot(${slot.slot_id})">Delete</button>
                    </div>
                </div>
            `;
        }).join('');
        
        document.getElementById('availabilityList').innerHTML = slotsHtml;
    }
}

async function loadMySessions() {
    const token = localStorage.getItem("token");
    const res = await fetch('/api/sessions/my', {
        headers: {
            'Authorization': 'Bearer ' + token
        }
    });

    const data = await res.json();
    const container = document.getElementById('sessionsList'); 

    if (!container) {
        console.error("Error: Element with ID 'sessionsList' not found.");
        return; 
    }

    if (!data.sessions || data.sessions.length === 0) {
        container.innerHTML = `<p>No sessions yet</p>`;
        return;
    }

    container.innerHTML = data.sessions.map(s => {
        let feedbackButton = '';

        if (s.status === 'approved' && !s.feedback_submitted) {
            feedbackButton = `
                <button class="btn-primary" onclick="openFeedbackModal(${s.booking_id})">
                    Give Feedback
                </button>
            `;
        }

        return `
            <div class="session-card">
                <h3>Session with ${s.mentor_name}</h3>
                <p><strong>Date:</strong> ${new Date(s.start_time).toLocaleString()}</p>
                <p><strong>Status:</strong> ${s.status}</p>
                ${feedbackButton}
            </div>
        `;
    }).join('');
}

function openFeedbackModal(bookingId) {
    const modal = document.getElementById('feedbackModal');
    modal.classList.remove('hidden');

    document.getElementById('feedbackBookingId').value = bookingId;
}

function closeFeedbackModal() {
    const modal = document.getElementById('feedbackModal');
    modal.classList.add('hidden');

    document.getElementById('feedbackForm').reset();
}

document.getElementById('feedbackForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const token = localStorage.getItem('token');
    const bookingId = document.getElementById('feedbackBookingId').value;
    const rating = document.getElementById('feedbackRating').value;
    const comments = document.getElementById('feedbackComments').value;

    if (!bookingId || !rating) {
        alert("Please select rating");
        return;
    }

    try {
        const res = await fetch('/api/sessions/feedback', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ bookingId, rating, comments })
        });

        const data = await res.json();

        if (data.status === 'success') {
            alert(data.message || 'Feedback submitted successfully!');
            closeFeedbackModal();
            loadMySessions(); 
        } else {
            alert(data.message || 'Failed to submit feedback');
        }
    } catch (err) {
        console.error(err);
        alert('Error submitting feedback');
    }
});



window.deleteSlot = async function(slotId) {
    if (!confirm('Are you sure you want to delete this availability slot?')) {
        return;
    }
    
    const response = await fetchWithAuth(`/api/mentors/availability/${slotId}`, {
        method: 'DELETE'
    });
    
    if (!response) return;
    
    const data = await response.json();
    
    if (data.status === 'success') {
        showAlert('Availability slot deleted successfully', 'success');
        loadAvailability();
    } else {
        showAlert(data.message);
    }
};

document.getElementById('availabilityForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const date = document.getElementById('slotDate').value;
    const time = document.getElementById('slotTime').value;
    const duration = document.getElementById('slotDuration').value;
    
    const startTime = `${date} ${time}:00`;
    
    const response = await fetchWithAuth('/api/mentors/availability', {
        method: 'POST',
        body: JSON.stringify({ startTime, duration: parseInt(duration) })
    });
    
    if (!response) return;
    
    const data = await response.json();
    
    if (data.status === 'success') {
        showAlert('Availability slot added successfully', 'success');
        document.getElementById('availabilityForm').reset();
        loadAvailability();
    } else {
        showAlert(data.message);
    }
});

window.approveSession = async function(id) {
    console.log('Approving session', id);
    const res = await fetchWithAuth(`/api/sessions/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'approved' })
    });

    const data = await res.json();
    if (data.status === 'success') {
        showAlert('Session approved!', 'success');
        loadRecentActivity();
        loadMySessions();
    } else {
        showAlert(data.message || 'Failed to approve.');
    }
};


window.rejectSession = async function(id) {
    const res = await fetchWithAuth(`/api/sessions/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'rejected' })
    });

    const data = await res.json();
    if (data.status === 'success') {
        showAlert('Session rejected.', 'success');
        loadRecentActivity();
        loadMySessions();
    } else {
        showAlert(data.message || 'Error.');
    }
};


loadDashboardStats();
loadRecentActivity();
loadMySessions();