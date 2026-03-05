const API_BASE_URL = '/api/v1';

let currentStatus = null;
let selectedQuestions = new Set();
const activeModalEditors = {};

// Initialize Markdown-it
const md = window.markdownit({
    html: true,
    breaks: true,
    linkify: true
});

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

        questionList.innerHTML = questions.map(q => {
            const isSelected = selectedQuestions.has(q.id);
            const renderedText = md.render(q.question_text);
            return `
                <div class="question-item ${isSelected ? 'selected' : ''}" id="q-item-${q.id}" onclick="handleCardClick(event, ${q.id})">
                    <input type="checkbox" class="question-checkbox" id="check-${q.id}" ${isSelected ? 'checked' : ''} 
                           onclick="event.stopPropagation(); toggleQuestion(${q.id})">
                    <div class="question-details">
                        <div class="question-meta">
                            <span class="badge">${q.metadata.subject}</span>
                            <span class="badge">${q.metadata.topic}</span>
                            <span class="badge">${q.metadata.bloom_level}</span>
                            <span class="badge">${q.metadata.difficulty}</span>
                            <span class="badge">${q.metadata.marks} marks</span>
                            ${status === 'DUPLICATE_FLAGGED' ? '<span class="badge" style="background:var(--danger)">FLAGGED</span>' : ''}
                        </div>
                        <div class="question-text" id="q-text-${q.id}">${renderedText}</div>
                        ${q.course_outcomes && q.course_outcomes.length > 0 ? `
                        <div class="question-cos" style="margin-bottom: 0.75rem;">
                            <strong>COs:</strong> ${q.course_outcomes.map(co => `<span class="co-badge" title="${co.description}">${co.outcome_code}</span>`).join(' ')}
                        </div>` : ''}
                        
                        <div id="q-view-actions-${q.id}" style="display: flex; gap: 0.75rem; flex-wrap: wrap; margin-top: 1rem;">
                            ${status === 'DUPLICATE_FLAGGED' ? `<button class="btn-secondary" onclick="event.stopPropagation(); showDuplicateDetails(${q.id})">🔍 View Similarity Report</button>` : ''}
                            <button class="btn-secondary" style="padding: 4px 12px; font-size: 0.8rem;" onclick="event.stopPropagation(); startEditing(${q.id})">✏️ Edit</button>
                        </div>

                        <!-- Dashboard Card Editor (Hidden by default) -->
                        <div id="q-edit-box-${q.id}" style="display:none; margin-top: 1.5rem; border-top: 1px solid var(--border); padding-top: 1rem;">
                            <textarea id="dashboard-editor-${q.id}">${q.question_text}</textarea>
                            <div style="margin-top: 1rem; display: flex; gap: 0.75rem;">
                                <button class="btn-action" style="padding: 6px 16px; font-size: 0.8rem; background: var(--success);" onclick="event.stopPropagation(); saveDashboardEdit(${q.id})">💾 Save Changes</button>
                                <button class="btn-secondary" style="padding: 6px 16px; font-size: 0.8rem;" onclick="event.stopPropagation(); cancelDashboardEdit(${q.id})">Cancel</button>
                            </div>
                        </div>

                        <small class="question-id">ID: ${q.id} | Created: ${new Date(q.created_at).toLocaleString()}</small>
                    </div>
                </div>
            `;
        }).join('');

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
        // Fetch matches
        const matchResponse = await fetch(`${API_BASE_URL}/dashboard/duplicates/${id}`);
        const matches = await matchResponse.json();

        // Fetch source question details
        const sourceResponse = await fetch(`${API_BASE_URL}/questions/${id}`);
        const source = await sourceResponse.json();

        if (matches.length === 0) {
            addLog(`No match data found for #${id}.`, 'info');
            return;
        }

        const body = document.getElementById('reportModalBody');

        // Show Comparison View
        body.innerHTML = `
            <div style="margin-bottom: 2rem; border-bottom: 2px solid var(--border); padding-bottom: 1rem;">
                <p style="color: var(--text-muted); font-size: 0.9rem;">Comparing original Question <strong>#${id}</strong> against found duplicates.</p>
            </div>
        ` + matches.map(m => `
            <div class="report-item" style="margin-bottom: 3rem;">
                <div class="comparison-grid">
                    <!-- Source Question -->
                    <div class="comparison-card source" id="source-container-${id}">
                        <div class="comparison-header">
                            <span>PRIMARY QUESTION (#${id})</span>
                            <button class="btn-secondary" style="padding: 2px 8px; font-size: 0.7rem;" onclick="editQuestionInModal(${id}, 'source')">✏️ Edit</button>
                        </div>
                        <div id="source-view-${id}">
                            <div class="question-text" id="source-text-render-${id}">${md.render(source.question_text)}</div>
                        </div>
                        <div id="source-edit-box-${id}" style="display:none;">
                            <textarea id="modal-editor-source-${id}">${source.question_text}</textarea>
                            <div style="margin-top: 0.5rem; display: flex; gap: 0.5rem;">
                                <button class="btn-action" style="padding: 4px 12px; font-size: 0.7rem; background: var(--success);" onclick="saveQuestionInModal(${id}, 'source')">Save</button>
                                <button class="btn-secondary" style="padding: 4px 12px; font-size: 0.7rem;" onclick="cancelModalEdit(${id}, 'source')">Cancel</button>
                            </div>
                        </div>
                    </div>

                    <!-- Match Question -->
                    <div class="comparison-card match" id="match-container-${m.match_question.id}">
                        <div class="comparison-header">
                            <span>SIMILAR MATCH (#${m.match_question.id})</span>
                            <button class="btn-secondary" style="padding: 2px 8px; font-size: 0.7rem;" onclick="editQuestionInModal(${m.match_question.id}, 'match')">✏️ Edit</button>
                        </div>
                        <div id="match-view-${m.match_question.id}">
                            <div class="question-text" id="match-text-render-${m.match_question.id}">${md.render(m.match_question.question_text)}</div>
                            <div style="margin-top: 1rem; font-size: 0.8rem; color: var(--text-muted);">
                                <strong>Score:</strong> ${(m.similarity_score * 100).toFixed(0)}% Match | <strong>Verdict:</strong> ${m.verdict}
                            </div>
                        </div>
                        <div id="match-edit-box-${m.match_question.id}" style="display:none;">
                            <textarea id="modal-editor-match-${m.match_question.id}">${m.match_question.question_text}</textarea>
                            <div style="margin-top: 0.5rem; display: flex; gap: 0.5rem;">
                                <button class="btn-action" style="padding: 4px 12px; font-size: 0.7rem; background: var(--success);" onclick="saveQuestionInModal(${m.match_question.id}, 'match')">Save</button>
                                <button class="btn-secondary" style="padding: 4px 12px; font-size: 0.7rem;" onclick="cancelModalEdit(${m.match_question.id}, 'match')">Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>

                <div style="background: rgba(239, 68, 68, 0.05); padding: 1.25rem; border-radius: 0.75rem; border-left: 4px solid var(--danger); margin-bottom: 2rem;">
                    <strong style="color: var(--danger);">🤖 AI Analysis:</strong> 
                    <p style="margin-top: 0.5rem; line-height: 1.5;">${m.reason}</p>
                </div>

                <div class="resolution-center">
                    <!-- Link Logic -->
                    <div class="action-group">
                        <span class="action-group-label">Organizational Links (Keep Both)</span>
                        <div class="action-buttons">
                            <button class="btn-resolution org" onclick="linkQuestion(${id}, ${m.match_question.id}, 'CHILD')">
                                🔗 Link #${id} as Child of #${m.match_question.id}
                            </button>
                            <button class="btn-resolution org" onclick="linkQuestion(${id}, ${m.match_question.id}, 'PARENT')">
                                🔗 Link #${id} as Parent of #${m.match_question.id}
                            </button>
                            <button class="btn-resolution org" onclick="linkQuestion(${id}, ${m.match_question.id}, 'PARALLEL')">
                                ⚖️ Link as Parallel Content
                            </button>
                        </div>
                    </div>

                    <!-- Final Decisions -->
                    <div class="action-group">
                        <span class="action-group-label">Final Decisions</span>
                        <div class="action-buttons">
                            <button class="btn-resolution success" onclick="linkQuestion(${id}, null, 'IGNORE')">
                                ✅ Both are Unique (False Positive)
                            </button>
                            <button class="btn-resolution danger" onclick="deleteQuestion(${id})">
                                🗑️ Delete Original (#${id})
                            </button>
                            <button class="btn-resolution danger" onclick="deleteQuestion(${m.match_question.id})">
                                🗑️ Delete Match (#${m.match_question.id})
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');

        document.getElementById('reportModal').style.display = 'block';
        addLog(`Displayed full comparison for Question #${id}.`, 'success');
    } catch (e) {
        console.error(e);
        addLog(`Failed to load report for #${id}: ${e.message}`, 'error');
    }
}

