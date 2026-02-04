const API_BASE_URL = 'http://localhost:8000/api/v1';

const form = document.getElementById('questionForm');
const generateBtn = document.getElementById('generateBtn');
const btnText = document.querySelector('.btn-text');
const loader = document.querySelector('.loader');
const resultSection = document.getElementById('resultSection');
const errorSection = document.getElementById('errorSection');

// Form submission
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Get form values
    const formData = {
        subject: document.getElementById('subject').value,
        topic: document.getElementById('topic').value,
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
