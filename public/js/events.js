const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user') || '{}');

if (!token) {
    window.location.href = '/login.html';
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
        
        if (view === 'browse') {
            loadAllEvents();
        } else if (view === 'my') {
            loadMyEvents();
        } else if (view === 'organized') {
            loadOrganizedEvents();
        } else if (view === 'create') {
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('eventDate').setAttribute('min', today);
        }
    });
});

async function loadAllEvents() {
    const response = await fetch('/api/events');
    if (!response) return;
    
    const data = await response.json();
    
    if (data.status === 'success') {
        displayEvents(data.events, 'eventsGrid', true);
    }
}

async function loadMyEvents() {
    const response = await fetchWithAuth('/api/events/my');
    if (!response) return;
    
    const data = await response.json();
    
    if (data.status === 'success') {
        displayEvents(data.events, 'myEventsGrid', false);
    }
}

async function loadOrganizedEvents() {
    const response = await fetchWithAuth('/api/events/organized');
    if (!response) return;
    
    const data = await response.json();
    
    if (data.status === 'success') {
        displayOrganizedEvents(data.events);
    }
}

function displayEvents(events, containerId, showRegister) {
    const grid = document.getElementById(containerId);
    
    if (events.length === 0) {
        grid.innerHTML = '<p class="text-muted">No events available</p>';
        return;
    }
    
    grid.innerHTML = events.map(event => {
        const date = new Date(event.date_time);
        const dateStr = date.toLocaleDateString();
        const timeStr = date.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
        
        return `
            <div class="mentor-card" onclick="viewEventDetail(${event.event_id})">
                <div class="mentor-header">
                    <h3>${event.title}</h3>
                    <div class="mentor-rating">
                        <span>📅 ${dateStr}</span>
                        <span>•</span>
                        <span>🕐 ${timeStr}</span>
                    </div>
                </div>
                
                <div class="mentor-bio">
                    ${event.description}
                </div>
                
                <div class="mentor-footer">
                    <span class="mentor-stats">📍 ${event.location}</span>
                    <span class="mentor-stats">👥 ${event.participants_count || 0} registered</span>
                </div>
                
                ${showRegister 
                ? (event.organizer_id === user.userId 
                    ? ''  
                    : `<button class="btn-primary" style="width:100%; margin-top:1rem;" onclick="event.stopPropagation(); registerForEvent(${event.event_id})">Register</button>`
                )
                : `<button class="btn-secondary" style="width:100%; margin-top:1rem;" onclick="event.stopPropagation(); unregisterFromEvent(${event.event_id})">Unregister</button>`
            }

            </div>
        `;
    }).join('');
}

function displayOrganizedEvents(events) {
    const grid = document.getElementById('organizedEventsGrid');
    
    if (events.length === 0) {
        grid.innerHTML = '<p class="text-muted">You haven\'t organized any events yet</p>';
        return;
    }
    
    grid.innerHTML = events.map(event => {
        const date = new Date(event.date_time);
        const dateStr = date.toLocaleDateString();
        const timeStr = date.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
        
        return `
            <div class="mentor-card">
                <div class="mentor-header">
                    <h3>${event.title}</h3>
                    <div class="mentor-rating">
                        <span>📅 ${dateStr}</span>
                        <span>•</span>
                        <span>🕐 ${timeStr}</span>
                    </div>
                </div>
                
                <div class="mentor-bio">
                    ${event.description}
                </div>
                
                <div class="mentor-footer">
                    <span class="mentor-stats">📍 ${event.location}</span>
                    <span class="mentor-stats">👥 ${event.participants_count} registered</span>
                </div>
                
                <div style="display: flex; gap: 0.5rem; margin-top: 1rem;">
                    <button class="btn-secondary" onclick="viewEventDetail(${event.event_id})">View</button>
                    <button class="btn-primary" onclick="editEvent(${event.event_id})">Edit</button>
                    <button class="btn-danger" onclick="cancelEvent(${event.event_id})">Cancel</button>
                </div>
            </div>
        `;
    }).join('');
}

async function viewEventDetail(eventId) {
    const modal = document.getElementById('eventDetailModal');
    const modalBody = document.getElementById('eventModalBody');
    
    modalBody.innerHTML = '<p class="text-muted">Loading event details...</p>';
    modal.classList.remove('hidden');
    
    const response = await fetch(`/api/events/${eventId}`);
    const data = await response.json();
    
    if (data.status === 'success') {
        const event = data.event;
        const date = new Date(event.date_time);
        const dateStr = date.toLocaleDateString();
        const timeStr = date.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
        
        modalBody.innerHTML = `
            <h2>${event.title}</h2>
            <div style="margin: 1rem 0;">
                <p><strong>📅 Date:</strong> ${dateStr}</p>
                <p><strong>🕐 Time:</strong> ${timeStr}</p>
                <p><strong>📍 Location:</strong> ${event.location}</p>
                <p><strong>👤 Organizer:</strong> ${event.organizer_name}</p>
            </div>
            
            <h3>Description</h3>
            <p>${event.description}</p>
            
            <h3>Participants (${data.participants.length})</h3>
            ${data.participants.length > 0 ? `
                <div style="max-height: 200px; overflow-y: auto;">
                    ${data.participants.map(p => `
                        <div style="padding: 0.5rem; border-bottom: 1px solid var(--border-color);">
                            <strong>${p.name}</strong> - ${p.email}
                        </div>
                    `).join('')}
                </div>
            ` : '<p class="text-muted">No participants yet</p>'}
        `;
    }
}

