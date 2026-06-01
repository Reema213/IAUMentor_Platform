const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user') || '{}');

if (!token) {
    window.location.href = '/login.html';
}

let currentMentorId = null;

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
        if (view === 'browse') {
            document.getElementById('browseView').classList.remove('hidden');
            document.getElementById('detailView').classList.add('hidden');
        } else if (view === 'detail') {
            document.getElementById('browseView').classList.add('hidden');
            document.getElementById('detailView').classList.remove('hidden');
        }
    });
});

async function loadMentors() {
    const response = await fetch('/api/mentors');
    if (!response) return;
    
    const data = await response.json();
    
    if (data.status === 'success') {
        displayMentors(data.mentors);
    }
}

function displayMentors(mentors) {
    const grid = document.getElementById('mentorsGrid');
    
    if (mentors.length === 0) {
        grid.innerHTML = '<p class="text-muted">No mentors available</p>';
        return;
    }
    
    grid.innerHTML = mentors.map(mentor => {
        const interests = mentor.interests ? mentor.interests.split(',').map(i => i.trim()).slice(0, 3) : [];
        const rating = mentor.avg_rating ? Number(mentor.avg_rating).toFixed(1) : 'N/A';
        
        return `
            <div class="mentor-card" onclick="viewMentorDetail(${mentor.user_id})">
                <div class="mentor-header">
                    <h3>${mentor.name}</h3>
                    <div class="mentor-rating">
                        <span>⭐ ${rating}</span>
                        <span>•</span>
                        <span>${mentor.total_sessions || 0} sessions</span>
                    </div>
                </div>
                
                <div class="mentor-bio">
                    ${mentor.bio || 'No bio provided'}
                </div>
                
                ${interests.length > 0 ? `
                    <div class="mentor-interests">
                        ${interests.map(interest => `<span class="interest-tag">${interest}</span>`).join('')}
                    </div>
                ` : ''}
                
                <div class="mentor-footer">
                    <span class="mentor-stats">📧 ${mentor.email}</span>
                    <button class="btn-primary" onclick="event.stopPropagation(); viewMentorDetail(${mentor.user_id})">View Profile</button>
                </div>
            </div>
        `;
    }).join('');
}

async function viewMentorDetail(mentorId) {
    currentMentorId = mentorId;
    
    document.getElementById('detailLink').classList.remove('hidden');
    document.querySelector('[data-view="detail"]').click();
    
    const response = await fetch(`/api/mentors/${mentorId}`);
    const data = await response.json();
    
    if (data.status === 'success') {
        displayMentorDetail(data.mentor, data.availability, data.feedback);
    }
}

function displayMentorDetail(mentor, availability, feedback) {
    const rating = mentor.avg_rating ? Number(mentor.avg_rating).toFixed(1) : 'N/A';
    const interests = mentor.interests ? mentor.interests.split(',').map(i => i.trim()) : [];
    
    const detailHtml = `
        <div class="mentor-detail-header">
            <h1>${mentor.name}</h1>
            <div class="mentor-detail-info">
                <div class="info-item">
                    <span>⭐</span>
                    <span>${rating} Rating</span>
                </div>
                <div class="info-item">
                    <span>📚</span>
                    <span>${mentor.total_sessions || 0} Sessions</span>
                </div>
                <div class="info-item">
                    <span>📧</span>
                    <span>${mentor.email}</span>
                </div>
            </div>
        </div>
        
        <div class="card">
            <h2>About</h2>
            <p>${mentor.bio || 'No bio provided'}</p>
        </div>
        
        ${interests.length > 0 ? `
            <div class="card">
                <h2>Areas of Expertise</h2>
                <div class="mentor-interests">
                    ${interests.map(interest => `<span class="interest-tag">${interest}</span>`).join('')}
                </div>
            </div>
        ` : ''}
        
        <div class="card">
            <h2>Available Time Slots</h2>
            ${availability.length > 0 ? `
                <div class="availability-grid">
                    ${availability.map(slot => {
                        const date = new Date(slot.start_time);
                        return `
                            <div class="availability-card">
                                <h4>${date.toLocaleDateString()}</h4>
                                <p>${date.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</p>
                                <p>${slot.duration} minutes</p>
                                <button class="btn-primary" onclick="bookSession(${slot.slot_id})">Book</button>
                            </div>
                        `;
                    }).join('')}
                </div>
            ` : '<p class="text-muted">No available slots at the moment</p>'}
        </div>
        
        <div class="card">
            <h2>Student Feedback</h2>
            ${feedback.length > 0 ? `
                <div class="feedback-list">
                    ${feedback.map(item => {
                        const stars = '⭐'.repeat(item.rating);
                        const date = new Date(item.created_at).toLocaleDateString();
                        return `
                            <div class="feedback-item">
                                <div class="feedback-header">
                                    <span class="feedback-author">${item.mentee_name}</span>
                                    <span class="feedback-date">${date}</span>
                                </div>
                                <div class="feedback-rating">${stars}</div>
                                <p class="feedback-comment">${item.comments || 'No comment provided'}</p>
                            </div>
                        `;
                    }).join('')}
                </div>
            ` : '<p class="text-muted">No feedback yet</p>'}
        </div>
    `;
    
    document.getElementById('mentorDetail').innerHTML = detailHtml;
}

