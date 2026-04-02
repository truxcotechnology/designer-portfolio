const express = require('express');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const app = express();
// const PORT = 5000;

// ==================== MIDDLEWARE ====================
// 1️⃣ Storage must be declared first
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const type = req.query.type || "logos"; 
    const uploadDir = path.join(__dirname, "public", "uploads", type);

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

// Serve static frontend assets
app.use('/css', express.static(path.join(__dirname, 'public', 'css')));
app.use('/js', express.static(path.join(__dirname, 'public', 'js')));
app.use("/uploads", express.static(path.join(__dirname, "public", "uploads")));

// Parse JSON & URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/uploads/list", (req, res) => {
  const uploadsDir = path.join(__dirname,'public', '/uploads');

  const result = [];

  fs.readdir(uploadsDir, (err, folders) => {
    if (err) return res.status(500).json({ success: false, message: "Failed to read uploads folder" });

    folders.forEach(folder => {
      const folderPath = path.join(uploadsDir, folder);
      if (fs.statSync(folderPath).isDirectory()) {
        const files = fs.readdirSync(folderPath)
          .filter(f => /\.(jpg|jpeg|png|svg|webp|pdf)$/i.test(f))
          .map(f => `/uploads/${folder}/${f}`); 
        result.push(...files);
      }
    });

    res.json(result);
  });
});

// Delete file API
app.delete('/uploads/:type/:filename', (req, res) => {
  try {
    const { type, filename } = req.params;

    if (!type || !filename) {
      return res.status(400).json({ success: false, message: 'Missing parameters' });
    }

    const filePath = path.join(__dirname, 'public', 'uploads', type, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }

    fs.unlinkSync(filePath);

    res.json({
      success: true,
      message: `${filename} deleted successfully`,
    });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ success: false, message: 'Delete failed' });
  }
});

// Return list of banners
app.get('/uploads/banners', (req, res) => {
    const bannersDir = path.join(__dirname, 'public', 'uploads/banners');
    fs.readdir(bannersDir, (err, files) => {
        if (err) return res.status(500).json([]);
        res.json(files);
    });
});

// Return list of designs
app.get('/uploads/designs', (req, res) => {
    const designsDir = path.join(__dirname, 'public', 'uploads/designs');
    fs.readdir(designsDir, (err, files) => {
        if (err) return res.status(500).json([]);
        res.json(files);
    });
});

app.get('/uploads/prints', (req, res) => {
    const printsDir = path.join(__dirname, 'public', 'uploads/prints');
    fs.readdir(printsDir, (err, files) => {
        if (err) return res.status(500).json([]);
        res.json(files);
    });
});
const upload = multer({ storage });

app.post("/upload", upload.single("file"), (req, res) => {
  try {
    const file = req.file;
    const type = req.query.type || "logos"; 
    const fileUrl = `/uploads/${type}/${file.filename}`;

    res.json({
      success: true,
      message: `${type} uploaded successfully!`,
      data: { type, url: fileUrl },
    });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

// Get list of files
app.get('/uploads/:type', (req, res) => {
  try {
    const type = req.params.type; // logos, banners, or designs
    if (!type) return res.status(400).json({ error: 'Missing type' });

    const folder = path.join(__dirname, 'public', 'uploads', type);

    if (!fs.existsSync(folder)) return res.json([]);

    const files = fs.readdirSync(folder);
    const urls = files.map(file => `/uploads/${type}/${file}`);
    res.json(urls);
  } catch (err) {
    console.error('Error reading uploads folder:', err);
    res.status(500).json({ error: 'Failed to load uploads' });
  }
});

// Serve main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ==================== AUTHENTICATION ====================
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  // ✅ Admin login (FULLY STATIC)
  if (username === "admin" && password === "admin@123") {
    return res.json({ success: true, role: "admin" });
  }

  // ✅ User login (from file)
  const savedUsername = getUsername();
  const savedPassword = getPassword();

  if (username === savedUsername && password === savedPassword) {
    return res.json({ success: true, role: "user" });
  }

  res.json({ success: false });
});

// ==================== CREDENTIALS MANAGEMENT ====================
function generateUsername() {
  return "user_" + Math.floor(Math.random() * 100000);
}

function generatePassword(length = 10) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// Get username
function getUsername() {
  if (!fs.existsSync("username.txt")) {
    fs.writeFileSync("username.txt", "user_12345");
  }
  return fs.readFileSync("username.txt", "utf-8").trim();
}

// Save username
function setUsername(newUsername) {
  fs.writeFileSync("username.txt", newUsername);
}

// Get password
function getPassword() {
  if (!fs.existsSync("password.txt")) {
    fs.writeFileSync("password.txt", "admin@123");
  }
  return fs.readFileSync("password.txt", "utf-8").trim();
}

// Save password
function setPassword(newPassword) {
  fs.writeFileSync("password.txt", newPassword);
}

// ==================== EMAIL SERVICE ====================
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "prerna.truxco@gmail.com",
    pass: "yjlj rwiv czkg fhbt",
  },
});

async function sendCredentials(email, username, password) {
  await transporter.sendMail({
    from: "abb@gmail.com",
    to: email,
    subject: "Your Login Credentials",
    text: `
Username: ${username}
Password: ${password}
    `,
  });
}

// ==================== CRON JOBS ====================
const cron = require("node-cron");

cron.schedule("0 0 */3 * *", async () => {
  const newUsername = generateUsername();
  const newPassword = generatePassword();

  setUsername(newUsername);
  setPassword(newPassword);

  await sendCredentials("kamal@truxco.us", newUsername, newPassword);

  console.log("Username & Password updated & emailed");
});

// ==================== ADMIN ROUTES ====================
app.post("/admin/change-password", async (req, res) => {
  try {
    const newUsername = generateUsername();
    const newPassword = generatePassword();

    setUsername(newUsername);
    setPassword(newPassword);

    await sendCredentials("thakur2004prerna@gmail.com", newUsername, newPassword);

    res.json({
      success: true,
      message: "New username & password sent to email",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

app.post("/signup", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.json({ success: false, message: "Email required" });
  }

  const username = generateUsername();
  const password = generatePassword();

  setUsername(username);
  setPassword(password);

  await sendCredentials(email, username, password);

  res.json({
    success: true,
    message: "Credentials sent to email",
  });
});

// Start server
// app.listen(PORT, () => {
//   console.log(`Server running on http://localhost:${PORT}`);
// });
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
