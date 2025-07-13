// Backend URL configuration - automatically detects environment
const BACKEND_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000'
    : 'https://learnify-y02m.onrender.com';

// Debug panel for development
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.addEventListener('DOMContentLoaded', () => {
        const debugDiv = document.createElement('div');
        debugDiv.style.position = 'fixed';
        debugDiv.style.bottom = '10px';
        debugDiv.style.right = '10px';
        debugDiv.style.background = '#222';
        debugDiv.style.color = '#fff';
        debugDiv.style.padding = '10px 18px';
        debugDiv.style.borderRadius = '8px';
        debugDiv.style.fontSize = '0.95rem';
        debugDiv.style.zIndex = '9999';
        debugDiv.style.boxShadow = '0 2px 8px #0005';
        debugDiv.innerHTML = `<b>DEBUG</b><br>BACKEND_URL: <span style='color:#4caf50'>${BACKEND_URL}</span><br><span id='api-status'>Checking API...</span>`;
        document.body.appendChild(debugDiv);
        fetch(`${BACKEND_URL}/health`).then(r => r.json()).then(data => {
            document.getElementById('api-status').innerHTML = `API: <span style='color:#4caf50'>${data.status} (${data.mongoStatus})</span>`;
        }).catch(() => {
            document.getElementById('api-status').innerHTML = `<span style='color:#f44336'>API: Unreachable</span>`;
        });
    });
}

// Global fetch wrapper for better error messages
async function safeFetch(url, options) {
    try {
        const res = await fetch(url, options);
        if (!res.ok) {
            let msg = `HTTP ${res.status}`;
            try { const data = await res.json(); msg += ': ' + (data.message || JSON.stringify(data)); } catch { }
            throw new Error(msg);
        }
        return await res.json();
    } catch (err) {
        throw new Error('Network/API error: ' + err.message);
    }
}

window.onload = function () {
    const splashScreenElem = document.getElementById("splash-screen");
    const mainContentElem = document.getElementById("main-content");
    setTimeout(() => {
        if (splashScreenElem) splashScreenElem.classList.add("splash-out");
        setTimeout(() => {
            if (splashScreenElem) splashScreenElem.style.display = "none";
            if (mainContentElem) mainContentElem.classList.add("visible");
        }, 700);
    }, 1800); // Show splash for ~1.8s

    // LOGIN FORM HANDLER
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function (e) {
            e.preventDefault(); // Prevent page refresh

            // Clear previous error
            let errorElement = document.getElementById('login-error');
            errorElement.textContent = '';

            // Get form data
            const formData = new FormData(loginForm);
            const username = formData.get('username');
            const password = formData.get('password');

            try {
                const res = await fetch(`${BACKEND_URL}/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({ username, password })
                });
                const data = await res.json();

                if (data.success && data.redirect && data.token) {
                    // Store the JWT token
                    localStorage.setItem('learnify_token', data.token);
                    window.location.href = data.redirect;
                } else {
                    errorElement.textContent = data.message || 'Invalid username or password.';
                }
            } catch (err) {
                errorElement.textContent = 'Could not connect to server.';
            }
        });
    }

    // REGISTER FORM HANDLER
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            let errorElement = document.getElementById('register-error');
            errorElement.textContent = '';
            const formData = new FormData(registerForm);
            const payload = {};
            for (let [key, value] of formData.entries()) {
                if (key === 'seatNumber') continue; // skip for now
                payload[key] = value;
            }
            // Only add seatNumber if role is student
            if (formData.get('role') === 'student') {
                payload.seatNumber = formData.get('seatNumber');
            }
            try {
                const res = await fetch(`${BACKEND_URL}/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                if (data.success && data.token) {
                    // Registration successful, store token and redirect immediately
                    localStorage.setItem('learnify_token', data.token);
                    errorElement.style.color = '#43a047';
                    errorElement.textContent = 'Registration successful! Redirecting...';
                    setTimeout(() => {
                        window.location.href = data.redirect;
                    }, 1000);
                } else {
                    errorElement.style.color = '#f44336';
                    errorElement.textContent = data.message || 'Registration failed.';
                }
            } catch (err) {
                errorElement.style.color = '#f44336';
                errorElement.textContent = 'Could not connect to server.';
            }
        });
    }

    // Ensure logout button clears token and redirects
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.onclick = function () {
            localStorage.removeItem('learnify_token');
            window.location.href = '/auth.html';
        };
    }
};

