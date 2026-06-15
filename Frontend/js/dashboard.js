const PROD_BACKEND_URL = 'https://my-smart-college-complaint-management.onrender.com';
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:';

const API_BASE = isLocal 
    ? 'http://localhost:5010/api' 
    : `${PROD_BACKEND_URL}/api`; 

// Fallback for non-standard local IPs
if (window.location.hostname.startsWith('192.168.') && !API_BASE.includes('http')) {
    API_BASE = `http://${window.location.hostname}:5010/api`;
}

let currentUser = null;
let token = null;
let capturedBlob = null;
let mediaStream = null;
let profileStream = null;
let complaintMediaRecorder = null;
let complaintRecordedChunks = [];
let currentFacingMode = 'environment';
let profFacingMode = 'user';
let resolveFacingMode = 'environment';
let resolveMediaStream = null;
let resolveMediaRecorder = null;
let resolveRecordedChunks = [];
let resolveCapturedBlob = null;
let currentComplaints = [];
let currentPage = 1;
let totalPages = 1;

const logoutBtn = document.getElementById('logoutBtn');
const welcomeText = document.getElementById('welcomeText');
const complaintModal = document.getElementById('complaintModal');
const openComplaintModalBtn = document.getElementById('openComplaintModalBtn');
const closeModalBtns = document.querySelectorAll('.close-modal');
const complaintForm = document.getElementById('complaintForm');
const resolveModal = document.getElementById('resolveModal');
const resolveForm = document.getElementById('resolveForm');
const feedbackModal = document.getElementById('feedbackModal');
const feedbackForm = document.getElementById('feedbackForm');
const settingsModal = document.getElementById('settingsModal');
const changePasswordForm = document.getElementById('changePasswordForm');
const toast = document.getElementById('toast');

let socket = null;

window.onerror = function(msg, url, line) {
    alert(`DEBUG ERROR: ${msg} at ${line}`);
    return false;
};

document.addEventListener('DOMContentLoaded', async () => {
    console.log(`System Initialized. API Base: ${API_BASE}`);
    initTheme();
    initDashboard();
    setupEventListeners();
    initSocket();
    
    // Health check
    try {
        const start = Date.now();
        const res = await fetch(`${API_BASE.replace('/api', '')}/health`, { mode: 'no-cors' });
        console.log(`Backend Health Check: ${res.type} in ${Date.now() - start}ms`);
    } catch (e) {
        console.error('Backend unreachable:', e);
    }
});

function switchMediaSource(type) {
    const sourceUpload = document.getElementById('sourceUpload');
    const sourceCapture = document.getElementById('sourceCapture');
    const uploadSection = document.getElementById('uploadSection');
    const cameraSection = document.getElementById('cameraSection');

    if (type === 'upload') {
        sourceUpload.classList.add('active');
        sourceCapture.classList.remove('active');
        uploadSection.style.display = 'block';
        cameraSection.classList.remove('active');
        stopCamera();
    } else {
        sourceCapture.classList.add('active');
        sourceUpload.classList.remove('active');
        uploadSection.style.display = 'none';
        cameraSection.classList.add('active');
        
        // Auto-start camera
        const startBtn = document.getElementById('startCamera');
        if (startBtn) startBtn.click();
    }
}

function switchTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
        tab.style.display = 'none';
    });
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));

    // Show selected tab
    const selectedTab = document.getElementById(`${tabName}Tab`);
    if (selectedTab) {
        selectedTab.classList.add('active');
        selectedTab.style.display = 'block';
    }
    
    // Update button state
    if (event && event.currentTarget) event.currentTarget.classList.add('active');

    // Load data for the selected tab
    if (tabName === 'logs') fetchLogs();
    if (tabName === 'analytics') updateAdminStats();
    if (tabName === 'users') fetchUsers();
    if (tabName === 'aiInsights') { loadRecommendations(); loadFAQ(); }
    if (tabName === 'rankings') loadDeptPerformance();
    if (tabName === 'hostelTracker') loadHostelTracking();
}

