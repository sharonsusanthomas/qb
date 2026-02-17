import { API_BASE_URL } from './modules/config.js';
import * as ui from './modules/ui.js';
import * as api from './modules/api.js';

console.log('Script module initialized. API Base:', API_BASE_URL);

// Initialize Markdown Renderer
const md = window.markdownit({
    html: true,
    linkify: true,
    typographer: true
});

// Simple KaTeX integration for Markdown
const originalRender = md.render.bind(md);
md.render = (text) => {
    // Replace $$...$$ and $...$ with KaTeX rendered HTML before/after MD rendering
    // This is a simple implementation; a full plugin would be better but this works for CDN
    let rendered = text.replace(/\$\$([\s\S]+?)\$\$/g, (match, formula) => {
        try { return `<div class="katex-display">${katex.renderToString(formula, { displayMode: true })}</div>`; }
        catch (e) { return match; }
    });
    rendered = rendered.replace(/\$([^\$]+?)\$/g, (match, formula) => {
        try { return katex.renderToString(formula, { displayMode: false }); }
        catch (e) { return match; }
    });
    return originalRender(rendered);
};


const form = document.getElementById('questionForm');
const generateBtn = document.getElementById('generateBtn');
const btnText = document.querySelector('.btn-text');
const loader = document.querySelector('.loader');
const resultSection = document.getElementById('resultSection');
const resultsList = document.getElementById('resultsList');
const resultBatchCount = document.getElementById('resultBatchCount');
const errorSection = document.getElementById('errorSection');
const errorMessage = document.getElementById('errorMessage');

const subjectSelect = document.getElementById('subject');
const topicSelect = document.getElementById('topic');

const pdfSubjectSelect = document.getElementById('pdfSubject');
const pdfTopicSelect = document.getElementById('pdfTopic');

const mSubjectSelect = document.getElementById('mSubject');
const mTopicSelect = document.getElementById('mTopic');

// Helper to fill subject selects
function populateSubjectSelects(data) {
    [subjectSelect, pdfSubjectSelect, mSubjectSelect].forEach(select => {
        select.innerHTML = '<option value="">Select Subject</option>';
        data.forEach(subject => {
            const option = document.createElement('option');
            option.value = subject.id;
            // Store name for manual/pdf use if needed, though we usually send names
            option.textContent = `${subject.course_code} - ${subject.subject_name}`;
            option.dataset.subjectName = subject.subject_name;
            select.appendChild(option);
        });
    });
}

// Load subjects on page load
async function loadSubjects() {
    console.log('Attempting to load subjects...');
    try {
        const subjects = await api.getSubjects();
        console.log('Subjects loaded successfully:', subjects.length);
        populateSubjectSelects(subjects);
    } catch (error) {
        console.error('Failed to load subjects:', error);
        [subjectSelect, pdfSubjectSelect, mSubjectSelect].forEach(select => {
            select.innerHTML = '<option value="">Error loading subjects</option>';
        });
        ui.showToast('Failed to load subjects. Please refresh.', 'error');
    }
}

// Load topics helper
async function loadTopics(subjectId, targetTopicSelect) {
    if (!targetTopicSelect) return;

    targetTopicSelect.disabled = true;
    targetTopicSelect.innerHTML = '<option value="">Loading topics...</option>';

    try {
        const topics = await api.getTopics(subjectId);

        targetTopicSelect.innerHTML = '<option value="">Select Topic</option>';
        topics.forEach(topic => {
            const option = document.createElement('option');
            option.value = topic.id;
            option.textContent = topic.topic_name;
            option.dataset.topicName = topic.topic_name;
            targetTopicSelect.appendChild(option);
        });
        targetTopicSelect.disabled = false;
    } catch (error) {
        console.error('Failed to load topics:', error);
        targetTopicSelect.innerHTML = '<option value="">Failed to load topics</option>';
        ui.showToast('Failed to load topics for selected subject', 'error');
    }
}

// Toggle custom dropdown
function toggleDropdown(dropdownId) {
    const dropdown = document.getElementById(dropdownId);

    // Close other dropdowns
    document.querySelectorAll('.custom-dropdown').forEach(d => {
        if (d.id !== dropdownId) d.classList.remove('open');
    });

    dropdown.classList.toggle('open');
}