// Helper function to get auth headers for API requests
function getAuthHeaders() {
    const token = localStorage.getItem('learnify_token');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

// Helper function to check if user is authenticated
function isAuthenticated() {
    return localStorage.getItem('learnify_token') !== null;
}

// Helper function to logout
function logout() {
    localStorage.removeItem('learnify_token');
    window.location.href = '/index.html';
}

function showHome() {
    document.querySelector('.dashboard-main').innerHTML = `
        <div class="dashboard-header">
            <h2>My Created Classes</h2>
            <a href="create-class.html" class="join-class-btn"><i class="fa fa-plus"></i> Create Class</a>
        </div>
        <div class="class-list" id="class-list">
            <!-- Render class cards here via JS or server-side -->
        </div>
    `;
    // Call a function to render class cards and attach delete handlers
    renderClassCards();
}

function showCreated() {
    showHome();
}

function showToReview() {
    document.querySelector('.dashboard-main').innerHTML = `
        <div class="dashboard-header">
            <h2>To Review</h2>
        </div>
        <div class="to-review-section">
            <!-- Render assignments to review here via JS or server-side -->
        </div>
    `;
    // Call a function to render assignments to review
    renderToReview();
}

async function renderToReview() {
    const toReviewSection = document.querySelector('.to-review-section');
    toReviewSection.innerHTML = '<div class="loading">Loading submissions...</div>';

    try {
        const response = await fetch(`${BACKEND_URL}/api/assignments/to-review`, {
            headers: getAuthHeaders()
        });
        const data = await response.json();

        if (!data.success) {
            toReviewSection.innerHTML = `<div class="error">${data.message || 'Failed to load submissions'}</div>`;
            return;
        }

        if (!data.submissions || data.submissions.length === 0) {
            toReviewSection.innerHTML = '<div class="no-submissions">No submissions to review</div>';
            return;
        }

        // Group submissions by assignment
        const submissionsByAssignment = {};
        data.submissions.forEach(submission => {
            if (!submissionsByAssignment[submission.assignmentId]) {
                submissionsByAssignment[submission.assignmentId] = {
                    assignment: submission.assignment,
                    submissions: []
                };
            }
            submissionsByAssignment[submission.assignmentId].submissions.push(submission);
        });

        let html = '';
        for (const assignmentId in submissionsByAssignment) {
            const { assignment, submissions } = submissionsByAssignment[assignmentId];
            html += `
                <div class="assignment-review-section">
                    <div class="assignment-header">
                        <h3>${assignment.title}</h3>
                        <div class="assignment-meta">
                            <span class="total-marks">Total Marks: ${assignment.totalMarks}</span>
                            <span class="due-date">Due: ${new Date(assignment.dueDate).toLocaleDateString()}</span>
                        </div>
                    </div>
                    <div class="submissions-list">
                        ${submissions.map(submission => `
                            <div class="submission-item" id="submission-${submission._id}">
                                <div class="submission-header">
                                    <div class="submission-student-info">
                                        <div class="submission-student">${submission.student.name}</div>
                                        <div class="submission-email">${submission.student.email}</div>
                                        <div class="submission-time">Submitted: ${new Date(submission.submittedAt).toLocaleString()}</div>
                                    </div>
                                    <div class="submission-marks-section">
                                        <input type="number"
                                               class="marks-input"
                                               placeholder="Enter marks"
                                               min="0"
                                               max="${assignment.totalMarks}"
                                               value="${submission.marks !== undefined ? submission.marks : ''}"
                                               onchange="validateAndUpdateMarks('${submission._id}', this.value, ${assignment.totalMarks})"
                                        >
                                        <span class="marks-total">/ ${assignment.totalMarks}</span>
                                    </div>
                                </div>
                                <div class="submission-file">
                                    <a href="/uploads/${submission.file}" target="_blank">
                                        <i class="fas fa-file-alt"></i> View Submission
                                    </a>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        toReviewSection.innerHTML = html;
    } catch (error) {
        toReviewSection.innerHTML = '<div class="error">Failed to connect to server</div>';
    }
}

async function validateAndUpdateMarks(submissionId, marks, totalMarks) {
    marks = Number(marks);
    if (isNaN(marks) || marks < 0 || marks > totalMarks) {
        alert(`Please enter a valid mark between 0 and ${totalMarks}`);
        return;
    }

    try {
        const response = await fetch(`${BACKEND_URL}/api/assignments/submission/${submissionId}/marks`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ marks })
        });

        const data = await response.json();
        if (!data.success) {
            alert(data.message || 'Failed to update marks');
            return;
        }

        // Visual feedback
        const submissionElement = document.getElementById(`submission-${submissionId}`);
        submissionElement.style.borderColor = '#43a047';
        setTimeout(() => {
            submissionElement.style.borderColor = '#1976d2';
        }, 2000);
    } catch (error) {
        alert('Failed to connect to server');
    }
} 