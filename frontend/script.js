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

// Form submission
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

    // Show loading state
    generateBtn.disabled = true;
    btnText.style.display = 'none';
    loader.style.display = 'block';
    resultSection.style.display = 'none';
    errorSection.style.display = 'none';

    try {
        const response = await fetch(`${API_BASE_URL}/questions/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to generate question');
        }

        const data = await response.json();
        displayQuestion(data);

    } catch (error) {
        displayError(error.message);
    } finally {
        // Reset button state
        generateBtn.disabled = false;
        btnText.style.display = 'inline';
        loader.style.display = 'none';
    }
});

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
