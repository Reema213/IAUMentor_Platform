const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user') || '{}');

if (!token) {
    window.location.href = '/login.html';
}

let currentCategoryId = null;
let currentCategoryName = '';
let currentThreadId = null;
let allCategories = [];

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
    });
});

async function loadCategories() {
    const response = await fetch('/api/forums/categories');
    if (!response) return;
    
    const data = await response.json();
    
    if (data.status === 'success') {
        allCategories = data.categories;
        displayCategories(data.categories);
        populateCategoryDropdown(data.categories);
    }
}

function displayCategories(categories) {
    const grid = document.getElementById('categoriesGrid');
    
    grid.innerHTML = categories.map(cat => `
        <div class="card" onclick="viewCategory(${cat.category_id}, '${cat.name}')" style="cursor: pointer; transition: all 0.3s;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="flex: 1;">
                    <h3>${cat.icon} ${cat.name}</h3>
                    <p>${cat.description}</p>
                </div>
                <div style="text-align: right; color: var(--text-secondary); font-size: 0.875rem;">
                    <div><strong>${cat.thread_count}</strong> threads</div>
                    <div><strong>${cat.reply_count}</strong> replies</div>
                </div>
            </div>
        </div>
    `).join('');
}

function populateCategoryDropdown(categories) {
    const select = document.getElementById('threadCategory');
    select.innerHTML = '<option value="">Select category</option>' + 
        categories.map(cat => `<option value="${cat.category_id}">${cat.icon} ${cat.name}</option>`).join('');
}

async function viewCategory(categoryId, categoryName) {
    currentCategoryId = categoryId;
    currentCategoryName = categoryName;
    
    const category = allCategories.find(c => c.category_id === categoryId);
    
    document.getElementById('categoryTitle').textContent = `${category.icon} ${categoryName}`;
    document.getElementById('categoryDesc').textContent = category.description;
    
    document.getElementById('threadsLink').classList.remove('hidden');
    document.querySelector('[data-view="threads"]').click();
    
    const response = await fetch(`/api/forums/categories/${categoryId}/threads`);
    const data = await response.json();
    
    if (data.status === 'success') {
        displayThreads(data.threads);
    }
}

