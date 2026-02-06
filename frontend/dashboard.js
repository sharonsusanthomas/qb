const API_BASE_URL = 'http://localhost:8000/api/v1';

let currentStatus = null;
let selectedQuestions = new Set();

// Layout Logging Utility
function addLog(message, type = 'info') {
    const logContainer = document.getElementById('activityLog');
    if (!logContainer) return;

    const time = new Date().toLocaleTimeString();
    const logEntry = document.createElement('div');
    logEntry.style.marginBottom = '4px';

    let color = 'white';
    let icon = '📝';

    if (type === 'success') { color = '#10b981'; icon = '✅'; }
    if (type === 'error') { color = '#ef4444'; icon = '❌'; }
    if (type === 'process') { color = '#f59e0b'; icon = '⚙️'; }
    if (type === 'ai') { color = '#8b5cf6'; icon = '🤖'; }

    logEntry.innerHTML = `<span style="color: #94a3b8">[${time}]</span> <span style="color: ${color}">${icon} ${message}</span>`;

    logContainer.appendChild(logEntry);
    logContainer.scrollTop = logContainer.scrollHeight;
}

function clearLogs() {
    document.getElementById('activityLog').innerHTML = '<div style="color: var(--text-muted)">Logs cleared. Waiting for activity...</div>';
}