// Close dropdowns when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.custom-dropdown')) {
        document.querySelectorAll('.custom-dropdown').forEach(d => d.classList.remove('open'));
    }
});

// Load Course Outcomes helper
async function loadCourseOutcomes(subjectId, containerId, listId, dropdownId) {
    const list = document.getElementById(listId);
    const container = document.getElementById(containerId);
    const dropdown = document.getElementById(dropdownId);

    if (!subjectId) {
        container.style.display = 'none';
        list.innerHTML = '';
        return;
    }

    try {
        const outcomes = await api.getCourseOutcomes(subjectId);

        list.innerHTML = '';
        // Reset summary
        const header = dropdown.querySelector('.dropdown-header');
        header.textContent = 'Select Course Outcomes...';

        if (outcomes.length > 0) {
            outcomes.forEach(co => {
                const div = document.createElement('div');
                div.className = 'co-item';

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.value = co.id;
                checkbox.id = `${listId}-co-${co.id}`;
                checkbox.name = `${listId}-co`;
                checkbox.className = 'co-checkbox';

                // Update summary on change
                checkbox.addEventListener('change', () => updateDropdownSummary(listId, dropdownId));

                const label = document.createElement('label');
                label.htmlFor = checkbox.id;
                label.className = 'co-label';

                const codeSpan = document.createElement('span');
                codeSpan.className = 'co-code';
                codeSpan.textContent = co.outcome_code;

                label.appendChild(codeSpan);
                label.appendChild(document.createTextNode(co.description));

                div.appendChild(checkbox);
                div.appendChild(label);

                // Allow clicking row to toggle checkbox
                div.addEventListener('click', (e) => {
                    if (e.target !== checkbox && e.target.tagName !== 'LABEL') {
                        checkbox.checked = !checkbox.checked;
                        updateDropdownSummary(listId, dropdownId);
                    }
                });

                list.appendChild(div);
            });
            container.style.display = 'block';
        } else {
            container.style.display = 'none';
        }
    } catch (error) {
        console.error('Failed to load course outcomes:', error);
        ui.showToast('Failed to load course outcomes', 'warning');
        container.style.display = 'none';
    }
}


function updateDropdownSummary(listId, dropdownId) {
    const checkboxes = document.querySelectorAll(`#${listId} input[type="checkbox"]:checked`);
    const header = document.querySelector(`#${dropdownId} .dropdown-header`);

    if (checkboxes.length === 0) {
        header.textContent = 'Select Course Outcomes...';
    } else {
        header.textContent = `${checkboxes.length} Outcome(s) Selected`;
    }
}

function collectSelectedCOs(listId) {
    const checkboxes = document.querySelectorAll(`#${listId} input[type="checkbox"]:checked`);
    return Array.from(checkboxes).map(cb => parseInt(cb.value));
}

// Attach listeners to all subject dropdowns
function attachSubjectListeners() {
    const pairs = [
        { subject: subjectSelect, topic: topicSelect, coContainer: 'coContainer', listId: 'coList', dropdownId: 'coDropdown' },
        { subject: pdfSubjectSelect, topic: pdfTopicSelect, coContainer: 'pdfCoContainer', listId: 'pdfCoList', dropdownId: 'pdfCoDropdown' },
        { subject: mSubjectSelect, topic: mTopicSelect, coContainer: 'mCoContainer', listId: 'mCoList', dropdownId: 'mCoDropdown' }
    ];

    pairs.forEach(pair => {
        pair.subject.addEventListener('change', (e) => {
            const subjectId = e.target.value;
            if (subjectId) {
                loadTopics(subjectId, pair.topic);
                loadCourseOutcomes(subjectId, pair.coContainer, pair.listId, pair.dropdownId);
            } else {
                pair.topic.disabled = true;
                pair.topic.innerHTML = '<option value="">Select a subject first</option>';
                document.getElementById(pair.coContainer).style.display = 'none';
            }
        });
    });
}

// Load subjects on page load
loadSubjects();
attachSubjectListeners();

// Tab switching
function switchTab(mode) {
    // Buttons
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`.tab-btn[onclick="switchTab('${mode}')"]`).classList.add('active');

    // Content
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(`${mode}Mode`).classList.add('active');
}