// --- Modal Inline Editing ---
function editQuestionInModal(id, type) {
    const viewDiv = document.getElementById(`${type}-view-${id}`);
    const editDiv = document.getElementById(`${type}-edit-box-${id}`);

    viewDiv.style.display = 'none';
    editDiv.style.display = 'block';

    if (!activeModalEditors[id]) {
        activeModalEditors[id] = window.SUNEDITOR.create(`modal-editor-${type}-${id}`, {
            buttonList: [
                ['undo', 'redo'],
                ['bold', 'underline', 'italic', 'strike', 'subscript', 'superscript'],
                ['list', 'align'],
                ['math', 'image', 'table'],
                ['fullScreen', 'codeView']
            ],
            katex: window.katex,
            width: '100%',
            height: '150px'
        });
    }
}

function cancelModalEdit(id, type) {
    document.getElementById(`${type}-view-${id}`).style.display = 'block';
    document.getElementById(`${type}-edit-box-${id}`).style.display = 'none';
}

async function saveQuestionInModal(id, type) {
    const editor = activeModalEditors[id];
    const newText = editor.getContents();

    addLog(`Saving updates to Question #${id}...`, 'process');

    try {
        const response = await fetch(`${API_BASE_URL}/questions/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question_text: newText })
        });

        if (!response.ok) throw new Error('Update failed');

        const updated = await response.json();

        // Update the view
        document.getElementById(`${type}-text-render-${id}`).innerHTML = md.render(updated.question_text);
        addLog(`Question #${id} updated successfully.`, 'success');

        cancelModalEdit(id, type);
    } catch (e) {
        addLog(`Failed to save: ${e.message}`, 'error');
    }
}

// --- Global Dashboard Card Editing ---
const activeDashboardEditors = {};

function startEditing(id) {
    const textElem = document.getElementById(`q-text-${id}`);
    const actionBox = document.getElementById(`q-view-actions-${id}`);
    const editBox = document.getElementById(`q-edit-box-${id}`);

    if (textElem) textElem.style.display = 'none';
    if (actionBox) actionBox.style.display = 'none';
    if (editBox) editBox.style.display = 'block';

    if (!activeDashboardEditors[id]) {
        activeDashboardEditors[id] = window.SUNEDITOR.create(`dashboard-editor-${id}`, {
            buttonList: [
                ['undo', 'redo'],
                ['bold', 'underline', 'italic', 'strike', 'subscript', 'superscript'],
                ['fontColor', 'hiliteColor'],
                ['list', 'align'],
                ['math', 'table'],
                ['fullScreen', 'codeView']
            ],
            katex: window.katex,
            width: '100%',
            height: '180px'
        });
    }
}

function cancelDashboardEdit(id) {
    document.getElementById(`q-text-${id}`).style.display = 'block';
    document.getElementById(`q-view-actions-${id}`).style.display = 'flex';
    document.getElementById(`q-edit-box-${id}`).style.display = 'none';
}

async function saveDashboardEdit(id) {
    const editor = activeDashboardEditors[id];
    const newText = editor.getContents();

    addLog(`Saving Question #${id} changes...`, 'process');
    try {
        const response = await fetch(`${API_BASE_URL}/questions/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question_text: newText })
        });

        if (!response.ok) throw new Error('Update failed');

        const updated = await response.json();
        document.getElementById(`q-text-${id}`).innerHTML = md.render(updated.question_text);
        addLog(`Question #${id} updated successfully.`, 'success');
        cancelDashboardEdit(id);
    } catch (e) {
        addLog(`Error saving Question #${id}: ${e.message}`, 'error');
    }
}

function closeReportModal() {
    document.getElementById('reportModal').style.display = 'none';
}

function getVerdictColor(verdict) {
    if (verdict === 'DUPLICATE') return 'var(--danger)';
    if (verdict === 'PARENT_OF' || verdict === 'CHILD_OF') return 'var(--primary)';
    if (verdict === 'PARALLEL_TO') return 'var(--secondary)';
    return 'var(--text-muted)';
}

async function linkQuestion(id, targetId, relationType) {
    addLog(`Linking Question #${id} as ${relationType}...`, 'process');
    try {
        const response = await fetch(`${API_BASE_URL}/dashboard/link-questions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                question_id: id,
                target_id: targetId,
                relation_type: relationType
            })
        });

        if (response.ok) {
            addLog(`Successfully linked as ${relationType}.`, 'success');
            closeReportModal();
            closeModal();
            loadStats();
        } else {
            const err = await response.json();
            addLog(`Linking failed: ${err.detail}`, 'error');
        }
    } catch (e) {
        addLog(`Linking failed: ${e.message}`, 'error');
    }
}

async function deleteQuestion(id) {
    if (!confirm(`Are you sure you want to delete Question #${id}?`)) return;
    addLog(`Deleting Question #${id}...`, 'process');
    try {
        const response = await fetch(`${API_BASE_URL}/questions/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            addLog(`Question #${id} deleted successfully.`, 'success');
            closeReportModal();
            closeModal();
            loadStats();
        } else {
            const err = await response.json();
            addLog(`Deletion failed: ${err.detail}`, 'error');
        }
    } catch (e) {
        addLog(`Deletion failed: ${e.message}`, 'error');
    }
}

// Export to window
window.deleteQuestion = deleteQuestion;
window.linkQuestion = linkQuestion;
window.showDuplicateDetails = showDuplicateDetails;
window.startEditing = startEditing;
window.saveDashboardEdit = saveDashboardEdit;
window.cancelDashboardEdit = cancelDashboardEdit;
window.editQuestionInModal = editQuestionInModal;
window.saveQuestionInModal = saveQuestionInModal;
window.cancelModalEdit = cancelModalEdit;


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
    const item = document.getElementById(`q-item-${id}`);
    const checkbox = document.getElementById(`check-${id}`);

    if (selectedQuestions.has(id)) {
        selectedQuestions.delete(id);
        if (item) item.classList.remove('selected');
        if (checkbox) checkbox.checked = false;
    } else {
        selectedQuestions.add(id);
        if (item) item.classList.add('selected');
        if (checkbox) checkbox.checked = true;
    }
    updateActionButton();
}

function handleCardClick(event, id) {
    // If user clicked a button or link inside the card, don't toggle
    if (event.target.tagName === 'BUTTON' || event.target.tagName === 'A' || event.target.type === 'checkbox') {
        return;
    }
    toggleQuestion(id);
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

function initRotatingText() {
    const wrapper = document.getElementById('rotatingText');
    if (!wrapper) return;

    const words = wrapper.querySelectorAll('.rotating-word');
    let index = 0;

    setInterval(() => {
        const current = words[index];
        const nextIndex = (index + 1) % words.length;
        const next = words[nextIndex];

        current.classList.remove('active');
        current.classList.add('previous');

        next.classList.remove('previous');
        next.classList.add('active');

        setTimeout(() => {
            current.classList.remove('previous');
        }, 500);

        index = nextIndex;
    }, 2500);
}

document.addEventListener('DOMContentLoaded', () => {
    initRotatingText();
});