async function fetchUsers() {
    const list = document.getElementById('adminUsersList');
    if (!list) return;

    try {
        const response = await fetch(`${API_BASE}/auth/all-users`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const users = await response.json();
        list.innerHTML = users.map(u => `
            <tr>
                <td>${u.name}</td>
                <td>${u.email}</td>
                <td><span class="badge badge-low">${u.role}</span></td>
                <td>${u.department}</td>
                <td><span class="badge badge-${u.status === 'Active' ? 'success' : 'danger'}">${u.status}</span></td>
                <td>
                    <button class="btn btn-${u.status === 'Active' ? 'outline' : 'primary'} btn-sm" onclick="toggleUserStatus('${u.id}')">
                        ${u.status === 'Active' ? 'Deactivate' : 'Activate'}
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (e) {}
}

async function toggleUserStatus(userId) {
    try {
        const response = await fetch(`${API_BASE}/auth/status/${userId}`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            fetchUsers();
            showToast('User status updated', 'success');
        }
    } catch (e) {}
}

async function fetchLogs() {
    const logContainer = document.getElementById('systemLogs');
    if (!logContainer) return;
    
    try {
        const response = await fetch(`${API_BASE}/health/logs`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const logs = await response.json();
        logContainer.innerHTML = logs.map(l => `<div>[${l.timestamp}] ${l.level.toUpperCase()}: ${l.message}</div>`).join('');
        logContainer.scrollTop = logContainer.scrollHeight;
    } catch (e) {
        logContainer.innerHTML = 'Error loading logs.';
    }
}

function initSocket() {
    if (typeof io !== 'undefined') {
        const SOCKET_URL = isLocal ? 'http://localhost:5010' : PROD_BACKEND_URL;
        socket = io(SOCKET_URL);
        
        socket.on('connect', () => {
            console.log('Connected to WebSocket');
            if (currentUser) socket.emit('join', currentUser.id);
        });

        socket.on('user_notification', (data) => {
            showToast(data.message, 'success');
            loadUserComplaints();
        });

        socket.on('admin_notification', (data) => {
            showToast(data.message, 'info');
            if (window.location.pathname.includes('admin.html')) loadAdminComplaints();
        });

        socket.on('admin_alert', (data) => {
            showToast(data.message, 'danger');
        });
    }
}

function initDashboard() {
    token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (!token || !userStr) {
        window.location.href = 'login.html';
        return;
    }

    currentUser = JSON.parse(userStr);

    if (welcomeText) {
        welcomeText.innerHTML = `Hello, <b>${currentUser.name}</b> <span class="badge badge-low">${currentUser.role}</span>`;
    }

    populateProfileCard(currentUser);
    startHealthWatchdog();
    loadNotifications();

    // Load appropriate data based on page
    if (window.location.pathname.includes('admin.html')) {
        loadAdminComplaints();
    } else {
        loadUserComplaints();

    }
}

function startHealthWatchdog() {
    setInterval(async () => {
        try {
            const res = await fetch(`${API_BASE}/health`);
            if (!res.ok) throw new Error();
            const overlay = document.getElementById('offlineOverlay');
            if (overlay) overlay.style.display = 'none';
        } catch (e) {
            showOfflineOverlay();
        }
    }, 10000);
}

function showOfflineOverlay() {
    let overlay = document.getElementById('offlineOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'offlineOverlay';
        overlay.style = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 9999; display: flex; align-items: center; justify-content: center; color: white; flex-direction: column;';
        overlay.innerHTML = `
            <i class="fa-solid fa-plug-circle-xmark" style="font-size: 3rem; margin-bottom: 1rem;"></i>
            <h3>Connection Lost</h3>
            <p>We are attempting to reconnect you to the server...</p>
        `;
        document.body.appendChild(overlay);
    }
    overlay.style.display = 'flex';
}

function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const themeToggleBtn = document.getElementById('themeToggle');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
        if (themeToggleBtn) themeToggleBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
    }
}

function setupEventListeners() {
    const themeToggleBtn = document.getElementById('themeToggle');
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            const isDark = document.body.classList.toggle('dark-theme');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
            themeToggleBtn.innerHTML = isDark ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = 'login.html';
        });
    }
    
    if (openComplaintModalBtn) {
        openComplaintModalBtn.addEventListener('click', () => {
            complaintModal.classList.add('active');
        });
    }

    closeModalBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (complaintModal) complaintModal.classList.remove('active');
            if (resolveModal) resolveModal.classList.remove('active');
            if (feedbackModal) feedbackModal.classList.remove('active');
            if (settingsModal) settingsModal.classList.remove('active');
            const viewModal = document.getElementById('viewComplaintModal');
            if (viewModal) viewModal.classList.remove('active');
            
            if (complaintForm) complaintForm.reset();
            if (resolveForm) resolveForm.reset();
            if (feedbackForm) feedbackForm.reset();
            if (changePasswordForm) changePasswordForm.reset();
            stopCamera();
            capturedBlob = null;
            const preview = document.getElementById('filePreview');
            if (preview) preview.innerHTML = '';
        });
    });

    const openSettingsBtn = document.getElementById('openSettingsBtn');
    if (openSettingsBtn) {
        openSettingsBtn.addEventListener('click', () => {
            settingsModal.classList.add('active');
        });
    }

    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const currentPassword = document.getElementById('currentPassword').value;
            const newPassword = document.getElementById('newPassword').value;
            
            try {
                const response = await fetch(`${API_BASE}/auth/change-password`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ currentPassword, newPassword })
                });
                
                if (response.ok) {
                    showToast('Password updated successfully', 'success');
                    settingsModal.classList.remove('active');
                    changePasswordForm.reset();
                } else {
                    const data = await response.json();
                    alert(data.message || 'Failed to update password');
                }
            } catch (error) {
                alert('Error updating password');
            }
        });
    }

    if (complaintForm) {
        complaintForm.addEventListener('submit', handleRaiseComplaint);

        // Media source toggle
        const sourceUpload = document.getElementById('sourceUpload');
        const sourceCapture = document.getElementById('sourceCapture');
        const uploadSection = document.getElementById('uploadSection');
        const cameraSection = document.getElementById('cameraSection');

        if (sourceUpload && sourceCapture) {
            sourceUpload.addEventListener('click', () => {
                sourceUpload.classList.add('active');
                sourceCapture.classList.remove('active');
                uploadSection.style.display = 'block';
                cameraSection.classList.remove('active');
                stopCamera();
            });

            sourceCapture.addEventListener('click', () => {
                sourceCapture.classList.add('active');
                sourceUpload.classList.remove('active');
                uploadSection.style.display = 'none';
                cameraSection.classList.add('active');
                
                // Auto-start camera when clicked
                const startBtn = document.getElementById('startCamera');
                if (startBtn) startBtn.click();
            });
        }

        // File preview
        const fileInput = document.getElementById('compAttachment');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                const preview = document.getElementById('filePreview');
                if (!file || !preview) return;
                capturedBlob = null; // Clear captured blob if user selects file
                preview.innerHTML = '';

                if (file.type.startsWith('image/')) {
                    const img = document.createElement('img');
                    img.src = URL.createObjectURL(file);
                    img.style.maxWidth = '100%';
                    img.style.maxHeight = '150px';
                    img.style.borderRadius = '8px';
                    preview.appendChild(img);
                } else if (file.type.startsWith('video/')) {
                    const vid = document.createElement('video');
                    vid.src = URL.createObjectURL(file);
                    vid.controls = true;
                    vid.style.maxWidth = '100%';
                    vid.style.maxHeight = '150px';
                    vid.style.borderRadius = '8px';
                    preview.appendChild(vid);
                }
                const name = document.createElement('p');
                name.textContent = file.name;
                name.style.fontSize = '0.8rem';
                name.style.color = '#64748b';
                name.style.marginTop = '0.3rem';
                preview.appendChild(name);
            });
        }
    }
    
    if (resolveForm) {
        resolveForm.addEventListener('submit', submitResolution);
    }
    
    if (feedbackForm) {
        feedbackForm.addEventListener('submit', submitFeedback);
    }
}

async function handleRaiseComplaint(e) {
    if (e && typeof e.preventDefault === 'function') {
        e.preventDefault();
        e.stopPropagation();
    }
    
    console.log('Submission started...');
    const submitBtn = document.querySelector('#complaintForm button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting...';

    const fileInput = document.getElementById('compAttachment');
    const file = capturedBlob || (fileInput ? fileInput.files[0] : null);

    if (!file) {
        alert('Please attach an image/video or capture a photo before submitting.');
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Submit Complaint';
        return;
    }

    const formData = new FormData();
    formData.append('title', document.getElementById('compTitle').value);
    formData.append('category', document.getElementById('compCategory').value);
    formData.append('description', document.getElementById('compDesc').value);
    formData.append('location', document.getElementById('compLocation').value);
    formData.append('room', document.getElementById('compRoom').value);
    const anonCheck = document.getElementById('compAnonymous');
    if (anonCheck && anonCheck.checked) formData.append('isAnonymous', 'true');
    
    if (capturedBlob) {
        const ext = capturedBlob.type.includes('video') ? 'webm' : 'jpg';
        formData.append('attachment', capturedBlob, `capture_${Date.now()}.${ext}`);
    } else {
        formData.append('attachment', file);
    }

    try {
        // 60-second timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);

        const response = await fetch(`${API_BASE}/complaints/raise`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData,
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (response.ok) {
            showToast('Complaint registered successfully!');
            complaintModal.classList.remove('active');
            complaintForm.reset();
            const preview = document.getElementById('filePreview');
            if (preview) preview.innerHTML = '';
            loadUserComplaints();
        } else {
            const data = await response.json();
            alert(`${data.message}${data.error ? ': ' + data.error : ''}`);
        }
    } catch (error) {
        alert('Submission Error: ' + (error.name === 'AbortError' ? 'Request timed out' : error.message));
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Submit Complaint';
    }
}

async function loadUserComplaints() {
    const list = document.getElementById('userComplaintsList');
    if (!list) return;

    list.innerHTML = Array(3).fill(`
        <tr>
            <td><div class="skeleton skeleton-text"></div></td>
            <td><div class="skeleton skeleton-badge"></div></td>
            <td><div class="skeleton skeleton-badge"></div></td>
            <td><div class="skeleton skeleton-text short"></div></td>
            <td><div class="skeleton skeleton-badge" style="width:80px"></div></td>
        </tr>
    `).join('');

    try {
        const search = document.getElementById('searchInput')?.value || '';
        const status = document.getElementById('statusFilter')?.value || '';
        const category = document.getElementById('categoryFilter')?.value || '';
        
        const response = await fetch(`${API_BASE}/complaints/my-complaints?search=${search}&status=${status}&category=${category}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const complaints = await response.json();
        alert(`SUCCESS: Received ${complaints.length} complaints from server.`);
        console.log(`Fetched ${complaints.length} complaints from ${API_BASE}`);
        currentComplaints = complaints;

        if (!Array.isArray(complaints) || complaints.length === 0) {
            list.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted)"><i class="fa-solid fa-info-circle"></i> No complaints found.</td></tr>`;
            return;
        }

        list.innerHTML = complaints.map(c => `
            <tr>
                <td>${c.title}</td>
                <td><span class="badge badge-low">${c.category}</span></td>
                <td><span class="badge badge-${c.status === 'Resolved' ? 'resolved' : 'pending'}">${c.status}</span></td>
                <td>${new Date(c.createdAt).toLocaleDateString()}</td>
                <td>
                    ${c.status === 'Resolved' ? (c.Feedback ? `
                        <span style="color: var(--success); font-size: 0.85rem; font-weight: 500;">
                            <i class="fa-solid fa-check-double"></i> Feedback Sent
                        </span>
                    ` : `
                        <button class="btn btn-primary btn-sm" onclick="openFeedbackModal('${c.id}')">
                            <i class="fa-solid fa-star"></i> Feedback
                        </button>
                    `) : ''}
                </td>
            </tr>
        `).join('');
    } catch (error) {
        list.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--danger)">Error loading complaints.</td></tr>`;
    }
}

