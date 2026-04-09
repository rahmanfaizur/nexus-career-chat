'use strict';

/**
 * Long-Term Memory (Bonus Feature)
 * ─────────────────────────────────────────────────────────────────────────────
 * Strategy: After each conversation turn, we ask the LLM to extract a
 * one-sentence factual summary about the user (e.g. their target role, their
 * current situation, their name). This fact is stored in a JSON file keyed by
 * sessionId. On subsequent turns, stored facts are prepended to the system
 * prompt so the bot "remembers" the user across sessions.
 *
 * File: memory/ltm.json
 * Shape: { [sessionId]: string[] }   (array of fact strings per session)
 * ─────────────────────────────────────────────────────────────────────────────
 */

const fs = require('fs');
const path = require('path');

const LTM_DIR = path.join(process.cwd(), 'memory');
const LTM_FILE = path.join(LTM_DIR, 'ltm.json');

/** Ensure the memory directory and file exist on first use. */
function ensureFile() {
    if (!fs.existsSync(LTM_DIR)) {
        fs.mkdirSync(LTM_DIR, { recursive: true });
    }
    if (!fs.existsSync(LTM_FILE)) {
        fs.writeFileSync(LTM_FILE, JSON.stringify({}), 'utf8');
    }
}

function readAll() {
    ensureFile();
    try {
        return JSON.parse(fs.readFileSync(LTM_FILE, 'utf8'));
    } catch {
        return {};
    }
}

function writeAll(data) {
    ensureFile();
    fs.writeFileSync(LTM_FILE, JSON.stringify(data, null, 2), 'utf8');
}

/**
 * Save a fact about the user for this session.
 * Keeps the last 5 facts per session to avoid unbounded growth.
 */
function saveFact(sessionId, fact) {
    if (!fact || fact.trim().length < 5) return; // skip trivial facts
    const data = readAll();
    if (!data[sessionId]) data[sessionId] = [];
    data[sessionId].push(fact.trim());
    // Keep only the most recent 5 facts
    if (data[sessionId].length > 5) {
        data[sessionId] = data[sessionId].slice(-5);
    }
    writeAll(data);
}

/**
 * Retrieve all stored facts for a session, formatted as a string block
 * ready to be injected into the system prompt.
 * Returns empty string if no facts exist.
 */
function getFacts(sessionId) {
    const data = readAll();
    const facts = data[sessionId];
    if (!facts || facts.length === 0) return '';

    return [
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        'LONG-TERM MEMORY (what you know about this user from past conversations):',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        ...facts.map((f, i) => `${i + 1}. ${f}`),
        'Use this context naturally in your replies. Do not announce that you remember it.',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    ].join('\n');
}

module.exports = { saveFact, getFacts };