function displayThreads(threads) {
    const grid = document.getElementById('threadsGrid');
    
    if (threads.length === 0) {
        grid.innerHTML = '<div class="card"><p class="text-muted">No threads yet. Be the first to start a discussion!</p></div>';
        return;
    }
    
    grid.innerHTML = threads.map(thread => {
        const date = new Date(thread.created_at).toLocaleDateString();
        const score = thread.upvotes - thread.downvotes;
        
        return `
            <div class="card" onclick="viewThread(${thread.thread_id})" style="cursor: pointer;">
                <div style="display: flex; gap: 1rem;">
                    <div style="text-align: center; min-width: 60px;">
                        <div style="font-size: 1.5rem; font-weight: bold; color: ${score > 0 ? 'var(--success-color)' : 'var(--text-secondary)'};">
                            ${score}
                        </div>
                        <div style="font-size: 0.75rem; color: var(--text-secondary);">votes</div>
                    </div>
                    <div style="flex: 1;">
                        <h3>${thread.is_pinned ? '📌 ' : ''}${thread.title}${thread.is_locked ? ' 🔒' : ''}</h3>
                        <p style="color: var(--text-secondary); font-size: 0.875rem; margin: 0.5rem 0;">
                            ${thread.content.substring(0, 150)}${thread.content.length > 150 ? '...' : ''}
                        </p>
                        <div style="display: flex; gap: 1rem; font-size: 0.875rem; color: var(--text-secondary);">
                            <span>👤 ${thread.author_name}</span>
                            <span>💬 ${thread.reply_count} replies</span>
                            <span>👁️ ${thread.views} views</span>
                            <span>📅 ${date}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

async function viewThread(threadId) {
    currentThreadId = threadId;
    
    document.getElementById('threadLink').classList.remove('hidden');
    document.querySelector('[data-view="thread"]').click();
    
    const response = await fetch(`/api/forums/threads/${threadId}`);
    const data = await response.json();
    
    if (data.status === 'success') {
        displayThread(data.thread, data.replies);
    }
}

function displayThread(thread, replies) {
    const date = new Date(thread.created_at).toLocaleDateString();
    const score = thread.upvotes - thread.downvotes;
    const isOwner = thread.user_id === user.id;
    
    const content = document.getElementById('threadContent');
    content.innerHTML = `
        <div class="card">
            <div style="display: flex; gap: 1rem; margin-bottom: 1rem;">
                <div style="text-align: center; min-width: 60px;">
                    <button onclick="vote('thread', ${thread.thread_id}, 'upvote')" style="background: none; border: none; cursor: pointer; font-size: 1.5rem;">⬆️</button>
                    <div style="font-size: 1.5rem; font-weight: bold; color: ${score > 0 ? 'var(--success-color)' : 'var(--text-secondary)'};">
                        ${score}
                    </div>
                    <button onclick="vote('thread', ${thread.thread_id}, 'downvote')" style="background: none; border: none; cursor: pointer; font-size: 1.5rem;">⬇️</button>
                </div>
                <div style="flex: 1;">
                    <h2>${thread.title}</h2>
                    <p style="white-space: pre-wrap;">${thread.content}</p>
                    <div style="display: flex; gap: 1rem; font-size: 0.875rem; color: var(--text-secondary); margin-top: 1rem;">
                        <span>👤 ${thread.author_name} (${thread.author_role})</span>
                        <span>📅 ${date}</span>
                        <span>👁️ ${thread.views} views</span>
                    </div>
                    ${isOwner || user.role === 'admin' ? `
                        <button class="btn-danger" onclick="deleteThread(${thread.thread_id})" style="margin-top: 1rem;">Delete Thread</button>
                    ` : ''}
                </div>
            </div>
        </div>
        
        <div class="card">
            <h3>${replies.length} Replies</h3>
            <div id="repliesList">
                ${replies.length > 0 ? replies.map(reply => {
                    const replyDate = new Date(reply.created_at).toLocaleDateString();
                    const replyScore = reply.upvotes - reply.downvotes;
                    
                    return `
                        <div style="padding: 1rem; border: ${reply.is_solution ? '2px solid var(--success-color)' : '1px solid var(--border-color)'}; border-radius: 6px; margin-bottom: 1rem; ${reply.is_solution ? 'background: #f0fdf4;' : ''}">
                            ${reply.is_solution ? '<div style="color: var(--success-color); font-weight: bold; margin-bottom: 0.5rem;">✓ Accepted Solution</div>' : ''}
                            <div style="display: flex; gap: 1rem;">
                                <div style="text-align: center; min-width: 40px;">
                                    <button onclick="vote('reply', ${reply.reply_id}, 'upvote')" style="background: none; border: none; cursor: pointer;">⬆️</button>
                                    <div style="font-weight: bold;">${replyScore}</div>
                                    <button onclick="vote('reply', ${reply.reply_id}, 'downvote')" style="background: none; border: none; cursor: pointer;">⬇️</button>
                                </div>
                                <div style="flex: 1;">
                                    <p style="white-space: pre-wrap;">${reply.content}</p>
                                    <div style="display: flex; gap: 1rem; font-size: 0.875rem; color: var(--text-secondary); margin-top: 0.5rem;">
                                        <span>👤 ${reply.author_name} (${reply.author_role})</span>
                                        <span>📅 ${replyDate}</span>
                                    </div>
                                    ${thread.user_id === user.id && !reply.is_solution ? `
                                        <button class="btn-success" onclick="markAsSolution(${reply.reply_id})" style="margin-top: 0.5rem; font-size: 0.875rem; padding: 0.5rem 1rem;">Mark as Solution</button>
                                    ` : ''}
                                </div>
                            </div>
                        </div>
                    `;
                }).join('') : '<p class="text-muted">No replies yet. Be the first to reply!</p>'}
            </div>
        </div>
        
        ${!thread.is_locked ? `
            <div class="card">
                <h3>Post a Reply</h3>
                <form id="replyForm">
                    <textarea id="replyContent" rows="5" placeholder="Share your thoughts..." style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 6px;" required></textarea>
                    <button type="submit" class="btn-primary" style="margin-top: 1rem;">Post Reply</button>
                </form>
            </div>
        ` : '<div class="card"><p class="text-muted">🔒 This thread is locked. No more replies allowed.</p></div>'}
    `;
    
    if (!thread.is_locked) {
        document.getElementById('replyForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await postReply(thread.thread_id);
        });
    }
}

async function postReply(threadId) {
    const content = document.getElementById('replyContent').value;
    
    const response = await fetchWithAuth('/api/forums/replies', {
        method: 'POST',
        body: JSON.stringify({ threadId, content })
    });
    
    if (!response) return;
    
    const data = await response.json();
    
    if (data.status === 'success') {
        viewThread(threadId);
    }
}

window.vote = async function(targetType, targetId, voteType) {
    const response = await fetchWithAuth('/api/forums/vote', {
        method: 'POST',
        body: JSON.stringify({ targetType, targetId, voteType })
    });
    
    if (!response) return;
    
    const data = await response.json();
    
    if (data.status === 'success') {
        viewThread(currentThreadId);
    }
};

window.markAsSolution = async function(replyId) {
    const response = await fetchWithAuth('/api/forums/solution', {
        method: 'POST',
        body: JSON.stringify({ replyId })
    });
    
    if (!response) return;
    
    const data = await response.json();
    
    if (data.status === 'success') {
        viewThread(currentThreadId);
    }
};

window.deleteThread = async function(threadId) {
    if (!confirm('Are you sure you want to delete this thread?')) return;
    
    const response = await fetchWithAuth(`/api/forums/threads/${threadId}`, {
        method: 'DELETE'
    });
    
    if (!response) return;
    
    const data = await response.json();
    
    if (data.status === 'success') {
        backToThreads();
    }
};

function openNewThreadModal() {
    document.getElementById('newThreadModal').classList.remove('hidden');
}

function closeNewThreadModal() {
    document.getElementById('newThreadModal').classList.add('hidden');
    document.getElementById('newThreadForm').reset();
}

document.getElementById('newThreadForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const categoryId = document.getElementById('threadCategory').value;
    const title = document.getElementById('threadTitle').value;
    const content = document.getElementById('threadContentDetails').value;

    const response = await fetchWithAuth('/api/forums/threads', {
        method: 'POST',
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ categoryId, title, content })
    });

    if (!response) return;

    const data = await response.json();
    
    const alertsDiv = document.getElementById('threadAlerts');
    if (data.status === 'success') {
        alertsDiv.innerHTML = '<div class="alert alert-success">Thread created successfully!</div>';
        setTimeout(() => {
            closeNewThreadModal();
            viewCategory(parseInt(categoryId), '');
        }, 1000);
    } else {
        alertsDiv.innerHTML = `<div class="alert alert-error">${data.message}</div>`;
    }
});


document.getElementById('searchBtn').addEventListener('click', async () => {
    const query = document.getElementById('forumSearch').value.trim();
    
    if (!query) {
        loadCategories();
        return;
    }
    
    const response = await fetch(`/api/forums/search?query=${encodeURIComponent(query)}`);
    const data = await response.json();
    
    if (data.status === 'success') {
        const grid = document.getElementById('categoriesGrid');
        if (data.threads.length === 0) {
            grid.innerHTML = '<div class="card"><p class="text-muted">No results found</p></div>';
        } else {
            grid.innerHTML = data.threads.map(thread => `
                <div class="card" onclick="viewThread(${thread.thread_id})" style="cursor: pointer;">
                    <h3>${thread.title}</h3>
                    <p style="color: var(--text-secondary); font-size: 0.875rem;">
                        ${thread.content.substring(0, 150)}...
                    </p>
                    <div style="display: flex; gap: 1rem; font-size: 0.875rem; color: var(--text-secondary);">
                        <span>📂 ${thread.category_name}</span>
                        <span>👤 ${thread.author_name}</span>
                        <span>💬 ${thread.reply_count} replies</span>
                    </div>
                </div>
            `).join('');
        }
    }
});

document.getElementById('forumSearch').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        document.getElementById('searchBtn').click();
    }
});

window.backToCategories = function() {
    currentCategoryId = null;
    document.getElementById('threadsLink').classList.add('hidden');
    document.getElementById('threadLink').classList.add('hidden');
    document.querySelector('[data-view="categories"]').click();
    loadCategories();
};

window.backToThreads = function() {
    currentThreadId = null;
    document.getElementById('threadLink').classList.add('hidden');
    document.querySelector('[data-view="threads"]').click();
    if (currentCategoryId) {
        viewCategory(currentCategoryId, currentCategoryName);
    }
};

window.viewCategory = viewCategory;
window.viewThread = viewThread;
window.openNewThreadModal = openNewThreadModal;
window.closeNewThreadModal = closeNewThreadModal;

window.onclick = function(event) {
    const modal = document.getElementById('newThreadModal');
    if (event.target === modal) {
        closeNewThreadModal();
    }
};

loadCategories();