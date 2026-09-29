const express = require('express');
const cors = require('cors');
const path = require('path');
const authRoutes = require('./routes/auth.routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN || '*' }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