async function loadAdminComplaints() {
    const list = document.getElementById('adminComplaintsList');
    if (!list) return;

    list.innerHTML = Array(5).fill(`
        <tr>
            <td><div class="skeleton skeleton-text" style="width: 20px;"></div></td>
            <td><div class="skeleton skeleton-text"></div><div class="skeleton skeleton-text short"></div></td>
            <td><div class="skeleton skeleton-text"></div></td>
            <td><div class="skeleton skeleton-badge"></div></td>
            <td><div class="skeleton skeleton-badge"></div></td>
            <td><div class="skeleton skeleton-badge"></div></td>
            <td><div class="skeleton skeleton-badge" style="width: 80px;"></div></td>
        </tr>
    `).join('');

    try {
        const search = document.getElementById('searchInput')?.value || '';
        const status = document.getElementById('statusFilter')?.value || '';
        const category = document.getElementById('categoryFilter')?.value || '';

        const response = await fetch(`${API_BASE}/complaints/all?search=${search}&status=${status}&category=${category}&page=${currentPage}&limit=10`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        const complaints = data.complaints;
        currentComplaints = complaints;

        const totalEl = document.getElementById('totalComplaintsCount');
        if (totalEl) totalEl.textContent = data.totalItems || 0;

        totalPages = data.totalPages || 1;
        updatePaginationUI();

        if (!complaints || complaints.length === 0) {
            list.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted)">No complaints found.</td></tr>`;
            return;
        }

        list.innerHTML = complaints.map(c => {
            const isOverdue = c.status !== 'Resolved' && new Date(c.deadline) < new Date();
            return `
                <tr>
                    <td><input type="checkbox" class="complaint-checkbox" value="${c.id}" onchange="toggleBulkBtn()"></td>
                    <td>
                        ${c.User?.name || 'Unknown'}
                        <br><small style="color: var(--text-muted)"><i class="fa-solid fa-building"></i> ${c.User?.department || 'No Dept'}</small>
                    </td>
                    <td>${c.title}</td>
                    <td><span class="badge badge-low">${c.category}</span></td>
                    <td>
                        <span class="badge badge-${c.priority.toLowerCase()}">${c.priority}</span>
                        ${isOverdue ? '<span class="badge badge-high" style="font-size: 0.6rem; margin-left: 5px;">OVERDUE</span>' : ''}
                    </td>
                    <td><span class="badge badge-${c.status === 'Resolved' ? 'resolved' : 'pending'}">${c.status}</span></td>
                    <td>
                        ${c.status !== 'Resolved' ? `
                            <button class="btn btn-success btn-sm" onclick="openResolveModal('${c.id}')">
                                <i class="fa-solid fa-check"></i> Resolve
                            </button>
                        ` : ''}
                    </td>
                </tr>
            `;
        }).join('');

        await loadStaffList();
        await updateAdminStats();
    } catch (error) {
        console.error("Load admin error:", error);
    }
}

let statusChartInstance = null;
let categoryChartInstance = null;

function renderCharts(stats) {
    // Status Chart
    const statusCtx = document.getElementById('statusChart');
    if (statusCtx) {
        if (statusChartInstance) statusChartInstance.destroy();
        statusChartInstance = new Chart(statusCtx, {
            type: 'doughnut',
            data: {
                labels: ['Pending', 'In Progress', 'Resolved'],
                datasets: [{
                    data: [stats.pending, stats.inProgress || 0, stats.resolved],
                    backgroundColor: ['#f59e0b', '#3b82f6', '#10b981'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'bottom', labels: { color: '#e2e8f0' } }
                }
            }
        });
    }

    // Category Chart
    const categoryCtx = document.getElementById('categoryChart');
    if (categoryCtx && stats.categoryData) {
        if (categoryChartInstance) categoryChartInstance.destroy();
        const labels = stats.categoryData.map(c => c.category);
        const data = stats.categoryData.map(c => c.count);
        
        categoryChartInstance = new Chart(categoryCtx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Complaints',
                    data: data,
                    backgroundColor: '#8b5cf6',
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: { beginAtZero: true, ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.1)' } },
                    x: { ticks: { color: '#94a3b8' }, grid: { display: false } }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        });
    }
}

async function updateAdminStats() {
    try {
        const response = await fetch(`${API_BASE}/complaints/stats`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const stats = await response.json();
        
        const totalEl = document.getElementById('totalStats');
        const pendingEl = document.getElementById('pendingStats');
        const resolvedEl = document.getElementById('resolvedStats');
        const overdueEl = document.getElementById('overdueStats');

        if (totalEl) totalEl.textContent = stats.total;
        if (pendingEl) pendingEl.textContent = stats.pending;
        if (resolvedEl) resolvedEl.textContent = stats.resolved;
        if (overdueEl) overdueEl.textContent = stats.overdue;

        if (typeof Chart !== 'undefined') {
            renderCharts(stats);
        }
    } catch (e) {
        console.error('Stats error:', e);
    }
}

function openResolveModal(id) {
    if (resolveModal) {
        document.getElementById('resolveComplaintId').value = id;
        resolveModal.classList.add('active');
    }
}

async function submitResolution(e) {
    e.preventDefault();
    const id = document.getElementById('resolveComplaintId').value;
    const summary = document.getElementById('resSummary').value;
    const fileInput = document.getElementById('resAttachment');
    const submitBtn = resolveForm.querySelector('button');
    
    const formData = new FormData();
    formData.append('resolutionSummary', summary);
    
    if (resolveCapturedBlob) {
        // Handle captured photo/video
        const ext = resolveCapturedBlob.type.includes('video') ? 'webm' : 'jpg';
        formData.append('attachment', new File([resolveCapturedBlob], `resolution_proof_${Date.now()}.${ext}`, { type: resolveCapturedBlob.type }));
    } else if (fileInput && fileInput.files[0]) {
        // Handle normal file upload
        formData.append('attachment', fileInput.files[0]);
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Resolving...';

    try {
        const response = await fetch(`${API_BASE}/complaints/${id}/resolve`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`
                // Note: No Content-Type header needed for FormData
            },
            body: formData
        });
        
        if (response.ok) {
            showToast('Complaint resolved!');
            resolveModal.classList.remove('active');
            resolveForm.reset();
            if (currentUser.role === 'admin') loadAdminComplaints();
            else loadAssignedTasks();
        } else {
            const data = await response.json();
            alert(data.message || 'Failed to resolve complaint.');
        }
    } catch (error) {
        alert('Error connecting to server.');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Submit Resolution';
    }
}

function openFeedbackModal(id) {
    if (feedbackModal) {
        document.getElementById('feedbackComplaintId').value = id;
        feedbackModal.classList.add('active');
    }
}

async function openViewComplaintModal(id) {
    const complaint = currentComplaints.find(c => String(c.id) === String(id));
    if (!complaint) return;

    const modal = document.getElementById('viewComplaintModal');
    if (!modal) return;

    document.getElementById('viewCompTitle').textContent = complaint.title;
    document.getElementById('viewCompCategory').innerHTML = `${complaint.category} <br><small style="color: var(--text-muted)">By: ${complaint.User ? complaint.User.name : 'Unknown'} (${complaint.User ? (complaint.User.department || 'N/A') : ''})</small>`;
    document.getElementById('viewCompStatus').textContent = complaint.status;
    document.getElementById('viewCompLocation').textContent = complaint.location || 'N/A';
    document.getElementById('viewCompRoom').textContent = complaint.room || 'N/A';
    document.getElementById('viewCompDesc').textContent = complaint.description;

    const attachmentEl = document.getElementById('viewCompAttachment');
    attachmentEl.innerHTML = '';
    if (complaint.attachment) {
        const isVideo = complaint.attachment.match(/\.(mp4|webm|ogg|mov|avi|mkv)$/i);
        if (isVideo) {
            const vid = document.createElement('video');
            vid.src = complaint.attachment;
            vid.controls = true;
            attachmentEl.appendChild(vid);
        } else {
            const img = document.createElement('img');
            img.src = complaint.attachment;
            attachmentEl.appendChild(img);
        }
    } else {
        attachmentEl.innerHTML = '<p style="color: var(--text-muted)">No attachment provided.</p>';
    }

    const resSection = document.getElementById('viewResolutionSection');
    if (complaint.status === 'Resolved' && complaint.resolutionSummary) {
        resSection.style.display = 'block';
        document.getElementById('viewCompResolution').textContent = complaint.resolutionSummary;
        
        // --- NEW: Display Resolution Attachment ---
        let resAttachEl = document.getElementById('viewCompResAttachment');
        if (!resAttachEl) {
            resAttachEl = document.createElement('div');
            resAttachEl.id = 'viewCompResAttachment';
            resAttachEl.className = 'attachment-preview';
            resSection.appendChild(resAttachEl);
        }
        resAttachEl.innerHTML = '';
        if (complaint.resolutionAttachment) {
            const isVideo = complaint.resolutionAttachment.match(/\.(mp4|webm|ogg|mov|avi|mkv)$/i);
            if (isVideo) {
                const vid = document.createElement('video');
                vid.src = complaint.resolutionAttachment;
                vid.controls = true;
                resAttachEl.appendChild(vid);
            } else {
                const img = document.createElement('img');
                img.src = complaint.resolutionAttachment;
                resAttachEl.appendChild(img);
            }
        }
    } else {
        resSection.style.display = 'none';
    }

    const feedSection = document.getElementById('viewFeedbackSection');
    if (feedSection) {
        if (complaint.Feedback) {
            feedSection.style.display = 'block';
            document.getElementById('viewCompFeedbackMsg').textContent = complaint.Feedback.message;
            const starsEl = document.getElementById('viewCompRating');
            if (starsEl) {
                starsEl.innerHTML = '★'.repeat(complaint.Feedback.rating) + '☆'.repeat(5 - complaint.Feedback.rating);
            }
        } else {
            feedSection.style.display = 'none';
        }
    }

    // Deadline and Assignment display
    const deadlineEl = document.getElementById('viewCompDeadline');
    if (deadlineEl) {
        deadlineEl.textContent = complaint.deadline ? new Date(complaint.deadline).toLocaleString() : 'N/A';
        if (new Date(complaint.deadline) < new Date() && complaint.status !== 'Resolved') {
            deadlineEl.style.color = 'var(--danger)';
            deadlineEl.innerHTML += ' <span class="badge badge-high" style="font-size: 0.6rem;">OVERDUE</span>';
        } else {
            deadlineEl.style.color = 'var(--text)';
        }
    }


    // Add Reopen button for users
    const modalFooter = modal.querySelector('.modal-body');
    const existingReopen = document.getElementById('reopenBtn');
    if (existingReopen) existingReopen.remove();

    if (currentUser.role !== 'admin' && complaint.status === 'Resolved') {
        const reopenBtn = document.createElement('button');
        reopenBtn.id = 'reopenBtn';
        reopenBtn.className = 'btn btn-outline btn-sm';
        reopenBtn.style.marginTop = '1rem';
        reopenBtn.innerHTML = '<i class="fa-solid fa-rotate-left"></i> Not satisfied? Reopen Complaint';
        reopenBtn.onclick = () => reopenComplaint(complaint.id);
        modalFooter.appendChild(reopenBtn);
    }

    modal.classList.add('active');

    // Load AI features: Timeline, Similar, Summary
    loadTimeline(complaint.id);
    loadSimilarComplaints(complaint.id);
    summarizeComplaint(complaint.id);

    // Load Chat and Map
    loadMessages(complaint.id);
    setTimeout(() => initComplaintMap(complaint.location), 300); // Small delay for modal animation
}

// Add a hidden input to view modal to store current ID
if (!document.getElementById('viewCompId')) {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.id = 'viewCompId';
    document.body.appendChild(input);
}


async function submitFeedback(e) {
    e.preventDefault();
    const id = document.getElementById('feedbackComplaintId').value;
    const ratingEl = document.querySelector('input[name="feedRating"]:checked');
    const rating = ratingEl ? parseInt(ratingEl.value, 10) : 0;
    const message = document.getElementById('feedMessage').value;

    if (!rating) {
        alert('Please select a star rating.');
        return;
    }
    const submitBtn = feedbackForm.querySelector('button');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting...';

    try {
        const response = await fetch(`${API_BASE}/feedback/submit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ complaintId: id, rating, message })
        });
        
        if (response.ok) {
            showToast('Feedback submitted successfully!');
            feedbackModal.classList.remove('active');
            feedbackForm.reset();
        } else {
            alert('Failed to submit feedback.');
        }
    } catch (error) {
        alert('Error connecting to server.');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Submit Feedback';
    }
}

