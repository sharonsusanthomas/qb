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

const facultySelect = document.getElementById('faculty');
const pdfFacultySelect = document.getElementById('pdfFaculty');
const mFacultySelect = document.getElementById('mFaculty');

// Global state for regenerative editing
let questionsData = {};
const activeCardEditors = {};

// Faculty Persona state
let currentPersonaId = null;
let allPersonas = [];

// Initialize Sun Editor
const sunEditor = window.SUNEDITOR.create('mQuestionText', {
    buttonList: [
        ['undo', 'redo'],
        ['font', 'fontSize', 'formatBlock'],
        ['bold', 'underline', 'italic', 'strike', 'subscript', 'superscript'],
        ['fontColor', 'hiliteColor'],
        ['removeFormat'],
        ['list', 'align'],
        ['math', 'image', 'table', 'link'],
        ['fullScreen', 'showBlocks', 'codeView']
    ],
    katex: window.katex,
    width: '100%',
    height: '250px',
    placeholder: 'Type your physics/chemistry question with formulas...',
    charCounter: true,
    font: ['Arial', 'tahoma', 'Courier New,Courier'],
    fontSize: [8, 10, 12, 14, 16, 18, 20, 24, 28, 36]
});

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
        loadFacultyPersonas(); // Load personas as well
    } catch (error) {
        console.error('Failed to load subjects:', error);
        [subjectSelect, pdfSubjectSelect, mSubjectSelect].forEach(select => {
            select.innerHTML = '<option value="">Error loading subjects</option>';
        });
        ui.showToast('Failed to load subjects. Please refresh.', 'error');
    }
}

// Load Faculty Personas
async function loadFacultyPersonas() {
    try {
        allPersonas = await api.getFacultyPersonas();
        console.log('Personas loaded:', allPersonas);
        [facultySelect, pdfFacultySelect, mFacultySelect, document.getElementById('feedbackFacultyName')].forEach(select => {
            if (!select) return;
            const isFeedback = select.id === 'feedbackFacultyName';
            const currentValue = select.value;

            select.innerHTML = isFeedback ? '<option value="">Select Persona</option>' : '<option value="">Default (Generic Style)</option>';

            allPersonas.forEach(p => {
                const option = document.createElement('option');
                option.value = isFeedback ? p.id : p.faculty_name;
                option.textContent = p.faculty_name;
                select.appendChild(option);
            });
            select.value = currentValue;
        });

        renderPersonaList();
    } catch (error) {
        console.error('Failed to load personas:', error);
    }
}

function renderPersonaList() {
    const list = document.getElementById('personaList');
    if (!list) return;

    if (allPersonas.length === 0) {
        list.innerHTML = '<p class="text-muted">No personas created yet.</p>';
        return;
    }

    list.innerHTML = '';
    allPersonas.forEach(p => {
        const item = document.createElement('div');
        item.className = `persona-item ${currentPersonaId === p.id ? 'active' : ''}`;
        item.innerHTML = `
            <span>${p.faculty_name}</span>
            <small>${p.style_weights ? '✅ Profiled' : '⏳ Raw'}</small>
        `;
        item.onclick = () => selectPersona(p);
        list.appendChild(item);
    });
}

function selectPersona(persona) {
    console.log('Selecting persona:', persona);
    currentPersonaId = persona.id;
    document.getElementById('personaDetailsPanel').style.display = 'block';
    document.getElementById('activePersonaName').textContent = persona.faculty_name;

    // Update active state in list
    renderPersonaList();

    // Update style metrics
    updateStyleMetrics(persona.style_weights);

    // Render golden questions
    renderGoldenQuestions(persona.id);
}

function updateStyleMetrics(weights) {
    const rigor = document.getElementById('rigorProgress');
    const practice = document.getElementById('practiceProgress');
    const theory = document.getElementById('theoryProgress');

    if (weights) {
        rigor.style.width = `${(weights.rigor || 0) * 100}%`;
        practice.style.width = `${(weights.practice || 0) * 100}%`;
        theory.style.width = `${(weights.theory || 0) * 100}%`;
    } else {
        [rigor, practice, theory].forEach(p => p.style.width = '0%');
    }
}

