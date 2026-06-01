const loginForm = document.getElementById('loginForm');
const loginBtn = document.getElementById('loginBtn');
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

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<span class="loading"></span> Logging in...';
    
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            
            showAlert('Login successful! Redirecting...', 'success');
            
            setTimeout(() => {
                const role = data.user.role;
                if(role === 'admin') {
                    window.location.href = '/admin.html';
                } else {
                    window.location.href = '/dashboard.html';
                }
            }, 1000);
            
        } else {
            showAlert(data.message || 'Login failed. Please try again.');
            loginBtn.disabled = false;
            loginBtn.innerHTML = 'Login';
        }
    } catch (error) {
        showAlert('Network error. Please check your connection.');
        loginBtn.disabled = false;
        loginBtn.innerHTML = 'Login';
    }
});