async function registerForEvent(eventId) {
    const response = await fetchWithAuth('/api/events/register', {
        method: 'POST',
        body: JSON.stringify({ eventId })
    });
    
    if (!response) return;
    
    const data = await response.json();
    
    if (data.status === 'success') {
        alert('Successfully registered for event!');
        loadAllEvents();
    } else {
        alert(data.message);
    }
}

async function unregisterFromEvent(eventId) {
    if (!confirm('Are you sure you want to unregister from this event?')) {
        return;
    }
    
    const response = await fetchWithAuth(`/api/events/register/${eventId}`, {
        method: 'DELETE'
    });
    
    if (!response) return;
    
    const data = await response.json();
    
    if (data.status === 'success') {
        alert('Successfully unregistered from event');
        loadMyEvents();
    } else {
        alert(data.message);
    }
}

document.getElementById('createEventForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const title = document.getElementById('eventTitle').value;
    const description = document.getElementById('eventDescription').value;
    const date = document.getElementById('eventDate').value;
    const time = document.getElementById('eventTime').value;
    const location = document.getElementById('eventLocation').value;
    
    const dateTime = `${date} ${time}:00`;
    
    const response = await fetchWithAuth('/api/events', {
        method: 'POST',
        body: JSON.stringify({ title, description, dateTime, location })
    });
    
    if (!response) return;
    
    const data = await response.json();
    
    const alertsDiv = document.getElementById('createAlerts');
    if (data.status === 'success') {
        alertsDiv.innerHTML = '<div class="alert alert-success">Event created successfully!</div>';
        document.getElementById('createEventForm').reset();
        setTimeout(() => {
            alertsDiv.innerHTML = '';
            document.querySelector('[data-view="organized"]').click();
        }, 2000);
    } else {
        alertsDiv.innerHTML = `<div class="alert alert-error">${data.message}</div>`;
    }
});

async function editEvent(eventId) {
    const response = await fetch(`/api/events/${eventId}`);
    const data = await response.json();
    
    if (data.status === 'success') {
        const event = data.event;
        const dateTime = new Date(event.date_time);
        const date = dateTime.toISOString().split('T')[0];
        const time = dateTime.toTimeString().slice(0, 5);
        
        document.getElementById('editEventId').value = event.event_id;
        document.getElementById('editEventTitle').value = event.title;
        document.getElementById('editEventDescription').value = event.description;
        document.getElementById('editEventDate').value = date;
        document.getElementById('editEventTime').value = time;
        document.getElementById('editEventLocation').value = event.location;
        
        document.getElementById('editEventModal').classList.remove('hidden');
    }
}

document.getElementById('editEventForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const eventId = document.getElementById('editEventId').value;
    const title = document.getElementById('editEventTitle').value;
    const description = document.getElementById('editEventDescription').value;
    const date = document.getElementById('editEventDate').value;
    const time = document.getElementById('editEventTime').value;
    const location = document.getElementById('editEventLocation').value;
    
    const dateTime = `${date} ${time}:00`;
    
    const response = await fetchWithAuth(`/api/events/${eventId}`, {
        method: 'PUT',
        body: JSON.stringify({ title, description, dateTime, location })
    });
    
    if (!response) return;
    
    const data = await response.json();
    
    const alertsDiv = document.getElementById('editAlerts');
    if (data.status === 'success') {
        alertsDiv.innerHTML = '<div class="alert alert-success">Event updated successfully!</div>';
        setTimeout(() => {
            closeEditModal();
            loadOrganizedEvents();
        }, 1500);
    } else {
        alertsDiv.innerHTML = `<div class="alert alert-error">${data.message}</div>`;
    }
});

async function cancelEvent(eventId) {
    if (!confirm('Are you sure you want to cancel this event? This action cannot be undone.')) {
        return;
    }
    
    const response = await fetchWithAuth(`/api/events/${eventId}`, {
        method: 'DELETE'
    });
    
    if (!response) return;
    
    const data = await response.json();
    
    if (data.status === 'success') {
        alert('Event cancelled successfully');
        loadOrganizedEvents();
    } else {
        alert(data.message);
    }
}

function closeEventModal() {
    document.getElementById('eventDetailModal').classList.add('hidden');
}

function closeEditModal() {
    document.getElementById('editEventModal').classList.add('hidden');
    document.getElementById('editAlerts').innerHTML = '';
}

window.onclick = function(event) {
    const eventModal = document.getElementById('eventDetailModal');
    const editModal = document.getElementById('editEventModal');
    if (event.target === eventModal) {
        closeEventModal();
    } else if (event.target === editModal) {
        closeEditModal();
    }
};

window.viewEventDetail = viewEventDetail;
window.registerForEvent = registerForEvent;
window.unregisterFromEvent = unregisterFromEvent;
window.editEvent = editEvent;
window.cancelEvent = cancelEvent;

loadAllEvents();