/**
 * API Interaction Module
 */
import { API_BASE_URL } from './config.js';

export async function fetchWithTimeout(resource, options = {}) {
    const { timeout = 30000 } = options;

    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(resource, {
        ...options,
        signal: controller.signal
    });
    clearTimeout(id);

    return response;
}

export async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetchWithTimeout(url, options);

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail || `Request failed with status ${response.status}`);
    }

    return await response.json();
}

export async function getSubjects() {
    return await apiRequest('/metadata/subjects');
}

export async function getTopics(subjectId) {
    return await apiRequest(`/metadata/subjects/${subjectId}/topics`);
}

export async function getCourseOutcomes(subjectId) {
    return await apiRequest(`/metadata/subjects/${subjectId}/course_outcomes`);
}
