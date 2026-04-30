const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
// Production Render backend URL
const PROD_BACKEND_URL = 'https://my-smart-college-complaint-management.onrender.com';
const API_BASE = isLocal ? 'http://localhost:5010/api' : `${PROD_BACKEND_URL}/api`;

let currentUser = null;
let token = null;
let capturedBlob = null;
let mediaStream = null;
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

document.addEventListener('DOMContentLoaded', () => {
    initDashboard();
    setupEventListeners();
    initSocket();
});

function switchTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));

    // Show selected tab
    const selectedTab = document.getElementById(`${tabName}Tab`);
    if (selectedTab) selectedTab.classList.add('active');
    
    // Update button state
    event.currentTarget.classList.add('active');

    if (tabName === 'logs') fetchLogs();
    if (tabName === 'analytics') updateAdminStats();
    if (tabName === 'users') fetchUsers();
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

    // Load appropriate data based on page
    if (window.location.pathname.includes('admin.html')) {
        loadAdminComplaints();
    } else {
        loadUserComplaints();
        if (currentUser.role === 'Staff' || currentUser.role === 'Teacher') {
            loadAssignedTasks();
        }
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

function setupEventListeners() {
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
            });
        }

        // Camera logic
        const startCameraBtn = document.getElementById('startCamera');
        const capturePhotoBtn = document.getElementById('capturePhoto');
        const cameraStream = document.getElementById('cameraStream');
        const photoCanvas = document.getElementById('photoCanvas');

        if (startCameraBtn) {
            startCameraBtn.addEventListener('click', async () => {
                try {
                    mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
                    cameraStream.srcObject = mediaStream;
                    startCameraBtn.style.display = 'none';
                    capturePhotoBtn.style.display = 'inline-flex';
                } catch (err) {
                    alert('Could not access camera: ' + err.message);
                }
            });
        }

        if (capturePhotoBtn) {
            capturePhotoBtn.addEventListener('click', () => {
                const context = photoCanvas.getContext('2d');
                photoCanvas.width = cameraStream.videoWidth;
                photoCanvas.height = cameraStream.videoHeight;
                context.drawImage(cameraStream, 0, 0, photoCanvas.width, photoCanvas.height);
                
                photoCanvas.toBlob((blob) => {
                    capturedBlob = blob;
                    showCapturedPreview(URL.createObjectURL(blob));
                }, 'image/jpeg');
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

    const changePasswordForm = document.getElementById('changePasswordForm');
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const currentPassword = document.getElementById('currentPassword').value;
            const newPassword = document.getElementById('newPassword').value;
            const btn = changePasswordForm.querySelector('button');
            btn.disabled = true;

            try {
                const response = await fetch(`${API_BASE}/auth/change-password`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ currentPassword, newPassword })
                });
                const data = await response.json();
                if (response.ok) {
                    showToast('Password updated!', 'success');
                    document.getElementById('settingsModal').classList.remove('active');
                    changePasswordForm.reset();
                } else {
                    alert(data.message);
                }
            } catch (e) {
                alert('Error updating password');
            } finally {
                btn.disabled = false;
            }
        });
    }
}

