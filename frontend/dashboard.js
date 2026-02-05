const API_BASE_URL = 'http://localhost:8000/api/v1';

let currentStatus = null;
let selectedQuestions = new Set();

// Load stats on page load
async function loadStats() {
    try {
        const response = await fetch(`${API_BASE_URL}/dashboard/stats`);
        const stats = await response.json();

        document.getElementById('pendingCount').textContent = stats.dedupe_pending;
        document.getElementById('dedupeCount').textContent = stats.dedupe_approved;
        document.getElementById('approvedCount').textContent = stats.approved;
    } catch (error) {
        console.error('Failed to load stats:', error);
    }
}

// Open modal and load questions by status
async function openModal(status) {
    currentStatus = status;
    selectedQuestions.clear();

    const modal = document.getElementById('questionModal');
    const modalTitle = document.getElementById('modalTitle');
    const questionList = document.getElementById('questionList');
    const modalFooter = document.getElementById('modalFooter');

    // Set title based on status
    const titles = {
        'DEDUPE_PENDING': 'Pending Deduplication Check',
        'DEDUPE_APPROVED': 'Dedupe Approved - Pending Final Approval',
        'APPROVED': 'Approved Questions'
    };
    modalTitle.textContent = titles[status];

    // Show modal
    modal.style.display = 'block';
    questionList.innerHTML = '<p class="loading">Loading questions...</p>';

    try {
        const response = await fetch(`${API_BASE_URL}/dashboard/questions/${status}`);
        const questions = await response.json();

        if (questions.length === 0) {
            questionList.innerHTML = '<p class="no-data">No questions in this category</p>';
            modalFooter.innerHTML = '';
            return;
        }

        // Display questions
        questionList.innerHTML = questions.map(q => `
            <div class="question-item">
                <input type="checkbox" class="question-checkbox" data-id="${q.id}" 
                       onchange="toggleQuestion(${q.id})">
                <div class="question-details">
                    <div class="question-meta">
                        <span class="badge">${q.metadata.subject}</span>
                        <span class="badge">${q.metadata.topic}</span>
                        <span class="badge">${q.metadata.bloom_level}</span>
                        <span class="badge">${q.metadata.difficulty}</span>
                        <span class="badge">${q.metadata.marks} marks</span>
                    </div>
                    <p class="question-text">${q.question_text}</p>
                    <small class="question-id">ID: ${q.id} | Created: ${new Date(q.created_at).toLocaleString()}</small>
                </div>
            </div>
        `).join('');

        // Add action buttons based on status
        if (status === 'DEDUPE_PENDING') {
            modalFooter.innerHTML = `
                <button class="btn-action" onclick="submitForDedupe()" id="actionBtn">
                    Submit Selected for Duplicate Check
                </button>
            `;
        } else if (status === 'DEDUPE_APPROVED') {
            modalFooter.innerHTML = `
                <button class="btn-action" onclick="approveQuestions()" id="actionBtn">
                    Approve Selected Questions
                </button>
            `;
        } else {
            modalFooter.innerHTML = '';
        }

    } catch (error) {
        console.error('Failed to load questions:', error);
        questionList.innerHTML = '<p class="error">Failed to load questions</p>';
    }
}

function closeModal() {
    document.getElementById('questionModal').style.display = 'none';
    selectedQuestions.clear();
}

function toggleQuestion(id) {
    if (selectedQuestions.has(id)) {
        selectedQuestions.delete(id);
    } else {
        selectedQuestions.add(id);
    }
    updateActionButton();
}

function updateActionButton() {
    const actionBtn = document.getElementById('actionBtn');
    if (actionBtn) {
        actionBtn.disabled = selectedQuestions.size === 0;
        actionBtn.textContent = actionBtn.textContent.replace(/\d+/, selectedQuestions.size || '');
    }
}

async function submitForDedupe() {
    if (selectedQuestions.size === 0) {
        alert('Please select at least one question');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/dashboard/submit-for-dedupe`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                question_ids: Array.from(selectedQuestions),
                new_status: 'DEDUPE_APPROVED'
            })
        });

        const result = await response.json();
        alert(`✓ ${result.count} questions submitted for deduplication check`);
        closeModal();
        loadStats();
    } catch (error) {
        alert('Failed to submit questions: ' + error.message);
    }
}

async function approveQuestions() {
    if (selectedQuestions.size === 0) {
        alert('Please select at least one question');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/dashboard/approve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                question_ids: Array.from(selectedQuestions),
                new_status: 'APPROVED'
            })
        });

        const result = await response.json();
        alert(`✓ ${result.count} questions approved`);
        closeModal();
        loadStats();
    } catch (error) {
        alert('Failed to approve questions: ' + error.message);
    }
}

// Close modal when clicking outside
window.onclick = function (event) {
    const modal = document.getElementById('questionModal');
    if (event.target === modal) {
        closeModal();
    }
}

// Load stats on page load
loadStats();