// Standard Form submission
form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const selectedSubject = subjectSelect.options[subjectSelect.selectedIndex];
    const selectedTopic = topicSelect.options[topicSelect.selectedIndex];

    const formData = {
        subject: selectedSubject.dataset.subjectName,
        topic: selectedTopic.dataset.topicName,
        bloom_level: document.getElementById('bloomLevel').value,
        difficulty: document.getElementById('difficulty').value,
        marks: parseInt(document.getElementById('marks').value),
        count: parseInt(document.getElementById('questionCount').value || 1),
        course_outcome_ids: collectSelectedCOs('coList')
    };

    console.log('Generating questions with data:', formData);
    await handleGeneration(`${API_BASE_URL}/questions/generate`, formData, generateBtn, btnText, loader, false);
});

// PDF Form submission
const pdfForm = document.getElementById('pdfForm');
const pdfGenerateBtn = document.getElementById('pdfGenerateBtn');
const pdfBtnText = pdfGenerateBtn.querySelector('.btn-text');
const pdfLoader = pdfGenerateBtn.querySelector('.loader');

pdfForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const fileInput = document.getElementById('pdfFile');
    const file = fileInput.files[0];

    if (!file) {
        displayError("Please upload a PDF file");
        return;
    }

    // Get text from selects
    const selectedSubject = pdfSubjectSelect.options[pdfSubjectSelect.selectedIndex].dataset.subjectName;
    const selectedTopic = pdfTopicSelect.options[pdfTopicSelect.selectedIndex].dataset.topicName;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('subject', selectedSubject);
    formData.append('topic', selectedTopic);
    formData.append('bloom_level', document.getElementById('pdfBloomLevel').value);
    formData.append('difficulty', document.getElementById('pdfDifficulty').value);
    formData.append('marks', document.getElementById('pdfMarks').value);
    formData.append('count', document.getElementById('pdfQuestionCount').value);

    const selectedCOs = collectSelectedCOs('pdfCoList');
    selectedCOs.forEach(id => formData.append('course_outcome_ids', id));

    // Add custom prompt if exists
    const customPrompt = document.getElementById('customPrompt').value;
    formData.append('custom_prompt', customPrompt || '');

    console.log('Generating context-based questions...');
    await handleGeneration(`${API_BASE_URL}/generate-from-notes/`, formData, pdfGenerateBtn, pdfBtnText, pdfLoader, true);
});

// Manual Form submission
const manualForm = document.getElementById('manualForm');
const manualSaveBtn = document.getElementById('manualSaveBtn');
const manualBtnText = manualSaveBtn.querySelector('.btn-text');
const manualLoader = manualSaveBtn.querySelector('.loader');

manualForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const selectedSubject = mSubjectSelect.options[mSubjectSelect.selectedIndex].dataset.subjectName;
    const selectedTopic = mTopicSelect.options[mTopicSelect.selectedIndex].dataset.topicName;

    const formData = {
        subject: selectedSubject,
        topic: selectedTopic,
        bloom_level: document.getElementById('mBloomLevel').value,
        difficulty: document.getElementById('mDifficulty').value,
        marks: parseInt(document.getElementById('mMarks').value || 15),
        course_outcome_ids: collectSelectedCOs('mCoList'),
        question_text: document.getElementById('mQuestionText').value
    };
    await handleGeneration(`${API_BASE_URL}/questions/manual`, formData, manualSaveBtn, manualBtnText, manualLoader, false);
});

const generationStatuses = [
    "Analyzing curriculum standards...",
    "Consulting AI Brain...",
    "Applying Bloom's Taxonomy...",
    "Validating difficulty constraints...",
    "Checking for duplicates...",
    "Ensuring RBT compliance...",
    "Polishing question phrasing...",
    "Finalizing metadata..."
];

const pdfStatuses = [
    "Reading uploaded PDF content...",
    "Extracting relevant context...",
    "Identifying key concepts...",
    "Consulting AI Brain...",
    "Generating context-aware question...",
    "Validating against notes...",
    "Double-checking marks allocation..."
];

