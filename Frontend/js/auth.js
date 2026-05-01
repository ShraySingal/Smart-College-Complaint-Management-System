const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
// Production Render backend URL
const PROD_BACKEND_URL = 'https://my-smart-college-complaint-management.onrender.com';
const API_BASE = isLocal ? 'http://localhost:5010/api' : `${PROD_BACKEND_URL}/api`;

// DOM Elements
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const forgotPasswordForm = document.getElementById('forgotPasswordForm');
const loginError = document.getElementById('loginError');

document.addEventListener('DOMContentLoaded', () => {
    if (loginForm) loginForm.addEventListener('submit', handleLogin);
    if (registerForm) registerForm.addEventListener('submit', handleRegister);
    if (forgotPasswordForm) forgotPasswordForm.addEventListener('submit', handleForgotPassword);
    
    // Password toggle logic
    const togglePassword = document.getElementById('togglePassword');
    const password = document.getElementById('loginPassword');
    
    if (togglePassword && password) {
        togglePassword.addEventListener('click', function () {
            const type = password.getAttribute('type') === 'password' ? 'text' : 'password';
            password.setAttribute('type', type);
            this.classList.toggle('fa-eye');
            this.classList.toggle('fa-eye-slash');
        });
    }

    checkAuth();
});

function checkAuth() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');

    if (token && user && (window.location.pathname.includes('login.html') || window.location.pathname.includes('register.html') || window.location.pathname.includes('forgot-password.html'))) {
        const userData = JSON.parse(user);
        redirectBasedOnRole(userData.role);
    }

    if ((!token || !user) && !window.location.pathname.includes('login.html') && !window.location.pathname.includes('register.html') && !window.location.pathname.includes('forgot-password.html')) {
        window.location.href = 'login.html';
    }
}

async function handleLogin(e) {
    e.preventDefault();
    loginError.textContent = '';
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const submitBtn = loginForm.querySelector('button');
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Logging in...';
    submitBtn.disabled = true;

    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            redirectBasedOnRole(data.user.role);
        } else {
            loginError.textContent = data.message || 'Login failed';
        }
    } catch (error) {
        loginError.textContent = 'Server connection failed';
    } finally {
        submitBtn.innerHTML = 'Sign In <i class="fa-solid fa-arrow-right"></i>';
        submitBtn.disabled = false;
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const role = document.getElementById('role').value;
    const department = document.getElementById('department').value;
    const phone = document.getElementById('phone').value;
    const academicYear = document.getElementById('academicYear').value;
    
    const submitBtn = registerForm.querySelector('button');
    const errorEl = document.getElementById('registerError');
    if (errorEl) errorEl.textContent = '';
    
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creating Account...';
    submitBtn.disabled = true;

    try {
        const response = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password, role, department, phone, academicYear })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            redirectBasedOnRole(data.user.role);
        } else {
            if (errorEl) errorEl.textContent = data.message || 'Registration failed';
            else alert(data.message || 'Registration failed');
        }
    } catch (error) {
        if (errorEl) errorEl.textContent = 'Server connection failed';
        else alert('Server connection failed');
    } finally {
        submitBtn.innerHTML = 'Complete Registration <i class="fa-solid fa-arrow-right"></i>';
        submitBtn.disabled = false;
    }
}

async function handleForgotPassword(e) {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const submitBtn = forgotPasswordForm.querySelector('button');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending...';
    submitBtn.disabled = true;

    try {
        const response = await fetch(`${API_BASE}/auth/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const data = await response.json();
        alert(data.message);
    } catch (e) {
        alert('Failed to connect to server');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}

function redirectBasedOnRole(role) {
    const r = role.toLowerCase();
    if (r === 'admin') {
        window.location.href = 'admin.html';
    } else if (r === 'student') {
        window.location.href = 'student.html';
    } else if (r === 'teacher' || r === 'faculty' || r === 'staff') {
        window.location.href = 'teacher.html';
    } else {
        window.location.href = 'login.html';
    }
}
