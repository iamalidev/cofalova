import express from 'express';
import multer from 'multer';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const dataFile = path.join(__dirname, 'data.json');

// Setup multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, 'public')); // Save directly to Vite's public folder
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'upload-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// Read data
const readData = () => JSON.parse(fs.readFileSync(dataFile, 'utf8'));
const writeData = (data) => fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));

// Auth middleware (Simple hardcoded token)
const authenticate = (req, res, next) => {
  const token = req.headers.authorization;
  if (token === 'Bearer super-secret-admin-token-123') {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
};

// Login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'admin' && password === 'admin123') {
    res.json({ token: 'super-secret-admin-token-123' });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// Get Menu Data
app.get('/api/menu', (req, res) => {
  try {
    const data = readData();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read data' });
  }
});

// Update Menu Data (Add Category or Dish)
app.post('/api/menu', authenticate, (req, res) => {
  try {
    const newData = req.body;
    writeData(newData);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save data' });
  }
});

// Upload image
app.post('/api/upload', authenticate, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  // Return the path that works in frontend (relative to public)
  res.json({ url: '/' + req.file.filename });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`API Server running on http://localhost:${PORT}`);
});