// Load stats on page load
async function loadStats() {
    try {
        const response = await fetch(`${API_BASE_URL}/dashboard/stats`);
        const stats = await response.json();

        document.getElementById('pendingCount').textContent = stats.dedupe_pending;
        document.getElementById('dedupeCount').textContent = stats.dedupe_approved;
        document.getElementById('duplicateCount').textContent = stats.duplicate_flagged;
        document.getElementById('approvedCount').textContent = stats.approved;

        addLog(`Stats updated: ${stats.dedupe_pending} pending, ${stats.duplicate_flagged} flagged.`, 'info');
    } catch (error) {
        addLog('Failed to fetch dashboard stats.', 'error');
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

    const titles = {
        'DEDUPE_PENDING': 'Pending Deduplication Check',
        'DEDUPE_APPROVED': 'Dedupe Approved - Pending Final Approval',
        'DUPLICATE_FLAGGED': 'Flagged Duplicates',
        'APPROVED': 'Approved Questions'
    };
    modalTitle.textContent = titles[status];
    modal.style.display = 'block';
    questionList.innerHTML = '<p class="loading">Loading questions...</p>';

    addLog(`Opening ${titles[status]} bucket...`, 'process');

    try {
        const response = await fetch(`${API_BASE_URL}/dashboard/questions/${status}`);
        const questions = await response.json();

        if (questions.length === 0) {
            questionList.innerHTML = '<p class="no-data">No questions in this category</p>';
            modalFooter.innerHTML = '';
            addLog(`Bucket ${status} is empty.`, 'info');
            return;
        }

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
                        ${status === 'DUPLICATE_FLAGGED' ? '<span class="badge" style="background:var(--danger)">FLAGGED</span>' : ''}
                    </div>
                    <p class="question-text">${q.question_text}</p>
                    ${status === 'DUPLICATE_FLAGGED' ? `<button class="btn-secondary" onclick="showDuplicateDetails(${q.id})">🔍 View Similarity Report</button>` : ''}
                    <small class="question-id">ID: ${q.id} | Created: ${new Date(q.created_at).toLocaleString()}</small>
                </div>
            </div>
        `).join('');

        if (status === 'DEDUPE_PENDING') {
            modalFooter.innerHTML = `<button class="btn-action" onclick="submitForDedupe()" id="actionBtn" disabled>Submit for Deduplication Check</button>`;
        } else if (status === 'DEDUPE_APPROVED' || status === 'DUPLICATE_FLAGGED') {
            modalFooter.innerHTML = `<button class="btn-action" onclick="approveQuestions()" id="actionBtn" disabled>Approve Selected Questions</button>`;
        } else {
            modalFooter.innerHTML = '';
        }

        addLog(`Loaded ${questions.length} questions from ${status}.`, 'success');

    } catch (error) {
        addLog(`Failed to load questions: ${error.message}`, 'error');
        questionList.innerHTML = '<p class="error">Failed to load questions</p>';
    }
}

async function submitForDedupe() {
    if (selectedQuestions.size === 0) return;

    const actionBtn = document.getElementById('actionBtn');
    actionBtn.disabled = true;
    actionBtn.textContent = '⏱️ Starting Background Check...';

    addLog(`Submitting ${selectedQuestions.size} questions for background deduplication...`, 'process');

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
        addLog(`Deduplication request successful. Backend is processing ${result.count} items.`, 'success');
        addLog(`AI is currently comparing vectors and logic in the background. Refresh in a few seconds.`, 'ai');

        closeModal();
        loadStats();
    } catch (error) {
        addLog(`Deduplication request failed: ${error.message}`, 'error');
    }
}

async function showDuplicateDetails(id) {
    addLog(`Fetching similarity report for Question #${id}...`, 'process');
    try {
        const response = await fetch(`${API_BASE_URL}/dashboard/duplicates/${id}`);
        const matches = await response.json();

        if (matches.length === 0) {
            addLog(`No match data found for #${id}.`, 'info');
            return;
        }

        const body = document.getElementById('reportModalBody');
        body.innerHTML = matches.map(m => `
            <div class="report-item" style="border: 2px solid var(--danger); padding: 1.5rem; margin-bottom: 1.5rem; border-radius: 1rem; background: var(--bg);">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
                    <div>
                        <span class="badge" style="background: var(--danger)">MATCH FOUND: ID #${m.match_question.id}</span>
                        <span class="badge" style="background: var(--primary)">${(m.similarity_score * 100).toFixed(0)}% Semantic Match</span>
                    </div>
                    <span class="badge" style="background: var(--text-muted)">Verdict: ${m.verdict}</span>
                </div>
                
                <div class="question-text" style="background: rgba(239, 68, 68, 0.05); padding: 1rem; border-radius: 0.5rem; margin-bottom: 1rem; border-left: 4px solid var(--danger);">
                    "${m.match_question.question_text}"
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; font-size: 0.9rem;">
                    <div style="color: var(--text-muted)">
                        <strong>Subject:</strong> ${m.match_question.metadata.subject}<br>
                        <strong>Topic:</strong> ${m.match_question.metadata.topic}
                    </div>
                    <div style="color: var(--text-muted)">
                        <strong>Marks:</strong> ${m.match_question.metadata.marks}<br>
                        <strong>Difficulty:</strong> ${m.match_question.metadata.difficulty}
                    </div>
                </div>

                <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border); color: var(--danger); font-weight: 500;">
                    🤖 AI Reasoning: <span style="font-weight: 400; color: var(--text);">${m.reason}</span>
                </div>
            </div>
        `).join('');

        document.getElementById('reportModal').style.display = 'block';
        addLog(`Displayed similarity report for Question #${id} in modal.`, 'success');
    } catch (e) {
        addLog(`Failed to load report for #${id}.`, 'error');
    }
}

function closeReportModal() {
    document.getElementById('reportModal').style.display = 'none';
}

async function approveQuestions() {
    if (selectedQuestions.size === 0) return;
    addLog(`Finalizing approval for ${selectedQuestions.size} questions...`, 'process');

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
        addLog(`Successfully approved ${result.count} questions.`, 'success');
        closeModal();
        loadStats();
    } catch (error) {
        addLog(`Approval failed: ${error.message}`, 'error');
    }
}

function closeModal() {
    document.getElementById('questionModal').style.display = 'none';
    selectedQuestions.clear();
}

function toggleQuestion(id) {
    if (selectedQuestions.has(id)) selectedQuestions.delete(id);
    else selectedQuestions.add(id);
    updateActionButton();
}

function updateActionButton() {
    const actionBtn = document.getElementById('actionBtn');
    if (actionBtn) {
        actionBtn.disabled = selectedQuestions.size === 0;
        const baseText = currentStatus === 'DEDUPE_PENDING' ? 'Submit selected' : 'Approve selected';
        actionBtn.textContent = `${baseText} (${selectedQuestions.size})`;
    }
}

window.onclick = function (event) {
    const qModal = document.getElementById('questionModal');
    const rModal = document.getElementById('reportModal');
    if (event.target === qModal) closeModal();
    if (event.target === rModal) closeReportModal();
}

loadStats();
setInterval(loadStats, 10000); // Auto-refresh stats every 10s to see BG progress
addLog('Dashboard connected. Ready for operations.', 'success');