async function handleRaiseComplaint(e) {
    e.preventDefault();
    const submitBtn = complaintForm.querySelector('button');
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
    
    if (capturedBlob) {
        formData.append('attachment', capturedBlob, 'capture.jpg');
    } else {
        formData.append('attachment', file);
    }

    try {
        const response = await fetch(`${API_BASE}/complaints/raise`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        if (response.ok) {
            showToast('Complaint registered successfully!');
            complaintModal.classList.remove('active');
            complaintForm.reset();
            const preview = document.getElementById('filePreview');
            if (preview) preview.innerHTML = '';
            loadUserComplaints();
        } else {
            const data = await response.json();
            alert(data.message || 'Failed to submit complaint');
        }
    } catch (error) {
        alert('Server error while submitting complaint');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Submit Complaint';
    }
}

async function loadUserComplaints() {
    const list = document.getElementById('userComplaintsList');
    if (!list) return;

    try {
        const search = document.getElementById('searchInput')?.value || '';
        const status = document.getElementById('statusFilter')?.value || '';
        const category = document.getElementById('categoryFilter')?.value || '';
        
        const response = await fetch(`${API_BASE}/complaints/my-complaints?search=${search}&status=${status}&category=${category}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const complaints = await response.json();
        currentComplaints = complaints;

        if (complaints.length === 0) {
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
                    <button class="btn btn-outline btn-sm" onclick="openViewComplaintModal('${c.id}')">
                        <i class="fa-solid fa-eye"></i> View
                    </button>
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
                        <button class="btn btn-outline btn-sm" onclick="openViewComplaintModal('${c.id}')">
                            <i class="fa-solid fa-eye"></i> Details
                        </button>
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
    } catch (e) {}
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
    if (fileInput.files[0]) {
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
    const complaint = currentComplaints.find(c => c.id === id);
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

    const assignSection = document.getElementById('assignSection');
    if (assignSection) {
        assignSection.style.display = (currentUser.role === 'admin' && complaint.status !== 'Resolved') ? 'block' : 'none';
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
    const rating = parseInt(document.getElementById('feedRating').value, 10);
    const message = document.getElementById('feedMessage').value;
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

async function loadAssignedTasks() {
    const list = document.getElementById('assignedTasksList');
    if (!list) return;

    try {
        const response = await fetch(`${API_BASE}/complaints/assigned`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const complaints = await response.json();
        list.innerHTML = complaints.map(c => `
            <tr>
                <td>${c.user?.name || 'Unknown'}</td>
                <td>${c.title}</td>
                <td><span class="badge badge-low">${c.category}</span></td>
                <td><span class="badge badge-${c.status.replace(' ', '').toLowerCase()}">${c.status}</span></td>
                <td>${c.deadline ? new Date(c.deadline).toLocaleDateString() : 'N/A'}</td>
                <td>
                    <button class="btn btn-outline btn-sm" onclick="viewComplaint('${c.id}')"><i class="fa-solid fa-eye"></i></button>
                    ${c.status !== 'Resolved' ? `<button class="btn btn-success btn-sm" onclick="openResolveModal('${c.id}')"><i class="fa-solid fa-check"></i></button>` : ''}
                </td>
            </tr>
        `).join('');
        
        if (complaints.length > 0) {
            document.getElementById('assignedTasksSection').style.display = 'block';
        }
    } catch (e) {}
}

async function loadUserComplaints() {
    const checked = document.querySelectorAll('.complaint-checkbox:checked');
    const btn = document.getElementById('bulkResolveBtn');
    if (btn) btn.style.display = checked.length > 0 ? 'block' : 'none';
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

async function loadStaffList() {
    const select = document.getElementById('assignStaffSelect');
    if (!select || select.children.length > 1) return;

    try {
        const response = await fetch(`${API_BASE}/auth/staff`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const staff = await response.json();
        staff.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.id;
            opt.textContent = `${s.name} (${s.department || 'General'})`;
            select.appendChild(opt);
        });
    } catch (e) {}
}

async function submitAssignment() {
    const id = document.getElementById('viewCompId')?.value;
    const staffId = document.getElementById('assignStaffSelect').value;
    
    if (!staffId) return alert('Please select a staff member');

    try {
        const response = await fetch(`${API_BASE}/complaints/${id}/assign`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ assignedTo: staffId })
        });
        if (response.ok) {
            showToast('Complaint assigned successfully', 'success');
            loadAdminComplaints();
            const viewModal = document.getElementById('viewComplaintModal');
            if (viewModal) viewModal.classList.remove('active');
        }
    } catch (error) {
        showToast('Assignment failed', 'danger');
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

function stopCamera() {
    if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
        mediaStream = null;
    }
    const startCameraBtn = document.getElementById('startCamera');
    const capturePhotoBtn = document.getElementById('capturePhoto');
    const cameraStream = document.getElementById('cameraStream');
    if (startCameraBtn) startCameraBtn.style.display = 'inline-flex';
    if (capturePhotoBtn) capturePhotoBtn.style.display = 'none';
    if (cameraStream) cameraStream.srcObject = null;
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

// --- NEW FEATURES: Todo List Solutions ---

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
async function uploadProfilePhoto(input) {
    const file = input.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('profilePhoto', file);

    try {
        const response = await fetch(`${API_BASE}/auth/update-profile-photo`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        const data = await response.json();
        if (data.success) {
            document.getElementById('profileImg').src = data.profilePhoto;
            currentUser.profilePhoto = data.profilePhoto;
            localStorage.setItem('user', JSON.stringify(currentUser));
            showToast('Profile photo updated!', 'success');
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

// --- MEDIUM PRIORITY SOLUTIONS ---

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
