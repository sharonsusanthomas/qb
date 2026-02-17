/**
 * UI Utility Module
 */

export function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = {
        success: '✅',
        error: '❌',
        info: 'ℹ️',
        warning: '⚠️'
    };

    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || '📝'}</span>
        <span class="toast-message">${message}</span>
    `;

    container.appendChild(toast);

    // Fade out and remove
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 500);
    }, 4000);
}

let loaderInterval;

export function toggleLoader(btn, btnTextElem, loaderElem, show, statusMessages = []) {
    btn.disabled = show;
    if (btnTextElem) btnTextElem.style.display = show ? 'none' : 'inline';
    if (loaderElem) loaderElem.style.display = show ? 'block' : 'none';

    if (show && statusMessages.length > 0 && btnTextElem) {
        let msgIndex = 0;
        btnTextElem.style.display = 'inline';
        btnTextElem.style.fontSize = '0.9rem';
        btnTextElem.style.opacity = '0.8';
        btnTextElem.textContent = statusMessages[msgIndex];

        loaderInterval = setInterval(() => {
            msgIndex = (msgIndex + 1) % statusMessages.length;
            btnTextElem.style.opacity = '0';
            setTimeout(() => {
                btnTextElem.textContent = statusMessages[msgIndex];
                btnTextElem.style.opacity = '0.8';
            }, 200);
        }, 2500);
    } else {
        clearInterval(loaderInterval);
        if (btnTextElem) {
            btnTextElem.style.fontSize = '';
            btnTextElem.style.opacity = '';
        }
    }
}

export function displayError(message, errorSection, errorTextElem) {
    if (!errorSection || !errorTextElem) return;
    errorSection.style.display = 'block';
    errorTextElem.textContent = message;
    errorSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