function applyFilters() {
    currentPage = 1;
    if (user.role !== 'Admin') {
        loadUserComplaints();
        if (user.role === 'Staff' || user.role === 'Teacher') {
            loadAssignedTasks();
        }
    } else {
        loadAdminComplaints();
    }
}



function toggleBulkBtn() {
    const checked = document.querySelectorAll('.complaint-checkbox:checked');
    const btn = document.getElementById('bulkResolveBtn');
    if (btn) btn.style.display = checked.length > 0 ? 'block' : 'none';
}

async function openBulkResolveModal() {
    const checked = document.querySelectorAll('.complaint-checkbox:checked');
    const ids = Array.from(checked).map(cb => cb.value);
    
    if (confirm(`Are you sure you want to resolve ${ids.length} complaints at once?`)) {
        try {
            const response = await fetch(`${API_BASE}/complaints/bulk-resolve`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ ids, resolutionSummary: 'Bulk resolved by admin' })
            });
            if (response.ok) {
                showToast(`Successfully resolved ${ids.length} complaints`, 'success');
                loadAdminComplaints();
            }
        } catch (error) {
            showToast('Bulk resolution failed', 'danger');
        }
    }
}



async function reopenComplaint(id) {
    if (confirm('Are you sure you want to reopen this complaint?')) {
        try {
            const response = await fetch(`${API_BASE}/complaints/${id}/reopen`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                showToast('Complaint reopened', 'info');
                loadUserComplaints();
                const viewModal = document.getElementById('viewComplaintModal');
                if (viewModal) viewModal.classList.remove('active');
            }
        } catch (error) {
            showToast('Reopen failed', 'danger');
        }
    }
}

