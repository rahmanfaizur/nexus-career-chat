'use strict';
require('dotenv').config();
const express = require('express');
const chatRouter = require('./routes/chat');

const app = express();
app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Career Chatbot is running. POST /api/chat to talk.' });
});

app.use('/api', chatRouter);

// 404 catch-all
app.use((req, res) => {
  res.status(404).json({ error: 'Not found. Use POST /api/chat' });
});

// Global error handler
app.use((err, req, res, _next) => {
  console.error('[Error]', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Career Chatbot server running on http://localhost:${PORT}`);
});
