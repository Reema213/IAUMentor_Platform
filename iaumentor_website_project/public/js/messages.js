const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user') || '{}');

if (!token) {
    window.location.href = '/login.html';
}

let currentConversationUserId = null;
let messageRefreshInterval = null;

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

async function loadConversations() {
    const response = await fetchWithAuth('/api/messages/conversations');
    if (!response) return;
    
    const data = await response.json();
    
    if (data.status === 'success') {
        displayConversations(data.conversations);
    }
}

function displayConversations(conversations) {
    const list = document.getElementById('conversationsList');
    
    if (conversations.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <p>No conversations yet</p>
                <p style="font-size: 0.875rem;">Start a new conversation!</p>
            </div>
        `;
        return;
    }
    
    list.innerHTML = conversations.map(conv => {
        const time = new Date(conv.last_message_time);
        const timeStr = formatMessageTime(time);
        const unreadBadge = conv.unread_count > 0 ? `<span class="unread-badge">${conv.unread_count}</span>` : '';
        
        return `
            <div class="conversation-item ${currentConversationUserId === conv.user_id ? 'active' : ''}" 
                 onclick="openConversation(${conv.user_id}, '${conv.user_name}')">
                <div class="conversation-header">
                    <span class="conversation-name">${conv.user_name}${unreadBadge}</span>
                    <span class="conversation-time">${timeStr}</span>
                </div>
                <div class="conversation-preview">${conv.last_message || 'No messages yet'}</div>
            </div>
        `;
    }).join('');
}

async function openConversation(userId, userName) {
    currentConversationUserId = userId;
    
    if (messageRefreshInterval) {
        clearInterval(messageRefreshInterval);
    }
    
    const chatPanel = document.getElementById('chatPanel');
    chatPanel.innerHTML = `
        <div class="chat-header">
            <h3>${userName}</h3>
        </div>
        <div class="chat-messages" id="chatMessages">
            <p class="text-muted">Loading messages...</p>
        </div>
        <div class="chat-input-area">
            <form class="chat-input-form" id="messageForm">
                <textarea id="messageInput" rows="2" placeholder="Type your message..." required></textarea>
                <button type="submit" class="btn-primary">Send</button>
            </form>
        </div>
    `;
    
    await loadMessages(userId);
    
    document.getElementById('messageForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await sendMessage(userId);
    });
    
    document.getElementById('messageInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            document.getElementById('messageForm').dispatchEvent(new Event('submit'));
        }
    });
    
    messageRefreshInterval = setInterval(() => {
        loadMessages(userId, true);
    }, 3000);
}

async function loadMessages(userId, silent = false) {
    const response = await fetchWithAuth(`/api/messages/conversation/${userId}`);
    if (!response) return;
    
    const data = await response.json();
    
    if (data.status === 'success') {
        displayMessages(data.messages);
        if (!silent) {
            loadConversations();
        }
    }
}

function displayMessages(messages) {
    const container = document.getElementById('chatMessages');
    const wasAtBottom = container.scrollHeight - container.scrollTop === container.clientHeight;
    
    if (messages.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>No messages yet</p>
                <p style="font-size: 0.875rem;">Start the conversation!</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = messages.map(msg => {
        const isSent = msg.sender_id === user.id;
        const time = new Date(msg.sent_at);
        const timeStr = formatMessageTime(time);
        
        return `
            <div class="message-bubble ${isSent ? 'sent' : 'received'}">
                <div class="message-content">${msg.body}</div>
                <div class="message-time">${timeStr}</div>
            </div>
        `;
    }).join('');
    
    if (wasAtBottom || messages.length < 2) {
        container.scrollTop = container.scrollHeight;
    }
}

async function sendMessage(recipientId) {
    const input = document.getElementById('messageInput');
    const body = input.value.trim();
    
    if (!body) return;
    
    const response = await fetchWithAuth('/api/messages/send', {
        method: 'POST',
        body: JSON.stringify({ recipientId, body })
    });
    
    if (!response) return;
    
    const data = await response.json();
    
    if (data.status === 'success') {
        input.value = '';
        await loadMessages(recipientId, true);
        loadConversations();
    }
}

function formatMessageTime(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
}

function openNewChatModal() {
    document.getElementById('newChatModal').classList.remove('hidden');
    document.getElementById('userSearch').focus();
}

function closeNewChatModal() {
    document.getElementById('newChatModal').classList.add('hidden');
    document.getElementById('userSearch').value = '';
    document.getElementById('userSearchResults').innerHTML = '<p class="text-muted">Type to search for users...</p>';
}

document.getElementById('userSearch').addEventListener('input', async (e) => {
    const query = e.target.value.trim();
    
    if (query.length < 2) {
        document.getElementById('userSearchResults').innerHTML = '<p class="text-muted">Type at least 2 characters...</p>';
        return;
    }
    
    const response = await fetchWithAuth(`/api/messages/search/users?query=${encodeURIComponent(query)}`);
    if (!response) return;
    
    const data = await response.json();
    
    if (data.status === 'success') {
        const resultsContainer = document.getElementById('userSearchResults');
        
        if (data.users.length === 0) {
            resultsContainer.innerHTML = '<p class="text-muted">No users found</p>';
            return;
        }
        
        resultsContainer.innerHTML = data.users.map(u => `
            <div class="conversation-item" onclick="startConversation(${u.user_id}, '${u.name}')">
                <div class="conversation-name">${u.name}</div>
                <div class="conversation-preview">${u.email} - ${u.role}</div>
            </div>
        `).join('');
    }
});

function startConversation(userId, userName) {
    closeNewChatModal();
    openConversation(userId, userName);
}

document.getElementById('conversationSearch').addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    const items = document.querySelectorAll('.conversation-item');
    
    items.forEach(item => {
        const name = item.querySelector('.conversation-name').textContent.toLowerCase();
        const preview = item.querySelector('.conversation-preview').textContent.toLowerCase();
        
        if (name.includes(query) || preview.includes(query)) {
            item.style.display = '';
        } else {
            item.style.display = 'none';
        }
    });
});

window.onclick = function(event) {
    const modal = document.getElementById('newChatModal');
    if (event.target === modal) {
        closeNewChatModal();
    }
};

window.openNewChatModal = openNewChatModal;
window.closeNewChatModal = closeNewChatModal;
window.openConversation = openConversation;
window.startConversation = startConversation;

loadConversations();

window.addEventListener('beforeunload', () => {
    if (messageRefreshInterval) {
        clearInterval(messageRefreshInterval);
    }
});