function showToast(message) {
    if (!toast) return;
    document.getElementById('toastMsg').textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function populateProfileCard(user) {
    const profileCard = document.getElementById('profileCard');
    if (!profileCard) return;

    document.getElementById('profileName').textContent = user.name || 'User';
    document.getElementById('profileEmail').innerHTML = `<i class="fa-solid fa-envelope"></i> ${user.email || ''}`;
    
    // Set Image
    const img = document.getElementById('profileImg');
    if (user.profilePhoto) {
        img.src = user.profilePhoto;
    } else {
        img.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=2563EB&color=fff`;
    }

    // Set Badges
    const roleEl = document.getElementById('profileRole');
    const deptEl = document.getElementById('profileDept');
    const yearEl = document.getElementById('profileYear');

    if (roleEl) roleEl.innerHTML = `<i class="fa-solid fa-user-tag"></i> ${user.role.charAt(0).toUpperCase() + user.role.slice(1)}`;
    if (deptEl) deptEl.innerHTML = `<i class="fa-solid fa-book"></i> ${user.department || 'N/A'}`;
    if (yearEl) yearEl.innerHTML = `<i class="fa-solid fa-graduation-cap"></i> ${user.academicYear || 'N/A'}`;

}

// =======================
// Main Camera Logic
// =======================
async function startCamera() {
    const cameraStream = document.getElementById('cameraStream');
    const startCameraBtn = document.getElementById('startCamera');
    const capturePhotoBtn = document.getElementById('capturePhoto');
    const switchCameraBtn = document.getElementById('switchCamera');
    const startVideoBtn = document.getElementById('startVideoBtn');
    const stopVideoBtn = document.getElementById('stopVideoBtn');
    const photoCanvas = document.getElementById('photoCanvas');
    const preview = document.getElementById('filePreview');

    try {
        if (mediaStream) {
            mediaStream.getTracks().forEach(track => track.stop());
        }
        mediaStream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: currentFacingMode },
            audio: true
        });
        if(cameraStream) {
            cameraStream.srcObject = mediaStream;
            cameraStream.style.display = 'block';
        }
        if(photoCanvas) photoCanvas.style.display = 'none';
        if(preview) preview.innerHTML = '';
        capturedBlob = null;
        if(startCameraBtn) startCameraBtn.style.display = 'none';
        if(capturePhotoBtn) capturePhotoBtn.style.display = 'inline-block';
        if(switchCameraBtn) switchCameraBtn.style.display = 'inline-block';
        if(startVideoBtn) startVideoBtn.style.display = 'inline-block';
        if(stopVideoBtn) stopVideoBtn.style.display = 'none';
    } catch (err) {
        alert('Could not access camera: ' + err.message);
    }
}

function capturePhoto() {
    const cameraStream = document.getElementById('cameraStream');
    const photoCanvas = document.getElementById('photoCanvas');
    const capturePhotoBtn = document.getElementById('capturePhoto');
    const switchCameraBtn = document.getElementById('switchCamera');

    if(!photoCanvas || !cameraStream) return;
    const context = photoCanvas.getContext('2d');
    photoCanvas.width = cameraStream.videoWidth || 640;
    photoCanvas.height = cameraStream.videoHeight || 480;
    context.drawImage(cameraStream, 0, 0, photoCanvas.width, photoCanvas.height);
    
    photoCanvas.toBlob((blob) => {
        capturedBlob = blob;
        showCapturedPreview(URL.createObjectURL(blob));
    }, 'image/jpeg');

    cameraStream.style.display = 'none';
    photoCanvas.style.display = 'block';
    if(capturePhotoBtn) capturePhotoBtn.style.display = 'none';
    if(switchCameraBtn) switchCameraBtn.style.display = 'none';
    
    if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
        mediaStream = null;
    }
}

function toggleCamera() {
    currentFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
    startCamera();
}

function stopCamera() {
    if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
        mediaStream = null;
    }
    const cameraStream = document.getElementById('cameraStream');
    const photoCanvas = document.getElementById('photoCanvas');
    const preview = document.getElementById('filePreview');
    const startCameraBtn = document.getElementById('startCamera');
    const capturePhotoBtn = document.getElementById('capturePhoto');
    const switchCameraBtn = document.getElementById('switchCamera');
    const startVideoBtn = document.getElementById('startVideoBtn');
    const stopVideoBtn = document.getElementById('stopVideoBtn');
    
    if (cameraStream) cameraStream.style.display = 'block';
    if (photoCanvas) photoCanvas.style.display = 'none';
    if (preview) preview.innerHTML = '';
    if (startCameraBtn) startCameraBtn.style.display = 'inline-flex';
    if (capturePhotoBtn) capturePhotoBtn.style.display = 'none';
    if (switchCameraBtn) switchCameraBtn.style.display = 'none';
    if (startVideoBtn) startVideoBtn.style.display = 'none';
    if (stopVideoBtn) stopVideoBtn.style.display = 'none';
    if (cameraStream) cameraStream.srcObject = null;
}

function startComplaintVideoRecording() {
    if (!mediaStream) return;
    
    complaintRecordedChunks = [];
    complaintMediaRecorder = new MediaRecorder(mediaStream, { mimeType: 'video/webm' });

    complaintMediaRecorder.ondataavailable = function(event) {
        if (event.data.size > 0) {
            complaintRecordedChunks.push(event.data);
        }
    };

    complaintMediaRecorder.onstop = function() {
        capturedBlob = new Blob(complaintRecordedChunks, { type: 'video/webm' });
        // Stop the camera stream without clearing the preview
        if (mediaStream) {
            mediaStream.getTracks().forEach(track => track.stop());
            mediaStream = null;
        }
        const cameraStreamEl = document.getElementById('cameraStream');
        const startCameraBtn = document.getElementById('startCamera');
        const startVideoBtn = document.getElementById('startVideoBtn');
        const stopVideoBtn = document.getElementById('stopVideoBtn');
        if (cameraStreamEl) { cameraStreamEl.style.display = 'none'; cameraStreamEl.srcObject = null; }
        if (startCameraBtn) startCameraBtn.style.display = 'inline-flex';
        if (startVideoBtn) startVideoBtn.style.display = 'none';
        if (stopVideoBtn) stopVideoBtn.style.display = 'none';
        
        const preview = document.getElementById('filePreview');
        if (preview) {
            preview.innerHTML = `<video src="${URL.createObjectURL(capturedBlob)}" controls style="max-width:100%; max-height:150px; border-radius:8px;"></video>
            <p style="font-size:0.8rem; color:#64748b; margin-top:0.3rem;">Recorded Video</p>`;
        }
    };

    complaintMediaRecorder.start();
    
    const capturePhotoBtn = document.getElementById('capturePhoto');
    const startVideoBtn = document.getElementById('startVideoBtn');
    const stopVideoBtn = document.getElementById('stopVideoBtn');
    const switchCameraBtn = document.getElementById('switchCamera');
    
    if (capturePhotoBtn) capturePhotoBtn.style.display = 'none';
    if (startVideoBtn) startVideoBtn.style.display = 'none';
    if (switchCameraBtn) switchCameraBtn.style.display = 'none';
    if (stopVideoBtn) stopVideoBtn.style.display = 'inline-block';
    showToast('Recording started...', 'info');
}

function stopComplaintVideoRecording() {
    if (complaintMediaRecorder && complaintMediaRecorder.state !== 'inactive') {
        complaintMediaRecorder.stop();
        showToast('Recording stopped', 'success');
    }
}

function showCapturedPreview(src) {
    const preview = document.getElementById('filePreview');
    if (!preview) return;
    preview.innerHTML = '';
    const img = document.createElement('img');
    img.src = src;
    img.style.maxWidth = '100%';
    img.style.maxHeight = '150px';
    img.style.borderRadius = '8px';
    preview.appendChild(img);
    const name = document.createElement('p');
    name.textContent = 'Captured Photo (Real-time)';
    name.style.fontSize = '0.8rem';
    name.style.color = '#64748b';
    name.style.marginTop = '0.3rem';
    preview.appendChild(name);
}



// 1. Dark/Light Mode
const themeToggle = document.getElementById('themeToggle');
if (themeToggle) {
    // Check saved theme
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-theme');
        themeToggle.innerHTML = '<i class="fa-solid fa-sun"></i>';
    }

    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-theme');
        const isDark = document.body.classList.contains('dark-theme');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        themeToggle.innerHTML = isDark ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
    });
}

// 2. Profile Photo Upload

function openProfilePhotoModal() {
    const modal = document.getElementById('profilePhotoModal');
    if (modal) {
        modal.classList.add('active');
        switchProfileMediaSource('upload');
    }
}

function closeProfilePhotoModal() {
    const modal = document.getElementById('profilePhotoModal');
    if (modal) {
        modal.classList.remove('active');
        stopProfileCamera();
    }
}

function switchProfileMediaSource(type) {
    const sourceUpload = document.getElementById('profSourceUpload');
    const sourceCapture = document.getElementById('profSourceCapture');
    const uploadSection = document.getElementById('profUploadSection');
    const cameraSection = document.getElementById('profCameraSection');

    if (!sourceUpload) return; // Might not exist on admin.html

    if (type === 'upload') {
        sourceUpload.classList.add('active');
        sourceCapture.classList.remove('active');
        uploadSection.style.display = 'block';
        cameraSection.style.display = 'none';
        stopProfileCamera();
    } else {
        sourceCapture.classList.add('active');
        sourceUpload.classList.remove('active');
        uploadSection.style.display = 'none';
        cameraSection.style.display = 'block';
        startProfileCamera();
    }
}

async function startProfileCamera() {
    const video = document.getElementById('profCameraStream');
    const captureBtn = document.getElementById('profCapturePhoto');
    const startBtn = document.getElementById('profStartCamera');
    const canvas = document.getElementById('profPhotoCanvas');

    try {
        profileStream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: profFacingMode } 
        });
        video.srcObject = profileStream;
        video.style.display = 'block';
        canvas.style.display = 'none';
        
        const switchBtn = document.getElementById('profSwitchCamera');
        startBtn.style.display = 'none';
        captureBtn.style.display = 'inline-block';
        if (switchBtn) switchBtn.style.display = 'inline-block';
    } catch (err) {
        console.error("Profile camera access denied:", err);
        showToast("Camera access denied or unavailable", "danger");
    }
}

function stopProfileCamera() {
    if (profileStream) {
        profileStream.getTracks().forEach(track => track.stop());
        profileStream = null;
    }
    const video = document.getElementById('profCameraStream');
    const captureBtn = document.getElementById('profCapturePhoto');
    const startBtn = document.getElementById('profStartCamera');
    const switchBtn = document.getElementById('profSwitchCamera');
    if (video) video.style.display = 'none';
    if (captureBtn) captureBtn.style.display = 'none';
    if (switchBtn) switchBtn.style.display = 'none';
    if (startBtn) startBtn.style.display = 'inline-block';
}

function captureProfilePhoto() {
    const video = document.getElementById('profCameraStream');
    const canvas = document.getElementById('profPhotoCanvas');
    const captureBtn = document.getElementById('profCapturePhoto');

    const switchBtn = document.getElementById('profSwitchCamera');

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    canvas.getContext('2d').drawImage(video, 0, 0);

    video.style.display = 'none';
    canvas.style.display = 'block';
    captureBtn.style.display = 'none';
    if (switchBtn) switchBtn.style.display = 'none';
    stopProfileCamera();

    canvas.toBlob(blob => {
        uploadProfilePhotoData(blob, `profile_capture_${Date.now()}.jpg`);
    }, 'image/jpeg');
}

function toggleProfileCamera() {
    profFacingMode = profFacingMode === 'user' ? 'environment' : 'user';
    startProfileCamera();
}

// =======================
// Resolution Camera & Video Logic
// =======================

function switchResolveMediaSource(type) {
    const sourceUpload = document.getElementById('resSourceUpload');
    const sourceCapture = document.getElementById('resSourceCapture');
    const uploadSection = document.getElementById('resUploadSection');
    const cameraSection = document.getElementById('resCameraSection');

    if (!sourceUpload) return;

    if (type === 'upload') {
        sourceUpload.classList.add('active');
        sourceCapture.classList.remove('active');
        uploadSection.style.display = 'block';
        cameraSection.style.display = 'none';
        stopResolveCamera();
    } else {
        sourceCapture.classList.add('active');
        sourceUpload.classList.remove('active');
        uploadSection.style.display = 'none';
        cameraSection.style.display = 'block';
        startResolveCamera();
    }
}

async function startResolveCamera() {
    const video = document.getElementById('resCameraStream');
    const captureBtn = document.getElementById('resCapturePhoto');
    const startVideoBtn = document.getElementById('resStartVideo');
    const stopVideoBtn = document.getElementById('resStopVideo');
    const startBtn = document.getElementById('resStartCamera');
    const switchBtn = document.getElementById('resSwitchCamera');
    const canvas = document.getElementById('resPhotoCanvas');
    const preview = document.getElementById('resFilePreview');

    try {
        if (resolveMediaStream) resolveMediaStream.getTracks().forEach(t => t.stop());
        
        resolveMediaStream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: resolveFacingMode },
            audio: true // Audio needed for video recording
        });
        
        video.srcObject = resolveMediaStream;
        video.style.display = 'block';
        if(canvas) canvas.style.display = 'none';
        if(preview) preview.innerHTML = '';
        resolveCapturedBlob = null;
        
        startBtn.style.display = 'none';
        captureBtn.style.display = 'inline-block';
        startVideoBtn.style.display = 'inline-block';
        stopVideoBtn.style.display = 'none';
        if (switchBtn) switchBtn.style.display = 'inline-block';
    } catch (err) {
        console.error("Resolution camera access denied:", err);
        showToast("Camera access denied or unavailable", "danger");
    }
}

function stopResolveCamera() {
    if (resolveMediaStream) {
        resolveMediaStream.getTracks().forEach(track => track.stop());
        resolveMediaStream = null;
    }
    const video = document.getElementById('resCameraStream');
    const captureBtn = document.getElementById('resCapturePhoto');
    const startVideoBtn = document.getElementById('resStartVideo');
    const stopVideoBtn = document.getElementById('resStopVideo');
    const startBtn = document.getElementById('resStartCamera');
    const switchBtn = document.getElementById('resSwitchCamera');
    
    if (video) video.style.display = 'none';
    if (captureBtn) captureBtn.style.display = 'none';
    if (startVideoBtn) startVideoBtn.style.display = 'none';
    if (stopVideoBtn) stopVideoBtn.style.display = 'none';
    if (switchBtn) switchBtn.style.display = 'none';
    if (startBtn) startBtn.style.display = 'inline-block';
}

function captureResolvePhoto() {
    const video = document.getElementById('resCameraStream');
    const canvas = document.getElementById('resPhotoCanvas');
    const preview = document.getElementById('resFilePreview');
    if (!video || !canvas) return;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    canvas.getContext('2d').drawImage(video, 0, 0);

    canvas.toBlob(blob => {
        resolveCapturedBlob = blob;
        preview.innerHTML = `<img src="${URL.createObjectURL(blob)}" style="max-width:100%; max-height:150px; border-radius:8px;"> <p style="font-size:0.8rem; color:#64748b; margin-top:0.3rem;">Captured Photo</p>`;
    }, 'image/jpeg');

    stopResolveCamera();
}

function startResolveVideoRecording() {
    if (!resolveMediaStream) return;
    
    resolveRecordedChunks = [];
    resolveMediaRecorder = new MediaRecorder(resolveMediaStream, { mimeType: 'video/webm' });

    resolveMediaRecorder.ondataavailable = function(event) {
        if (event.data.size > 0) {
            resolveRecordedChunks.push(event.data);
        }
    };

    resolveMediaRecorder.onstop = function() {
        resolveCapturedBlob = new Blob(resolveRecordedChunks, { type: 'video/webm' });
        const preview = document.getElementById('resFilePreview');
        preview.innerHTML = `<video src="${URL.createObjectURL(resolveCapturedBlob)}" controls style="max-width:100%; max-height:150px; border-radius:8px;"></video> <p style="font-size:0.8rem; color:#64748b; margin-top:0.3rem;">Captured Video</p>`;
        stopResolveCamera();
    };

    resolveMediaRecorder.start();
    
    document.getElementById('resStartVideo').style.display = 'none';
    document.getElementById('resCapturePhoto').style.display = 'none';
    document.getElementById('resStopVideo').style.display = 'inline-block';
    showToast('Recording started...', 'info');
}

function stopResolveVideoRecording() {
    if (resolveMediaRecorder && resolveMediaRecorder.state !== 'inactive') {
        resolveMediaRecorder.stop();
        showToast('Recording stopped', 'success');
    }
}

function toggleResolveCamera() {
    resolveFacingMode = resolveFacingMode === 'user' ? 'environment' : 'user';
    startResolveCamera();
}

function handleProfileFileUpload(input) {
    if (input.files && input.files[0]) {
        uploadProfilePhotoData(input.files[0], input.files[0].name);
    }
}

async function uploadProfilePhotoData(fileOrBlob, filename) {
    const formData = new FormData();
    // Reconstruct as a File object if it's a blob so it gets uploaded properly
    formData.append('profilePhoto', new File([fileOrBlob], filename, { type: fileOrBlob.type || 'image/jpeg' }));

    try {
        showToast('Uploading photo...', 'info');
        const response = await fetch(`${API_BASE}/auth/update-profile-photo`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        const data = await response.json();
        if (data.success) {
            const profileImg = document.getElementById('profileImg');
            if(profileImg) profileImg.src = data.profilePhoto;
            currentUser.profilePhoto = data.profilePhoto;
            localStorage.setItem('user', JSON.stringify(currentUser));
            showToast('Profile photo updated!', 'success');
            setTimeout(() => closeProfilePhotoModal(), 1000);
        } else {
            showToast(data.message || 'Photo upload failed', 'danger');
        }
    } catch (error) {
        showToast('Photo upload failed', 'danger');
    }
}

// 3. Export Data to CSV
function exportToCSV() {
    if (!currentComplaints || currentComplaints.length === 0) {
        return showToast('No data to export', 'info');
    }

    const headers = ['ID', 'Title', 'Category', 'Priority', 'Status', 'CreatedAt'];
    const rows = currentComplaints.map(c => [
        c.id,
        `"${c.title.replace(/"/g, '""')}"`,
        c.category,
        c.priority,
        c.status,
        new Date(c.createdAt).toLocaleDateString()
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `complaints_export_${new Date().toISOString().slice(0,10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// 4. Pagination Logic
function changePage(delta) {
    const newPage = currentPage + delta;
    if (newPage >= 1 && newPage <= totalPages) {
        currentPage = newPage;
        loadAdminComplaints();
    }
}

function updatePaginationUI() {
    const pageInfo = document.getElementById('pageInfo');
    const prevBtn = document.getElementById('prevPage');
    const nextBtn = document.getElementById('nextPage');
    
    if (pageInfo) pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    if (prevBtn) prevBtn.disabled = currentPage === 1;
    if (nextBtn) nextBtn.disabled = currentPage === totalPages;
}


// 5. AI-Powered Tagging
async function suggestAITag() {
    const title = document.getElementById('compTitle').value;
    const desc = document.getElementById('compDesc').value;
    const text = `${title} ${desc}`.trim();

    if (!text) return showToast('Enter a title or description first!', 'info');

    try {
        const response = await fetch(`${API_BASE}/complaints/suggest-category`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ text })
        });
        const data = await response.json();
        if (data.suggestion) {
            document.getElementById('compCategory').value = data.suggestion;
            showToast(`AI Suggested: ${data.suggestion}`, 'success');
        } else {
            alert('AI could not suggest a category for this text.');
        }
    } catch (e) {
        console.error('AI Error:', e);
        alert('AI Error: ' + e.message);
    }
}

async function enhanceDescriptionWithAI() {
    const descInput = document.getElementById('compDesc');
    const text = descInput.value.trim();

    if (!text) return showToast('Please type a short description first (e.g. "fan broken")', 'info');

    const btn = document.getElementById('enhanceAIBtn');
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Enhancing...';
    btn.disabled = true;

    try {
        const response = await fetch(`${API_BASE}/complaints/enhance`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ text })
        });
        const data = await response.json();
        
        if (data.enhanced) {
            descInput.value = data.enhanced;
            showToast('Description enhanced by AI!', 'success');
        } else {
            showToast('AI could not enhance this text.', 'warning');
        }
    } catch (e) {
        console.error('AI Error:', e);
        showToast('AI Enhancement failed.', 'danger');
    } finally {
        btn.innerHTML = originalHTML;
        btn.disabled = false;
    }
}

// 6. Internal Messaging
let currentChatComplaintId = null;

async function loadMessages(complaintId) {
    currentChatComplaintId = complaintId;
    const list = document.getElementById('messageList');
    if (!list) return;

    try {
        const response = await fetch(`${API_BASE}/messages/${complaintId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const messages = await response.json();
        list.innerHTML = messages.map(m => `
            <div style="margin-bottom: 0.8rem; text-align: ${m.senderId === currentUser.id ? 'right' : 'left'}">
                <small style="font-weight: 700; color: var(--primary)">${m.User?.name} (${m.User?.role})</small>
                <div style="background: ${m.senderId === currentUser.id ? 'var(--primary)' : 'rgba(0,0,0,0.1)'}; color: ${m.senderId === currentUser.id ? 'white' : 'inherit'}; padding: 0.5rem 0.8rem; border-radius: 8px; display: inline-block; margin-top: 0.2rem;">
                    ${m.content}
                </div>
            </div>
        `).join('');
        list.scrollTop = list.scrollHeight;
        
        // Join socket room
        if (socket) socket.emit('join_complaint', complaintId);
    } catch (e) {}
}

