document.addEventListener('DOMContentLoaded', () => {
    const bookingForm = document.getElementById('quickBookingForm');
    const dateInput = document.getElementById('booking-date');
    
    const today = new Date().toISOString().split('T')[0];
    dateInput.setAttribute('min', today);
    
    bookingForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const token = localStorage.getItem('token');
        
        if (!token) {
            alert('Please login or sign up to book a session');
            window.location.href = '/login.html';
            return;
        }
        
        alert('This feature will be available after authentication module is complete');
    });
    
    const navLinks = document.querySelectorAll('.nav-links a');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            if (link.getAttribute('href').startsWith('#')) {
                e.preventDefault();
                const targetId = link.getAttribute('href');
                const targetSection = document.querySelector(targetId);
                if (targetSection) {
                    targetSection.scrollIntoView({ behavior: 'smooth' });
                }
            }
        });
    });
});