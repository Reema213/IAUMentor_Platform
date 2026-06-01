const signupForm = document.getElementById('signupForm');
const signupBtn = document.getElementById('signupBtn');
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

signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const role = document.getElementById('role').value;
    
    if (password !== confirmPassword) {
        showAlert('Passwords do not match');
        return;
    }
    
    if (password.length < 6) {
        showAlert('Password must be at least 6 characters long');
        return;
    }
    
    signupBtn.disabled = true;
    signupBtn.innerHTML = '<span class="loading"></span> Creating account...';
    
    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, email, password, role })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            
            showAlert('Registration successful! Redirecting...', 'success');
            
            setTimeout(() => {
                window.location.href = '/dashboard.html';
            }, 1000);
        } else {
            showAlert(data.message || 'Registration failed. Please try again.');
            signupBtn.disabled = false;
            signupBtn.innerHTML = 'Sign Up';
        }
    } catch (error) {
        showAlert('Network error. Please check your connection.');
        signupBtn.disabled = false;
        signupBtn.innerHTML = 'Sign Up';
    }
});