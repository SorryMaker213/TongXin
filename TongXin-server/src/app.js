const express = require('express');
const cors = require('cors');
const routes = require('./routes'); // requiring index.js from routes

const app = express();

app.use(cors());
app.use(express.json());

// Load all API routes
app.use('/api', routes);

module.exports = app;
