'use strict';

/**
 * Session Memory — in-memory sliding window.
 *
 * Stores up to MEMORY_WINDOW messages per sessionId.
 * Older messages beyond the window are dropped automatically.
 *
 * Structure per session: Array of { role: 'user'|'assistant', content: string }
 */

const WINDOW_SIZE = parseInt(process.env.MEMORY_WINDOW || '10', 10);

// Map<sessionId, messages[]>
const sessions = new Map();

/**
 * Add a message to a session's history.
 * Trims the window to the last WINDOW_SIZE messages.
 */
function addMessage(sessionId, role, content) {
    if (!sessions.has(sessionId)) {
        sessions.set(sessionId, []);
    }

    const history = sessions.get(sessionId);
    history.push({ role, content });

    // Trim to sliding window
    if (history.length > WINDOW_SIZE) {
        history.splice(0, history.length - WINDOW_SIZE);
    }
}

/**
 * Retrieve full message history for a session.
 * Returns empty array if session doesn't exist yet.
 */
function getHistory(sessionId) {
    return sessions.get(sessionId) || [];
}

/**
 * Delete a session entirely (optional cleanup).
 */
function clearSession(sessionId) {
    sessions.delete(sessionId);
}

module.exports = { addMessage, getHistory, clearSession };