async function renderGoldenQuestions(personaId) {
    const list = document.getElementById('goldenQuestionsList');
    list.innerHTML = '<p class="text-muted">Loading examples...</p>';

    try {
        const personas = await api.getFacultyPersonas();
        const persona = personas.find(p => p.id === personaId);
        console.log('Fresh persona data for questions:', persona);

        if (!persona || !persona.golden_questions || persona.golden_questions.length === 0) {
            list.innerHTML = '<p class="text-muted">No examples yet. Add some to enable analysis!</p>';
            return;
        }

        list.innerHTML = '';
        persona.golden_questions.forEach(q => {
            const div = document.createElement('div');
            div.className = 'golden-item';
            div.textContent = q.question_text.length > 100 ? q.question_text.substring(0, 100) + '...' : q.question_text;
            list.appendChild(div);
        });
    } catch (error) {
        list.innerHTML = '<p class="text-danger">Error loading examples.</p>';
    }
}

// Persona Form Handle
const personaForm = document.getElementById('personaForm');
if (personaForm) {
    personaForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nameInput = document.getElementById('newFacultyName');
        const name = nameInput.value.trim();

        try {
            const newPersona = await api.createPersona({ faculty_name: name });
            ui.showToast(`Persona for ${name} created!`, 'success');
            nameInput.value = '';
            await loadFacultyPersonas();
            selectPersona(newPersona);
        } catch (error) {
            ui.showToast(error.message, 'error');
        }
    });
}

// Golden Question Form Handle
const goldenForm = document.getElementById('goldenQuestionForm');
if (goldenForm) {
    goldenForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!currentPersonaId) return;

        const textInput = document.getElementById('goldenQuestionText');
        const text = textInput.value.trim();

        try {
            await api.addGoldenQuestion(currentPersonaId, { question_text: text, subject: "General" });
            ui.showToast('Golden question added!', 'success');
            textInput.value = '';
            renderGoldenQuestions(currentPersonaId);

            // Refresh main list to show profiled status change if any
            loadFacultyPersonas();
        } catch (error) {
            ui.showToast(error.message, 'error');
        }
    });
}

