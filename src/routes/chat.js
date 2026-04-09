'use strict';

const express = require('express');
const router = express.Router();

const { SYSTEM_PROMPT } = require('../prompt/systemPrompt');
const { addMessage, getHistory } = require('../memory/sessionMemory');
const { saveFact, getFacts } = require('../memory/longTermMemory');
const { callLLM, extractFact } = require('../services/llmService');

/**
 * POST /api/chat
 *
 * Request body:
 *   {
 *     "sessionId": "string",   // Unique identifier for this conversation session
 *     "message":   "string"    // The user's message
 *   }
 *
 * Response:
 *   {
 *     "reply":     "string",   // The bot's response
 *     "sessionId": "string"    // Echo of the session ID for convenience
 *   }
 */
router.post('/chat', async (req, res) => {
    // ── Input Validation ───────────────────────────────────────────────────────
    const { sessionId, message } = req.body || {};

    if (!sessionId || typeof sessionId !== 'string' || sessionId.trim().length === 0) {
        return res.status(400).json({
            error: 'Missing or invalid field: "sessionId". Provide a non-empty string.',
        });
    }

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
        return res.status(400).json({
            error: 'Missing or invalid field: "message". Provide a non-empty string.',
        });
    }

    const cleanSession = sessionId.trim();
    const cleanMessage = message.trim();

    try {
        // ── Build System Prompt (inject long-term memory if available) ─────────
        const ltmFacts = getFacts(cleanSession);
        const systemContent = ltmFacts
            ? `${SYSTEM_PROMPT}\n\n${ltmFacts}`
            : SYSTEM_PROMPT;

        // ── Retrieve Session History ───────────────────────────────────────────
        const history = getHistory(cleanSession);

        // ── Assemble Full Message Array ────────────────────────────────────────
        const messages = [
            { role: 'system', content: systemContent },
            ...history,
            { role: 'user', content: cleanMessage },
        ];

        // ── Call LLM ──────────────────────────────────────────────────────────
        const reply = await callLLM(messages);

        // ── Persist to Session Memory ─────────────────────────────────────────
        addMessage(cleanSession, 'user', cleanMessage);
        addMessage(cleanSession, 'assistant', reply);

        // ── Background: Extract & Save Long-Term Fact (non-blocking) ─────────
        extractFact(cleanMessage, reply)
            .then((fact) => {
                if (fact) saveFact(cleanSession, fact);
            })
            .catch(() => { }); // Best-effort; never crash the response

        // ── Respond ───────────────────────────────────────────────────────────
        return res.status(200).json({ sessionId: cleanSession, reply });

    } catch (err) {
        console.error('[/api/chat] Error:', err.message);

        // Distinguish API errors from unexpected errors
        if (err.message.includes('Groq API error') || err.message.includes('timed out')) {
            return res.status(503).json({
                error: 'The LLM service is temporarily unavailable. Please try again shortly.',
                detail: err.message,
            });
        }

        if (err.message.includes('GROQ_API_KEY')) {
            return res.status(500).json({
                error: 'Server misconfiguration: GROQ_API_KEY is not set.',
            });
        }

        return res.status(500).json({ error: 'Unexpected server error. Check server logs.' });
    }
});

module.exports = router;
