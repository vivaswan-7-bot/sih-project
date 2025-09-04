require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoose = require('mongoose');
const path = require("path");

const app = express();

// Core middleware
app.use(cors());
app.use(helmet());
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

// Health route
app.get('/', (req, res) => res.json({ ok: true, service: 'INCOIS Social API' }));

// Feature routes
app.use('/auth', require('./src/routes/auth'));
app.use('/posts', require('./src/routes/posts'));
app.use('/dashboard', require('./src/routes/dashboard'));
app.use('/users', require('./src/routes/users'));

// DB connect + start server
const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/incois_social';

mongoose.connect(MONGO_URI)
  .then(() => {
    app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
  })
  .catch(err => {
    console.error('Mongo connection error:', err);
    process.exit(1);
  });

  app.use("/uploads", express.static(path.join(__dirname, "uploads")));