async function sendChatMessage() {
    const input = document.getElementById('chatInput');
    const content = input.value;
    if (!content || !currentChatComplaintId) return;

    try {
        const response = await fetch(`${API_BASE}/messages/${currentChatComplaintId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ content })
        });
        if (response.ok) {
            input.value = '';
        }
    } catch (e) {}
}

// Socket listener for new messages
if (socket) {
    socket.on('new_message', (msg) => {
        if (msg.complaintId === currentChatComplaintId) {
            const list = document.getElementById('messageList');
            if (list) {
                const div = document.createElement('div');
                div.style.marginBottom = '0.8rem';
                div.style.textAlign = msg.senderId === currentUser.id ? 'right' : 'left';
                div.innerHTML = `
                    <small style="font-weight: 700; color: var(--primary)">${msg.User?.name} (${msg.User?.role})</small>
                    <div style="background: ${msg.senderId === currentUser.id ? 'var(--primary)' : 'rgba(0,0,0,0.1)'}; color: ${msg.senderId === currentUser.id ? 'white' : 'inherit'}; padding: 0.5rem 0.8rem; border-radius: 8px; display: inline-block; margin-top: 0.2rem;">
                        ${msg.content}
                    </div>
                `;
                list.appendChild(div);
                list.scrollTop = list.scrollHeight;
            }
        }
    });
}

// 7. Campus Map Integration
let complaintMapObj = null;

function initComplaintMap(locationName) {
    const mapContainer = document.getElementById('complaintMap');
    if (!mapContainer) return;

    // Destroy existing map if any
    if (complaintMapObj) {
        complaintMapObj.remove();
    }

    // Mock coordinates for campus locations
    const campusCoords = {
        'Hostel A': [28.6139, 77.2090],
        'Hostel B': [28.6145, 77.2100],
        'Academic Block': [28.6150, 77.2085],
        'Library': [28.6142, 77.2095],
        'Canteen': [28.6135, 77.2105]
    };

    const coords = campusCoords[locationName] || [28.6139, 77.2090]; // Default to center

    complaintMapObj = L.map('complaintMap').setView(coords, 17);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(complaintMapObj);
    L.marker(coords).addTo(complaintMapObj).bindPopup(`<b>Location:</b> ${locationName}`).openPopup();
}

// 8. Delete Account
async function deleteAccount() {
    if (confirm('⚠️ WARNING: This will permanently delete your account and all associated data (complaints, feedback, messages). This action CANNOT be undone. Are you sure?')) {
        try {
            const response = await fetch(`${API_BASE}/auth/delete-account`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.ok) {
                alert('Account deleted successfully.');
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = 'login.html';
            } else {
                const data = await response.json();
                alert(data.message || 'Failed to delete account');
            }
        } catch (error) {
            alert('Server error while deleting account');
        }
    }
}

// ========================================
// 9. NOTIFICATION CENTER
// ========================================
async function loadNotifications() {
    try {
        const res = await fetch(`${API_BASE}/notifications`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        const badge = document.getElementById('notifBadge');
        const list = document.getElementById('notifList');
        if (badge) {
            badge.textContent = data.unreadCount || '';
            badge.style.display = data.unreadCount > 0 ? 'flex' : 'none';
        }
        if (list) {
            list.innerHTML = data.notifications.length === 0 
                ? '<p style="padding:1rem;color:#94a3b8;text-align:center;">No notifications</p>'
                : data.notifications.map(n => `
                    <div class="notif-item ${n.isRead ? 'read' : 'unread'}" onclick="markNotifRead('${n.id}')">
                        <div class="notif-icon"><i class="fa-solid ${n.type === 'resolution' ? 'fa-check-circle' : n.type === 'escalation' ? 'fa-triangle-exclamation' : 'fa-bell'}"></i></div>
                        <div class="notif-body">
                            <strong>${n.title}</strong>
                            <p>${n.message}</p>
                            <small>${new Date(n.createdAt).toLocaleString()}</small>
                        </div>
                    </div>
                `).join('');
        }
    } catch (e) { console.log('Notification load error:', e); }
}

function toggleNotifPanel() {
    const panel = document.getElementById('notifPanel');
    if (panel) panel.classList.toggle('active');
}

async function markNotifRead(id) {
    try {
        await fetch(`${API_BASE}/notifications/${id}/read`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        loadNotifications();
    } catch (e) {}
}

async function markAllNotifRead() {
    try {
        await fetch(`${API_BASE}/notifications/read-all`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        loadNotifications();
    } catch (e) {}
}

// ========================================
// 10. COMPLAINT TIMELINE
// ========================================
async function loadTimeline(complaintId) {
    const container = document.getElementById('timelineContainer');
    if (!container) return;
    try {
        const res = await fetch(`${API_BASE}/complaints/${complaintId}/timeline`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const timeline = await res.json();
        container.innerHTML = timeline.length === 0 
            ? '<p style="color:#94a3b8;">No timeline data yet.</p>'
            : timeline.map(t => `
                <div class="timeline-item">
                    <div class="timeline-dot ${t.action === 'CREATED' ? 'dot-blue' : t.action === 'RESOLVED' ? 'dot-green' : 'dot-orange'}"></div>
                    <div class="timeline-content">
                        <strong>${t.action}</strong>
                        <p>${t.description || ''}</p>
                        <small>${new Date(t.createdAt).toLocaleString()}${t.User ? ' by ' + t.User.name : ''}</small>
                    </div>
                </div>
            `).join('');
    } catch (e) { container.innerHTML = '<p style="color:#ef4444;">Failed to load timeline</p>'; }
}

// ========================================
// 11. AI DUPLICATE CHECK
// ========================================
async function checkForDuplicates() {
    const title = document.getElementById('compTitle')?.value;
    const desc = document.getElementById('compDesc')?.value;
    if (!title || title.length < 5) return;
    
    try {
        const res = await fetch(`${API_BASE}/complaints/check-duplicate`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, description: desc || '' })
        });
        const data = await res.json();
        const warn = document.getElementById('duplicateWarning');
        if (warn && data.isDuplicate) {
            warn.style.display = 'block';
            warn.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Similar complaint found: <strong>"${data.matches[0].title}"</strong> (${data.matches[0].similarity}% match). You may still submit.`;
        } else if (warn) {
            warn.style.display = 'none';
        }
    } catch (e) {}
}