async function runStyleAnalysis() {
    if (!currentPersonaId) return;

    const btn = document.getElementById('analyzeBtn');
    const bText = btn.querySelector('.btn-text');
    const bLoader = btn.querySelector('.loader');

    ui.toggleLoader(btn, bText, bLoader, true, ["Reading questions...", "Detecting rigor...", "Profiling tone..."]);

    try {
        await api.analyzePersona(currentPersonaId);
        ui.showToast('Stylistic profile updated!', 'success');

        // Refresh and show new metrics
        await loadFacultyPersonas();
        const updated = allPersonas.find(p => p.id === currentPersonaId);
        if (updated) selectPersona(updated);

    } catch (error) {
        ui.showToast(error.message, 'error');
    } finally {
        ui.toggleLoader(btn, bText, bLoader, false);
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

// Load initial data
loadSubjects();
loadFacultyPersonas();
attachSubjectListeners();

// Tab switching
function switchTab(mode) {
    // Buttons
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    const btn = document.querySelector(`.tab-btn[onclick="switchTab('${mode}')"]`);
    if (btn) btn.classList.add('active');

    // Content
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    const target = document.getElementById(`${mode}Mode`);
    if (target) {
        target.classList.add('active');
        // Refresh personas if switching to faculty tab
        if (mode === 'faculty') {
            loadFacultyPersonas();
        }
    }
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
        course_outcome_ids: collectSelectedCOs('coList'),
        faculty_name: facultySelect.value || null
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

    // Add faculty name
    const facultyName = pdfFacultySelect.value;
    if (facultyName) {
        formData.append('faculty_name', facultyName);
    }

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

    // Check if subject and topic are selected
    if (!mSubjectSelect.value || !mTopicSelect.value) {
        ui.showToast('Please select both a subject and a topic', 'warning');
        return;
    }

    const selectedSubject = mSubjectSelect.options[mSubjectSelect.selectedIndex].dataset.subjectName;
    const selectedTopic = mTopicSelect.options[mTopicSelect.selectedIndex].dataset.topicName;
    const questionText = sunEditor.getContents();

    // Basic length validation (matching backend min_length: 10)
    // Strip HTML tags for length check
    const plainText = questionText.replace(/<[^>]*>/g, '').trim();
    if (plainText.length < 10) {
        ui.showToast('Question text must be at least 10 characters long', 'warning');
        return;
    }

    const formData = {
        subject: selectedSubject,
        topic: selectedTopic,
        bloom_level: document.getElementById('mBloomLevel').value,
        difficulty: document.getElementById('mDifficulty').value,
        marks: parseInt(document.getElementById('mMarks').value || 15),
        course_outcome_ids: collectSelectedCOs('mCoList'),
        question_text: questionText,
        faculty_name: mFacultySelect.value || null
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
        // Store for regeneration and editing
        questionsData[data.id] = data;

        const card = document.createElement('div');
        card.id = `card-${data.id}`;
        card.className = 'card question-display';
        card.style.marginTop = index === 0 ? '0' : '1.5rem';

        const coHtml = (data.course_outcomes && data.course_outcomes.length > 0)
            ? `<p><strong>Course Outcomes:</strong> <span class="co-code">${data.course_outcomes.map(co => co.outcome_code).join(', ')}</span></p>`
            : '';

        // Render Markdown content
        const renderedText = md.render(data.question_text);

        const facultyBadge = data.metadata.faculty
            ? `<span class="badge" style="background: var(--primary); border: 1px solid rgba(255,255,255,0.2)">👤 ${data.metadata.faculty} Style</span>`
            : '';

        card.innerHTML = `
            <div class="question-metadata no-print">
                <span class="badge status-badge" style="background: var(--secondary)">${data.status || 'GENERATED'}</span>
                ${facultyBadge}
                <span class="badge">${data.metadata.bloom_level}</span>
                <span class="badge">${data.metadata.difficulty}</span>
                <span class="badge">${data.metadata.marks} marks</span>
            </div>
            
            <div id="q-view-${data.id}">
                <div class="question-text printable-content" id="q-text-${data.id}">${renderedText}</div>
                <div class="question-meta-info">
                    <p><strong>Subject:</strong> ${data.metadata.subject}</p>
                    <p><strong>Topic:</strong> ${data.metadata.topic}</p>
                    ${coHtml}
                    <p class="no-print"><strong>Question ID:</strong> ${data.id}</p>
                </div>
                <div class="no-print" style="display: flex; gap: 1rem; margin-top: 1rem; flex-wrap: wrap;">
                    <button class="btn-secondary" onclick="copyQuestion(${data.id})">📋 Copy Raw</button>
                    <button class="btn-secondary" onclick="editQuestion(${data.id})">✏️ Edit</button>
                    <button class="btn-secondary btn-regenerate" onclick="regenerateQuestion(${data.id})">🔄 Regenerate</button>
                    <button class="btn-secondary" style="border: 1px solid var(--danger); color: var(--danger)" onclick="openCritiqueModal(${data.id})">👎 Critique</button>
                    <button class="btn-secondary" style="background: transparent; border: 1px solid var(--border);" onclick="window.open('${API_BASE_URL}/questions/${data.id}', '_blank')">🔗 View JSON</button>
                </div>
            </div>

            <div id="q-edit-${data.id}" style="display: none; margin-top: 1rem;">
                <label>Edit Question Content</label>
                <div style="border: 1px solid var(--primary); border-radius: 0.5rem; overflow: hidden; margin-bottom: 1rem;">
                    <textarea id="editor-${data.id}"></textarea>
                </div>
                <div style="display: flex; gap: 1rem;">
                    <button class="btn-primary" style="background: var(--success); color: white;" onclick="saveQuestion(${data.id})">💾 Save</button>
                    <button class="btn-secondary" style="background: var(--border); color: var(--text);" onclick="cancelEdit(${data.id})">❌ Cancel</button>
                </div>
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

// --- Editing Logic ---
async function editQuestion(id) {
    document.getElementById(`q-view-${id}`).style.display = 'none';
    document.getElementById(`q-edit-${id}`).style.display = 'block';

    if (!activeCardEditors[id]) {
        const question = questionsData[id];
        activeCardEditors[id] = window.SUNEDITOR.create(`editor-${id}`, {
            buttonList: [
                ['undo', 'redo'],
                ['bold', 'underline', 'italic', 'strike', 'subscript', 'superscript'],
                ['list', 'align'],
                ['math', 'image', 'table'],
                ['fullScreen', 'codeView']
            ],
            katex: window.katex,
            width: '100%',
            height: '200px',
            value: question.question_text
        });
    }
}

function cancelEdit(id) {
    document.getElementById(`q-view-${id}`).style.display = 'block';
    document.getElementById(`q-edit-${id}`).style.display = 'none';
}

async function saveQuestion(id) {
    const editor = activeCardEditors[id];
    let newText = editor.getContents();

    const plainText = newText.replace(/<[^>]*>/g, '').trim();
    if (plainText.length < 10) {
        ui.showToast('Question too short', 'warning');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/questions/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question_text: newText })
        });

        if (!response.ok) throw new Error('Failed to save changes');

        const updated = await response.json();
        questionsData[id] = updated;

        document.getElementById(`q-text-${id}`).innerHTML = md.render(updated.question_text);
        ui.showToast('Question updated!', 'success');
        cancelEdit(id);
    } catch (err) {
        ui.showToast(err.message, 'error');
    }
}

// --- Regeneration Logic ---
async function regenerateQuestion(id) {
    const data = questionsData[id];
    const btn = document.querySelector(`#card-${id} .btn-regenerate`);
    const originalText = btn.innerHTML;

    btn.disabled = true;
    btn.innerHTML = '🔄 Processing...';

    ui.showToast('Regenerating question...', 'process');

    const formData = {
        subject: data.metadata.subject,
        topic: data.metadata.topic,
        bloom_level: data.metadata.bloom_level,
        difficulty: data.metadata.difficulty,
        marks: data.metadata.marks,
        count: 1,
        course_outcome_ids: data.course_outcomes.map(co => co.id)
    };

    try {
        const response = await fetch(`${API_BASE_URL}/questions/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        if (!response.ok) throw new Error('Regeneration failed');

        const result = await response.json();
        const newQuestion = result[0];

        questionsData[newQuestion.id] = newQuestion;
        delete questionsData[id];
        delete activeCardEditors[id]; // clear old editor instance

        const card = document.getElementById(`card-${id}`);
        card.id = `card-${newQuestion.id}`;

        const coHtml = (newQuestion.course_outcomes && newQuestion.course_outcomes.length > 0)
            ? `<p><strong>Course Outcomes:</strong> <span class="co-code">${newQuestion.course_outcomes.map(co => co.outcome_code).join(', ')}</span></p>`
            : '';
        const renderedText = md.render(newQuestion.question_text);

        card.innerHTML = `
            <div class="question-metadata no-print">
                <span class="badge status-badge" style="background: var(--secondary)">${newQuestion.status || 'GENERATED'}</span>
                <span class="badge">${newQuestion.metadata.bloom_level}</span>
                <span class="badge">${newQuestion.metadata.difficulty}</span>
                <span class="badge">${newQuestion.metadata.marks} marks</span>
            </div>
            
            <div id="q-view-${newQuestion.id}">
                <div class="question-text printable-content" id="q-text-${newQuestion.id}">${renderedText}</div>
                <div class="question-meta-info">
                    <p><strong>Subject:</strong> ${newQuestion.metadata.subject}</p>
                    <p><strong>Topic:</strong> ${newQuestion.metadata.topic}</p>
                    ${coHtml}
                    <p class="no-print"><strong>Question ID:</strong> ${newQuestion.id}</p>
                </div>
                <div class="no-print" style="display: flex; gap: 1rem; margin-top: 1rem; flex-wrap: wrap;">
                    <button class="btn-secondary" onclick="copyQuestion(${newQuestion.id})">📋 Copy Raw</button>
                    <button class="btn-secondary" onclick="editQuestion(${newQuestion.id})">✏️ Edit</button>
                    <button class="btn-secondary btn-regenerate" onclick="regenerateQuestion(${newQuestion.id})">🔄 Regenerate</button>
                    <button class="btn-secondary" style="border: 1px solid var(--danger); color: var(--danger)" onclick="openCritiqueModal(${newQuestion.id})">👎 Critique</button>
                    <button class="btn-secondary" style="background: transparent; border: 1px solid var(--border);" onclick="window.open('${API_BASE_URL}/questions/${newQuestion.id}', '_blank')">🔗 View JSON</button>
                </div>
            </div>

            <div id="q-edit-${newQuestion.id}" style="display: none; margin-top: 1rem;">
                <label>Edit Question Content</label>
                <div style="border: 1px solid var(--primary); border-radius: 0.5rem; overflow: hidden; margin-bottom: 1rem;">
                    <textarea id="editor-${newQuestion.id}"></textarea>
                </div>
                <div style="display: flex; gap: 1rem;">
                    <button class="btn-primary" style="background: var(--success); color: white;" onclick="saveQuestion(${newQuestion.id})">💾 Save</button>
                    <button class="btn-secondary" style="background: var(--border); color: var(--text);" onclick="cancelEdit(${newQuestion.id})">❌ Cancel</button>
                </div>
            </div>
        `;

        ui.showToast('Question regenerated!', 'success');

    } catch (err) {
        ui.showToast(err.message, 'error');
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

// --- Dynamic UI Helpers ---
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

        // Remove 'previous' class after animation ends to prepare for next cycle
        setTimeout(() => {
            current.classList.remove('previous');
        }, 500);

        index = nextIndex;
    }, 2500);
}

document.addEventListener('DOMContentLoaded', () => {
    initRotatingText();
});

// --- Critique / Feedback Management ---
function openCritiqueModal(id) {
    const question = questionsData[id];
    if (!question) return;

    document.getElementById('critiqueQuestionId').value = id;
    document.getElementById('critiqueOriginalText').textContent = question.question_text;
    document.getElementById('critiqueCorrectedText').value = '';
    document.getElementById('critiqueReason').value = '';

    // Auto-select current faculty if one was used in generation
    const fSelect = document.getElementById('feedbackFacultyName');
    // We don't track which faculty generated which question in state yet, 
    // but we can try to find by name from data metadata
    if (question.metadata.faculty) {
        const option = Array.from(fSelect.options).find(o => o.textContent === question.metadata.faculty);
        if (option) fSelect.value = option.value;
    }

    document.getElementById('critiqueModal').style.display = 'block';
}

function closeCritiqueModal() {
    document.getElementById('critiqueModal').style.display = 'none';
}

// Close on outside click
document.getElementById('critiqueModal').onclick = function (e) {
    if (e.target.id === 'critiqueModal') closeCritiqueModal();
};

const critiqueForm = document.getElementById('critiqueForm');
if (critiqueForm) {
    critiqueForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('critiqueQuestionId').value;
        const personaId = document.getElementById('feedbackFacultyName').value;

        if (!personaId) {
            ui.showToast('Please select a persona to learn from this feedback', 'warning');
            return;
        }

        const data = {
            original_text: document.getElementById('critiqueOriginalText').textContent,
            corrected_text: document.getElementById('critiqueCorrectedText').value || "N/A",
            critique: document.getElementById('critiqueReason').value
        };

        try {
            await api.addFeedback(personaId, data);
            ui.showToast('Critique logged! Persona will learn from this.', 'success');
            closeCritiqueModal();
        } catch (error) {
            ui.showToast(error.message, 'error');
        }
    });
}

// Export functions to window for HTML accessibility
window.switchTab = switchTab;
window.toggleDropdown = toggleDropdown;
window.copyQuestion = copyQuestion;
window.exportResults = exportResults;
window.editQuestion = editQuestion;
window.saveQuestion = saveQuestion;
window.cancelEdit = cancelEdit;
window.regenerateQuestion = regenerateQuestion;
window.runStyleAnalysis = runStyleAnalysis;
window.selectPersona = selectPersona;
window.openCritiqueModal = openCritiqueModal;
window.closeCritiqueModal = closeCritiqueModal;

// Initialize on load
loadSubjects();
loadFacultyPersonas();
