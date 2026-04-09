'use strict';

const axios = require('axios');

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama3-8b-8192';

/**
 * Send a message array to Groq and return the assistant's reply text.
 *
 * @param {Array<{role: string, content: string}>} messages - Full message array
 *   including system prompt and conversation history.
 * @param {number} [retries=1] - Number of retries on rate-limit (429).
 * @returns {Promise<string>} The assistant's reply content.
 */
async function callLLM(messages, retries = 1) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
        throw new Error('GROQ_API_KEY is not set. Copy .env.example to .env and add your key.');
    }

    try {
        const response = await axios.post(
            GROQ_API_URL,
            {
                model: MODEL,
                messages,
                temperature: 0.85,   // Some creativity, keeps personality vivid
                max_tokens: 512,
                stream: false,
            },
            {
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                timeout: 30000, // 30-second timeout
            }
        );

        const content = response.data?.choices?.[0]?.message?.content;
        if (!content) throw new Error('Empty response from Groq API');
        return content;

    } catch (err) {
        // Handle rate-limiting with a single retry after 1 second
        if (retries > 0 && err.response?.status === 429) {
            console.warn('[LLM] Rate limited by Groq. Retrying in 1s...');
            await new Promise((r) => setTimeout(r, 1000));
            return callLLM(messages, retries - 1);
        }

        // Wrap axios errors into cleaner messages
        if (err.response) {
            const status = err.response.status;
            const detail = err.response.data?.error?.message || 'Unknown Groq error';
            throw new Error(`Groq API error ${status}: ${detail}`);
        }

        if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') {
            throw new Error('Groq API request timed out. Please try again.');
        }

        throw err;
    }
}

/**
 * Extract a single factual sentence about the user from the last exchange.
 * Used by long-term memory to persist key user details.
 *
 * Returns null if nothing meaningful is learned.
 */
async function extractFact(userMessage, assistantReply) {
    const prompt = [
        {
            role: 'system',
            content:
                'You are a fact extractor. Given a short user message and an assistant reply, ' +
                'extract ONE concise factual sentence (max 20 words) about the user — such as their ' +
                'target job, current role, skills, or career situation. ' +
                'If nothing meaningful can be learned, reply with exactly: null',
        },
        {
            role: 'user',
            content: `User said: "${userMessage}"\nAssistant said: "${assistantReply.slice(0, 300)}"`,
        },
    ];

    try {
        const raw = await callLLM(prompt, 0);
        if (!raw || raw.trim().toLowerCase() === 'null') return null;
        return raw.trim();
    } catch {
        // Fact extraction is best-effort; never crash the main flow
        return null;
    }
}

module.exports = { callLLM, extractFact };
