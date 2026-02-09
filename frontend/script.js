const API_BASE_URL = 'http://localhost:8000/api/v1';

const form = document.getElementById('questionForm');
const generateBtn = document.getElementById('generateBtn');
const btnText = document.querySelector('.btn-text');
const loader = document.querySelector('.loader');
const resultSection = document.getElementById('resultSection');
const errorSection = document.getElementById('errorSection');

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
    try {
        const response = await fetch(`${API_BASE_URL}/metadata/subjects`);
        const subjects = await response.json();
        populateSubjectSelects(subjects);
    } catch (error) {
        console.error('Failed to load subjects:', error);
        [subjectSelect, pdfSubjectSelect, mSubjectSelect].forEach(select => {
            select.innerHTML = '<option value="">Failed to load subjects</option>';
        });
    }
}

// Load topics helper
async function loadTopics(subjectId, targetTopicSelect) {
    if (!targetTopicSelect) return;

    targetTopicSelect.disabled = true;
    targetTopicSelect.innerHTML = '<option value="">Loading topics...</option>';

    try {
        const response = await fetch(`${API_BASE_URL}/metadata/subjects/${subjectId}/topics`);
        const topics = await response.json();

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
        const response = await fetch(`${API_BASE_URL}/metadata/subjects/${subjectId}/course_outcomes`);
        const outcomes = await response.json();

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
        console.error('Failed to load COs:', error);
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
        course_outcome_ids: collectSelectedCOs('coList')
    };

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

    const selectedCOs = collectSelectedCOs('pdfCoList');
    selectedCOs.forEach(id => formData.append('course_outcome_ids', id));

    // Add custom prompt if exists
    const customPrompt = document.getElementById('customPrompt').value;
    if (customPrompt) {
        formData.append('custom_prompt', customPrompt);
    } else {
        formData.append('custom_prompt', '');
    }

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
        marks: parseInt(document.getElementById('mMarks').value),
        difficulty: document.getElementById('mDifficulty').value,
        marks: parseInt(document.getElementById('mMarks').value),
        course_outcome_ids: collectSelectedCOs('mCoList'),
        question_text: document.getElementById('mQuestionText').value
    };
    await handleGeneration(`${API_BASE_URL}/questions/manual`, formData, manualSaveBtn, manualBtnText, manualLoader, false);
});

async function handleGeneration(url, data, btn, btnTextElem, loaderElem, isMultipart) {
    // Show loading state
    btn.disabled = true;
    btnTextElem.style.display = 'none';
    loaderElem.style.display = 'block';
    resultSection.style.display = 'none';
    errorSection.style.display = 'none';

    try {
        const options = {
            method: 'POST',
            body: isMultipart ? data : JSON.stringify(data)
        };

        // Only add Content-Type for JSON, fetch adds multipart headers automatically
        if (!isMultipart) {
            options.headers = {
                'Content-Type': 'application/json'
            };
        }

        const response = await fetch(url, options);

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to generate question');
        }

        const result = await response.json();
        displayQuestion(result);

    } catch (error) {
        displayError(error.message);
    } finally {
        // Reset button state
        btn.disabled = false;
        btnTextElem.style.display = 'inline';
        loaderElem.style.display = 'none';
    }
}

function displayQuestion(data) {
    // Show result section
    resultSection.style.display = 'block';

    // Populate data
    document.getElementById('questionText').textContent = data.question_text;
    document.getElementById('resultBloom').textContent = data.metadata.bloom_level;
    document.getElementById('resultDifficulty').textContent = data.metadata.difficulty;
    document.getElementById('resultMarks').textContent = `${data.metadata.marks} marks`;
    document.getElementById('resultSubject').textContent = data.metadata.subject;
    document.getElementById('resultTopic').textContent = data.metadata.topic;
    document.getElementById('resultId').textContent = data.id;

    // Display Course Outcomes if present
    const coDisplay = document.getElementById('resultCos');
    if (data.course_outcomes && data.course_outcomes.length > 0) {
        if (coDisplay) {
            const coText = data.course_outcomes.map(co => co.outcome_code).join(', ');
            coDisplay.textContent = coText;
            document.getElementById('resultCoContainer').style.display = 'block';
        }
    } else {
        if (coDisplay) {
            document.getElementById('resultCoContainer').style.display = 'none';
        }
    }

    // Scroll to result
    resultSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function displayError(message) {
    errorSection.style.display = 'block';
    document.getElementById('errorMessage').textContent = message;
    errorSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function copyQuestion() {
    const questionText = document.getElementById('questionText').textContent;
    const metadata = `Subject: ${document.getElementById('resultSubject').textContent}\n` +
        `Topic: ${document.getElementById('resultTopic').textContent}\n` +
        `Bloom's Level: ${document.getElementById('resultBloom').textContent}\n` +
        `Difficulty: ${document.getElementById('resultDifficulty').textContent}\n` +
        `Marks: ${document.getElementById('resultMarks').textContent}\n\n` +
        `Question:\n${questionText}`;

    navigator.clipboard.writeText(metadata).then(() => {
        // Show feedback
        const btn = event.target;
        const originalText = btn.textContent;
        btn.textContent = '✓ Copied!';
        btn.style.background = 'var(--success)';

        setTimeout(() => {
            btn.textContent = originalText;
            btn.style.background = '';
        }, 2000);
    });
}