async function handleGeneration(url, data, btn, btnTextElem, loaderElem, isMultipart) {
    const statuses = isMultipart ? pdfStatuses : generationStatuses;

    // Show loading state
    ui.toggleLoader(btn, btnTextElem, loaderElem, true, statuses);
    resultSection.style.display = 'none';
    errorSection.style.display = 'none';

    try {
        const options = {
            method: 'POST',
            body: isMultipart ? data : JSON.stringify(data)
        };

        if (!isMultipart) {
            options.headers = { 'Content-Type': 'application/json' };
        }

        console.log(`Sending request to ${url}...`);
        const response = await fetch(url, options);

        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: 'Failed to generate question' }));
            console.error('API Error Response:', error);
            throw new Error(error.detail || 'Failed to generate question');
        }

        const result = await response.json();
        console.log('API Result received:', result);

        displayResults(Array.isArray(result) ? result : [result]);
        ui.showToast('Generation successful!', 'success');

    } catch (error) {
        console.error('Generation Error:', error);
        ui.displayError(error.message, errorSection, errorMessage);
        ui.showToast(error.message, 'error');
    } finally {
        ui.toggleLoader(btn, btnTextElem, loaderElem, false);
    }
}

function displayResults(results) {
    console.log(`Displaying ${results.length} results`);
    resultsList.innerHTML = '';
    resultBatchCount.textContent = `${results.length} Item(s)`;
    resultSection.style.display = 'block';

    results.forEach((data, index) => {
        const card = document.createElement('div');
        card.className = 'card question-display';
        card.style.marginTop = index === 0 ? '0' : '1.5rem';

        const coHtml = (data.course_outcomes && data.course_outcomes.length > 0)
            ? `<p><strong>Course Outcomes:</strong> <span class="co-code">${data.course_outcomes.map(co => co.outcome_code).join(', ')}</span></p>`
            : '';

        // Render Markdown content
        const renderedText = md.render(data.question_text);

        card.innerHTML = `
            <div class="question-metadata no-print">
                <span class="badge">${data.metadata.bloom_level}</span>
                <span class="badge">${data.metadata.difficulty}</span>
                <span class="badge">${data.metadata.marks} marks</span>
            </div>
            <div class="question-text printable-content" id="q-text-${data.id}">${renderedText}</div>
            <div class="question-meta-info">
                <p><strong>Subject:</strong> ${data.metadata.subject}</p>
                <p><strong>Topic:</strong> ${data.metadata.topic}</p>
                ${coHtml}
                <p class="no-print"><strong>Question ID:</strong> ${data.id}</p>
            </div>
            <div class="no-print" style="display: flex; gap: 1rem; margin-top: 1rem;">
                <button class="btn-secondary" onclick="copyQuestion(${data.id})">📋 Copy Raw</button>
                <button class="btn-secondary" style="background: transparent; border: 1px solid var(--border);" onclick="window.open('/api/v1/questions/${data.id}', '_blank')">🔗 View JSON</button>
            </div>
        `;
        resultsList.appendChild(card);
    });

    resultSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

async function copyQuestion(id) {
    // For copying, we might want the original raw text if it's markdown
    // Let's rely on the original data or just grab it from a hypothetical data store
    // For now, we'll just grab the textContent which is the rendered text minus tags
    const textElem = document.getElementById(`q-text-${id}`);
    if (!textElem) return;

    try {
        await navigator.clipboard.writeText(textElem.innerText);
        ui.showToast('Question text copied!', 'success');
    } catch (err) {
        console.error('Failed to copy text: ', err);
        ui.showToast('Failed to copy text', 'error');
    }
}

function exportResults() {
    const element = document.getElementById('resultsList');
    const opt = {
        margin: [15, 15],
        filename: 'Generated_Questions.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: 'avoid-all', before: '.question-display' }
    };

    // Temporarily add a header for the PDF
    const header = document.createElement('div');
    header.innerHTML = `
        <h1 style="color: #2563eb; margin-bottom: 20px;">Academic Question Bank</h1>
        <p style="margin-bottom: 30px; color: #64748b;">Generated on: ${new Date().toLocaleString()}</p>
    `;
    element.prepend(header);

    html2pdf().set(opt).from(element).save().then(() => {
        header.remove(); // Clean up after saving
    });
}

function displayError(message) {
    errorSection.style.display = 'block';
    document.getElementById('errorMessage').textContent = message;
    errorSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Export functions to window for HTML accessibility
window.switchTab = switchTab;
window.toggleDropdown = toggleDropdown;
window.copyQuestion = copyQuestion;
window.exportResults = exportResults;
