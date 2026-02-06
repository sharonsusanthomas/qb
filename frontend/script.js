const API_BASE_URL = 'http://localhost:8000/api/v1';

const form = document.getElementById('questionForm');
const generateBtn = document.getElementById('generateBtn');
const btnText = document.querySelector('.btn-text');
const loader = document.querySelector('.loader');
const resultSection = document.getElementById('resultSection');
const errorSection = document.getElementById('errorSection');

const subjectSelect = document.getElementById('subject');
const topicSelect = document.getElementById('topic');

// Load subjects on page load
async function loadSubjects() {
    try {
        const response = await fetch(`${API_BASE_URL}/metadata/subjects`);
        const subjects = await response.json();

        subjectSelect.innerHTML = '<option value="">Select Subject</option>';
        subjects.forEach(subject => {
            const option = document.createElement('option');
            option.value = subject.id;
            option.textContent = `${subject.course_code} - ${subject.subject_name}`;
            option.dataset.subjectName = subject.subject_name;
            subjectSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Failed to load subjects:', error);
        subjectSelect.innerHTML = '<option value="">Failed to load subjects</option>';
    }
}

// Load topics when subject is selected
async function loadTopics(subjectId) {
    topicSelect.disabled = true;
    topicSelect.innerHTML = '<option value="">Loading topics...</option>';

    try {
        const response = await fetch(`${API_BASE_URL}/metadata/subjects/${subjectId}/topics`);
        const topics = await response.json();

        topicSelect.innerHTML = '<option value="">Select Topic</option>';
        topics.forEach(topic => {
            const option = document.createElement('option');
            option.value = topic.id;
            option.textContent = topic.topic_name;
            option.dataset.topicName = topic.topic_name;
            topicSelect.appendChild(option);
        });
        topicSelect.disabled = false;
    } catch (error) {
        console.error('Failed to load topics:', error);
        topicSelect.innerHTML = '<option value="">Failed to load topics</option>';
    }
}

// Subject change handler
subjectSelect.addEventListener('change', (e) => {
    const subjectId = e.target.value;
    if (subjectId) {
        loadTopics(subjectId);
    } else {
        topicSelect.disabled = true;
        topicSelect.innerHTML = '<option value="">Select a subject first</option>';
    }
});

// Load subjects on page load
loadSubjects();

// Tab switching
function switchTab(mode) {
    // Buttons
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`.tab-btn[onclick="switchTab('${mode}')"]`).classList.add('active');

    // Content
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(`${mode}Mode`).classList.add('active');
}

// Manual Form submission
const manualForm = document.getElementById('manualForm');
const manualSaveBtn = document.getElementById('manualSaveBtn');
const manualBtnText = manualSaveBtn.querySelector('.btn-text');
const manualLoader = manualSaveBtn.querySelector('.loader');

manualForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = {
        subject: document.getElementById('mSubject').value,
        topic: document.getElementById('mTopic').value,
        bloom_level: document.getElementById('mBloomLevel').value,
        difficulty: document.getElementById('mDifficulty').value,
        marks: parseInt(document.getElementById('mMarks').value),
        question_text: document.getElementById('mQuestionText').value
    };

    await handleGeneration(`${API_BASE_URL}/questions/manual`, formData, manualSaveBtn, manualBtnText, manualLoader, false);
});

// Standard Form submission
form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Get selected option elements
    const selectedSubject = subjectSelect.options[subjectSelect.selectedIndex];
    const selectedTopic = topicSelect.options[topicSelect.selectedIndex];

    // Get form values
    const formData = {
        subject: selectedSubject.dataset.subjectName,
        topic: selectedTopic.dataset.topicName,
        bloom_level: document.getElementById('bloomLevel').value,
        difficulty: document.getElementById('difficulty').value,
        marks: parseInt(document.getElementById('marks').value)
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

    const formData = new FormData();
    formData.append('file', file);
    formData.append('subject', document.getElementById('pdfSubject').value);
    formData.append('topic', document.getElementById('pdfTopic').value);
    formData.append('bloom_level', document.getElementById('pdfBloomLevel').value);
    formData.append('difficulty', document.getElementById('pdfDifficulty').value);
    formData.append('marks', document.getElementById('pdfMarks').value);

    // Add custom prompt if exists
    const customPrompt = document.getElementById('customPrompt').value;
    if (customPrompt) {
        formData.append('custom_prompt', customPrompt);
    } else {
        formData.append('custom_prompt', '');
    }

    await handleGeneration(`${API_BASE_URL}/generate-from-notes/`, formData, pdfGenerateBtn, pdfBtnText, pdfLoader, true);
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