document.getElementById('backToList').addEventListener('click', () => {
    document.querySelector('[data-view="browse"]').click();
    document.getElementById('detailLink').classList.add('hidden');
});

document.getElementById('searchBtn').addEventListener('click', async () => {
    const query = document.getElementById('searchInput').value.trim();
    
    if (!query) {
        loadMentors();
        return;
    }
    
    const response = await fetch(`/api/mentors/search?query=${encodeURIComponent(query)}`);
    const data = await response.json();
    
    if (data.status === 'success') {
        displayMentors(data.mentors);
    }
});

document.getElementById('searchInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        document.getElementById('searchBtn').click();
    }
});

function bookSession(slotId) {
    const modal = document.getElementById('bookingModal');
    const modalBody = document.getElementById('modalBody');
    
    modalBody.innerHTML = `
        <p>Are you sure you want to book this session?</p>
        <p class="text-muted">The mentor will need to approve your booking request.</p>
        <div style="display: flex; gap: 1rem; margin-top: 1.5rem;">
            <button class="btn-primary" onclick="confirmBooking(${slotId})">Confirm Booking</button>
            <button class="btn-secondary" onclick="closeModal()">Cancel</button>
        </div>
    `;
    
    modal.classList.remove('hidden');
}

async function confirmBooking(slotId) {
    const response = await fetchWithAuth('/api/sessions/book', {
        method: 'POST',
        body: JSON.stringify({
            mentorId: currentMentorId,
            slotId: slotId
        })
    });
    
    if (!response) return;
    
    const data = await response.json();
    
    if (data.status === 'success') {
        const modalBody = document.getElementById('modalBody');
        modalBody.innerHTML = `
            <div class="alert alert-success">
                <p>✓ Booking request sent successfully!</p>
                <p>The mentor will review your request and respond soon.</p>
            </div>
            <button class="btn-primary" onclick="closeModal(); viewMentorDetail(${currentMentorId})">OK</button>
        `;
    } else {
        alert(data.message);
        closeModal();
    }
}

async function loadPendingBookings() {
    const token = localStorage.getItem("token");

    const res = await fetch('/api/session/pending', {
        headers: { 'Authorization': 'Bearer ' + token }
    });

    const data = await res.json();
    const container = document.getElementById("pendingBookings");

    if (!data.bookings || data.bookings.length === 0) {
        container.innerHTML = "<p>No pending bookings</p>";
        return;
    }

    container.innerHTML = data.bookings.map(b => `
        <div class="booking-card">
            <h3>${b.mentee_name}</h3>
            <p>${new Date(b.start_time).toLocaleString()}</p>
            <button onclick="approve(${b.booking_id})">Approve</button>
            <button onclick="reject(${b.booking_id})">Reject</button>
        </div>
    `).join('');
}


window.confirmBooking = confirmBooking;

function closeModal() {
    document.getElementById('bookingModal').classList.add('hidden');
}

document.querySelector('.modal-close').addEventListener('click', closeModal);

window.onclick = function(event) {
    const modal = document.getElementById('bookingModal');
    if (event.target === modal) {
        closeModal();
    }
};

loadMentors();
loadPendingBookings