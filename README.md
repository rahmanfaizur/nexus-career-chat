# career-bot

A Node.js chatbot with a very specific personality. It's genuinely good at career stuff (resumes, interviews, salary negotiation, job hunting) and hilariously confused about everything else. Built as part of an assignment — powered by Groq's free LLM API.

---

## Getting started

You'll need Node.js (v18+) and a free Groq API key. Get one at [console.groq.com](https://console.groq.com) — no credit card, takes 2 minutes.

```bash
git clone https://github.com/your-username/career-bot
cd career-bot
npm install
cp .env.example .env
# open .env and paste your Groq key
npm start
```

Server runs at `http://localhost:3000`.

---

## How to use it (Postman)

Only one endpoint:

```
POST http://localhost:3000/api/chat
Content-Type: application/json
```

Body:

```json
{
  "sessionId": "any-string-you-want",
  "message": "How do I prepare for a technical interview?"
}
```

The `sessionId` is how the bot keeps track of your conversation — use the same one across requests and it'll remember what you talked about. Start a new one and it's a fresh session.

Response looks like:

```json
{
  "sessionId": "any-string-you-want",
  "reply": "🎯 Technical interviews are a skill you can absolutely learn ||| the most important thing is to practice explaining your thinking out loud, not just getting the right answer..."
}
```

**Things to try:**
- Ask a career question → smart, structured, actually helpful
- Ask something random like "what is pizza" → deeply confused, somehow charming
- Send a few messages then ask "what did I first say?" → it remembers
- Just keep chatting — the personality has a few surprises built in

---

## About the personality

The bot has six rules baked into the system prompt:

1. It inserts `|||` at natural pauses in sentences — like a breath or a dramatic beat
2. Every reply starts with exactly one emoji matching the tone
3. Career topics get thoughtful, expert answers. Everything else gets goldfish-level confusion
4. Very rarely, it glitches into an alien language mid-sentence, then continues like nothing happened
5. Similarly rare: a brief slip into Tolkien Elvish
6. Occasionally, mid career advice, it'll casually mention the ongoing elf-alien conflict as background news

The prompt is structured with visual dividers between each rule and includes concrete examples. The most important constraints (emoji count, `|||` usage) are also restated at the bottom of the prompt to reinforce them — LLMs are more reliable when critical rules are repeated.

---

## Memory

**Session memory** keeps the last 10 messages per `sessionId` in memory. It's a simple sliding window — older messages get dropped once the limit is hit. Restarting the server resets it.

**Long-term memory (bonus)** persists facts across server restarts. After each turn, it runs a quick background call to extract one sentence summarising something useful about the user (their target role, current situation, etc.) and saves it to `memory/ltm.json`. Next time you use the same `sessionId`, those facts get quietly injected into the system prompt. The bot uses them naturally — it doesn't announce "I remember you said...".

---

## Environment variables

```
GROQ_API_KEY=   # required
PORT=3000       # optional, defaults to 3000
MEMORY_WINDOW=10  # optional, how many messages to keep in session
```