// ========================================
// 12. AI SUMMARIZE
// ========================================
async function summarizeComplaint(id) {
    try {
        const res = await fetch(`${API_BASE}/complaints/${id}/summarize`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        const el = document.getElementById('aiSummary');
        if (el) {
            el.style.display = 'block';
            el.innerHTML = `<i class="fa-solid fa-robot"></i> <strong>AI Summary:</strong> ${data.summary}`;
        }
    } catch (e) { showToast('Summarization failed', 'danger'); }
}

// ========================================
// 13. SIMILAR COMPLAINTS
// ========================================
async function loadSimilarComplaints(id) {
    const container = document.getElementById('similarComplaints');
    if (!container) return;
    try {
        const res = await fetch(`${API_BASE}/complaints/${id}/similar`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const similar = await res.json();
        container.innerHTML = similar.length === 0 
            ? '<p style="color:#94a3b8;">No similar complaints found.</p>'
            : similar.map(s => `
                <div class="similar-item" style="padding:0.5rem;border-bottom:1px solid var(--border);cursor:pointer;">
                    <strong>${s.title}</strong> <span class="badge badge-low">${s.similarity}% match</span>
                    <p style="font-size:0.8rem;color:#64748b;">${s.category} · ${s.status}</p>
                </div>
            `).join('');
    } catch (e) { container.innerHTML = '<p style="color:#ef4444;">Failed to load</p>'; }
}

// ========================================
// 14. QR CODE GENERATOR (Admin)
// ========================================
async function generateQRCode() {
    const location = document.getElementById('qrLocation')?.value;
    const room = document.getElementById('qrRoom')?.value;
    if (!location) return showToast('Select a location', 'danger');
    
    try {
        const res = await fetch(`${API_BASE}/complaints/qr-generate?location=${encodeURIComponent(location)}&room=${encodeURIComponent(room || '')}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        const preview = document.getElementById('qrPreview');
        if (preview) {
            preview.innerHTML = `<img src="${data.qrCode}" alt="QR Code" style="max-width:250px;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.15);"/><p style="margin-top:0.5rem;font-size:0.8rem;color:#64748b;">Scan to raise complaint at ${location} ${room || ''}</p>
            <a href="${data.qrCode}" download="qr-${location}-${room || 'general'}.png" class="btn btn-outline btn-sm" style="margin-top:0.5rem;"><i class="fa-solid fa-download"></i> Download</a>`;
        }
    } catch (e) { showToast('QR generation failed', 'danger'); }
}

// ========================================
// 15. KNOWLEDGE BASE
// ========================================
async function searchKnowledgeBase() {
    const q = document.getElementById('kbSearch')?.value || '';
    const cat = document.getElementById('kbCategory')?.value || '';
    const list = document.getElementById('kbResults');
    if (!list) return;
    
    try {
        const res = await fetch(`${API_BASE}/complaints/knowledge-base?q=${encodeURIComponent(q)}&category=${encodeURIComponent(cat)}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const results = await res.json();
        list.innerHTML = results.length === 0 
            ? '<p style="text-align:center;color:#94a3b8;padding:2rem;">No results found</p>'
            : results.map(r => `
                <div class="kb-card glass-panel" style="padding:1rem;margin-bottom:0.75rem;">
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <strong>${r.title}</strong>
                        <span class="badge badge-low">${r.category}</span>
                    </div>
                    <p style="font-size:0.85rem;color:#64748b;margin:0.5rem 0;">${r.description?.substring(0, 120)}...</p>
                    <div style="background:var(--bg-secondary);padding:0.75rem;border-radius:8px;margin-top:0.5rem;">
                        <strong style="color:#059669;"><i class="fa-solid fa-check-circle"></i> Resolution:</strong>
                        <p style="margin:0.3rem 0 0;font-size:0.85rem;">${r.resolutionSummary || 'N/A'}</p>
                    </div>
                </div>
            `).join('');
    } catch (e) { list.innerHTML = '<p style="color:#ef4444;">Error loading knowledge base</p>'; }
}

async function loadFAQ() {
    const container = document.getElementById('faqContainer');
    if (!container) return;
    try {
        const res = await fetch(`${API_BASE}/complaints/knowledge-base/faq`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const faq = await res.json();
        container.innerHTML = faq.map(cat => `
            <div class="faq-category" style="margin-bottom:1rem;">
                <h4 style="color:var(--primary);margin-bottom:0.5rem;"><i class="fa-solid fa-tag"></i> ${cat.category}</h4>
                ${cat.items.map(item => `
                    <details class="faq-item glass-panel" style="padding:0.75rem;margin-bottom:0.5rem;border-radius:8px;">
                        <summary style="cursor:pointer;font-weight:600;">${item.question}</summary>
                        <p style="margin-top:0.5rem;color:#64748b;font-size:0.9rem;">${item.answer}</p>
                    </details>
                `).join('')}
            </div>
        `).join('');
    } catch (e) {}
}

// ========================================
// 16. ANALYTICS: DEPARTMENT PERFORMANCE
// ========================================
async function loadDeptPerformance() {
    const container = document.getElementById('deptPerformanceTable');
    if (!container) return;
    try {
        const res = await fetch(`${API_BASE}/complaints/analytics/department-performance`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        container.innerHTML = data.map((d, i) => `
            <tr>
                <td><strong>#${i + 1}</strong></td>
                <td>${d.department}</td>
                <td>${d.total}</td>
                <td>${d.resolved}</td>
                <td>${d.resolutionRate}%</td>
                <td>${d.avgResolutionHours}h</td>
                <td><div class="score-bar"><div class="score-fill" style="width:${d.performanceScore}%;background:${d.performanceScore > 70 ? '#059669' : d.performanceScore > 40 ? '#f59e0b' : '#ef4444'};"></div><span>${d.performanceScore}</span></div></td>
            </tr>
        `).join('');
    } catch (e) {}
}

// ========================================
// 17. ANALYTICS: HOSTEL TRACKING
// ========================================
async function loadHostelTracking() {
    const container = document.getElementById('hostelGrid');
    if (!container) return;
    try {
        const res = await fetch(`${API_BASE}/complaints/analytics/hostel-tracking`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const rooms = await res.json();
        container.innerHTML = rooms.map(r => {
            const severity = r.activeComplaints > 3 ? 'high' : r.activeComplaints > 1 ? 'med' : 'low';
            return `<div class="hostel-room-card severity-${severity}">
                <strong>${r.room}</strong>
                <p>${r.totalComplaints} total · <span style="color:${severity === 'high' ? '#ef4444' : '#f59e0b'};">${r.activeComplaints} active</span></p>
            </div>`;
        }).join('');
    } catch (e) {}
}

// ========================================
// 18. ANALYTICS: AI RECOMMENDATIONS
// ========================================
async function loadRecommendations() {
    const container = document.getElementById('recommendationsList');
    if (!container) return;
    try {
        const res = await fetch(`${API_BASE}/complaints/analytics/recommendations`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const recs = await res.json();
        container.innerHTML = recs.length === 0 
            ? '<p style="color:#94a3b8;">No recommendations available yet.</p>'
            : recs.map(r => `
                <div class="recommendation-card glass-panel" style="padding:0.75rem;margin-bottom:0.5rem;border-left:3px solid var(--primary);">
                    <div style="display:flex;justify-content:space-between;">
                        <strong><i class="fa-solid fa-lightbulb" style="color:#f59e0b;"></i> ${r.category}</strong>
                        <span class="badge badge-low">${r.count} complaints</span>
                    </div>
                    <p style="font-size:0.85rem;color:#64748b;margin-top:0.3rem;">${r.recommendation}</p>
                </div>
            `).join('');
    } catch (e) {}
}

// ========================================
// 19. QR SCAN AUTO-FILL
// ========================================
function handleQRAutoFill() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('qr') === 'true') {
        const location = params.get('location');
        const room = params.get('room');
        setTimeout(() => {
            const locSelect = document.getElementById('compLocation');
            const roomInput = document.getElementById('compRoom');
            if (locSelect && location) locSelect.value = location;
            if (roomInput && room) roomInput.value = decodeURIComponent(room);
            const modal = document.getElementById('complaintModal');
            if (modal) modal.classList.add('active');
            showToast('QR scanned! Location auto-filled.', 'success');
        }, 500);
    }
}

// Auto-call on page load
if (window.location.pathname.includes('student.html')) {
    document.addEventListener('DOMContentLoaded', handleQRAutoFill);
}

// Load notifications periodically
setInterval(() => { if (token) loadNotifications(); }, 30000);
