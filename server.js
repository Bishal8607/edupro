/**
 * EduPro Backend Server
 * Full REST API for the EduPro learning platform
 * Routes: Auth, Courses, Live Classes, PDF Notes, Orders, Dashboard
 */

const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'edupro_secret_key_2024';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/edupro';

// ─── MIDDLEWARE ───────────────────────────────────────
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(__dirname)); // Serve frontend

// Create uploads directory if not exists
['uploads', 'uploads/pdfs', 'uploads/thumbnails'].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// ─── FILE UPLOAD CONFIG ───────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dest = file.mimetype === 'application/pdf' ? 'uploads/pdfs' : 'uploads/thumbnails';
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).substr(2,9)}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) cb(null, true);
    else cb(new Error('Only PDF and image files are allowed'));
  }
});

// ─── MONGOOSE CONNECTION ──────────────────────────────
mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.log('⚠️  MongoDB not connected, running with in-memory data:', err.message));

// ─── SCHEMAS ─────────────────────────────────────────

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, minlength: 6 },
  role: { type: String, enum: ['student', 'admin', 'instructor'], default: 'student' },
  avatar: { type: String },
  enrolledCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
  purchasedNotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Note' }],
  registeredClasses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'LiveClass' }],
  createdAt: { type: Date, default: Date.now }
});

const courseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true },
  emoji: { type: String, default: '📚' },
  thumb: { type: String, default: 'thumb-blue' },
  price: { type: Number, required: true },
  oldPrice: { type: Number },
  rating: { type: Number, default: 4.5 },
  students: { type: Number, default: 0 },
  duration: { type: String, default: '10 hrs' },
  lessons: { type: Number, default: 0 },
  instructor: { type: String, required: true },
  instructorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  thumbnail: { type: String },
  includes: [String],
  curriculum: [{
    title: String,
    lessons: [String]
  }],
  isPublished: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

const liveClassSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  teacher: { type: String, required: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  date: { type: String, required: true },
  time: { type: String, required: true },
  duration: { type: Number, default: 60 }, // minutes
  price: { type: Number, default: 0 },
  link: { type: String },
  status: { type: String, enum: ['live', 'upcoming', 'recorded', 'cancelled'], default: 'upcoming' },
  registered: { type: Number, default: 0 },
  maxStudents: { type: Number, default: 500 },
  recording: { type: String },
  createdAt: { type: Date, default: Date.now }
});

const noteSchema = new mongoose.Schema({
  title: { type: String, required: true },
  subject: { type: String, required: true },
  emoji: { type: String, default: '📄' },
  pages: { type: Number, default: 1 },
  price: { type: Number, required: true },
  filePath: { type: String },
  downloads: { type: Number, default: 0 },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [{
    itemId: mongoose.Schema.Types.ObjectId,
    type: { type: String, enum: ['course', 'live', 'note'] },
    name: String,
    price: Number
  }],
  total: { type: Number, required: true },
  paymentMethod: { type: String },
  paymentStatus: { type: String, enum: ['pending', 'success', 'failed'], default: 'pending' },
  transactionId: { type: String },
  createdAt: { type: Date, default: Date.now }
});

// Models
let User, Course, LiveClass, Note, Order;
try {
  User = mongoose.model('User');
  Course = mongoose.model('Course');
  LiveClass = mongoose.model('LiveClass');
  Note = mongoose.model('Note');
  Order = mongoose.model('Order');
} catch {
  User = mongoose.model('User', userSchema);
  Course = mongoose.model('Course', courseSchema);
  LiveClass = mongoose.model('LiveClass', liveClassSchema);
  Note = mongoose.model('Note', noteSchema);
  Order = mongoose.model('Order', orderSchema);
}

// ─── IN-MEMORY FALLBACK ───────────────────────────────
// Used when MongoDB is not available
const inMemory = {
  users: [
    { _id: 'u1', name: 'Admin User', email: 'admin@edupro.com', password: bcrypt.hashSync('admin123', 10), role: 'admin', enrolledCourses: [], purchasedNotes: [] },
    { _id: 'u2', name: 'Test Student', email: 'student@edupro.com', password: bcrypt.hashSync('student123', 10), role: 'student', enrolledCourses: ['c1','c2'], purchasedNotes: ['n1'] }
  ],
  courses: [],
  liveClasses: [],
  notes: [],
  orders: []
};
let useMemory = false;
mongoose.connection.on('error', () => { useMemory = true; });
mongoose.connection.once('open', () => { useMemory = false; });

// ─── AUTH MIDDLEWARE ──────────────────────────────────
const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
};

const adminAuth = (req, res, next) => {
  auth(req, res, () => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
    next();
  });
};

// ─── HELPER ──────────────────────────────────────────
const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function findInMemory(collection, query = {}) {
  return inMemory[collection].filter(item => {
    return Object.entries(query).every(([k, v]) => item[k] == v);
  });
}

// ═══════════════════════════════════════════════════
// AUTH ROUTES
// ═══════════════════════════════════════════════════
const authRouter = express.Router();

// POST /api/auth/register
authRouter.post('/register', asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password) return res.status(400).json({ message: 'Name, email, and password are required' });
  if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });

  const hashed = await bcrypt.hash(password, 12);
  const userData = { name, email: email.toLowerCase(), password: hashed, role: role || 'student', avatar: name[0].toUpperCase(), enrolledCourses: [], purchasedNotes: [] };

  if (useMemory) {
    if (inMemory.users.find(u => u.email === email.toLowerCase())) {
      return res.status(409).json({ message: 'Email already registered' });
    }
    const user = { ...userData, _id: 'u' + Date.now() };
    inMemory.users.push(user);
    const token = jwt.sign({ id: user._id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    const { password: _, ...safeUser } = user;
    return res.status(201).json({ user: safeUser, token });
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) return res.status(409).json({ message: 'Email already registered' });
  const user = new User(userData);
  await user.save();
  const token = jwt.sign({ id: user._id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
  const { password: _, ...safeUser } = user.toObject();
  res.status(201).json({ user: safeUser, token });
}));

// POST /api/auth/login
authRouter.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });

  let user;
  if (useMemory) {
    user = inMemory.users.find(u => u.email === email.toLowerCase());
  } else {
    user = await User.findOne({ email: email.toLowerCase() });
  }

  if (!user) return res.status(401).json({ message: 'Invalid email or password' });
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ message: 'Invalid email or password' });

  const token = jwt.sign({ id: user._id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
  const { password: _, ...safeUser } = useMemory ? user : user.toObject();
  res.json({ user: safeUser, token });
}));

// GET /api/auth/me
authRouter.get('/me', auth, asyncHandler(async (req, res) => {
  if (useMemory) {
    const user = inMemory.users.find(u => u._id === req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const { password: _, ...safe } = user;
    return res.json(safe);
  }
  const user = await User.findById(req.user.id).select('-password').populate('enrolledCourses', 'title emoji thumb').populate('purchasedNotes', 'title emoji');
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(user);
}));

// PUT /api/auth/profile
authRouter.put('/profile', auth, asyncHandler(async (req, res) => {
  const { name, avatar } = req.body;
  if (useMemory) {
    const idx = inMemory.users.findIndex(u => u._id === req.user.id);
    if (idx === -1) return res.status(404).json({ message: 'User not found' });
    inMemory.users[idx] = { ...inMemory.users[idx], name: name || inMemory.users[idx].name };
    return res.json(inMemory.users[idx]);
  }
  const user = await User.findByIdAndUpdate(req.user.id, { name, avatar }, { new: true }).select('-password');
  res.json(user);
}));

app.use('/api/auth', authRouter);

// ═══════════════════════════════════════════════════
// COURSES ROUTES
// ═══════════════════════════════════════════════════
const coursesRouter = express.Router();

// GET /api/courses
coursesRouter.get('/', asyncHandler(async (req, res) => {
  const { category, search, limit, sort } = req.query;
  if (useMemory) return res.json(inMemory.courses);

  let query = { isPublished: true };
  if (category) query.category = { $regex: category, $options: 'i' };
  if (search) query.$or = [{ title: { $regex: search, $options: 'i' } }, { description: { $regex: search, $options: 'i' } }];

  let q = Course.find(query);
  if (sort === 'popular') q = q.sort({ students: -1 });
  else if (sort === 'new') q = q.sort({ createdAt: -1 });
  else if (sort === 'price-low') q = q.sort({ price: 1 });
  if (limit) q = q.limit(parseInt(limit));

  const courses = await q;
  res.json(courses);
}));

// GET /api/courses/:id
coursesRouter.get('/:id', asyncHandler(async (req, res) => {
  if (useMemory) {
    const c = inMemory.courses.find(c => c._id === req.params.id);
    return c ? res.json(c) : res.status(404).json({ message: 'Course not found' });
  }
  const course = await Course.findById(req.params.id);
  if (!course) return res.status(404).json({ message: 'Course not found' });
  res.json(course);
}));

// POST /api/courses (admin)
coursesRouter.post('/', auth, asyncHandler(async (req, res) => {
  if (useMemory) {
    const course = { ...req.body, _id: 'c' + Date.now(), students: 0, createdAt: new Date() };
    inMemory.courses.push(course);
    return res.status(201).json(course);
  }
  const course = new Course({ ...req.body, instructorId: req.user.id });
  await course.save();
  res.status(201).json(course);
}));

// PUT /api/courses/:id (admin)
coursesRouter.put('/:id', adminAuth, asyncHandler(async (req, res) => {
  if (useMemory) {
    const idx = inMemory.courses.findIndex(c => c._id === req.params.id);
    if (idx === -1) return res.status(404).json({ message: 'Course not found' });
    inMemory.courses[idx] = { ...inMemory.courses[idx], ...req.body };
    return res.json(inMemory.courses[idx]);
  }
  const course = await Course.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!course) return res.status(404).json({ message: 'Course not found' });
  res.json(course);
}));

// DELETE /api/courses/:id (admin)
coursesRouter.delete('/:id', adminAuth, asyncHandler(async (req, res) => {
  if (useMemory) {
    inMemory.courses = inMemory.courses.filter(c => c._id !== req.params.id);
    return res.json({ message: 'Course deleted' });
  }
  await Course.findByIdAndDelete(req.params.id);
  res.json({ message: 'Course deleted successfully' });
}));

// POST /api/courses/:id/enroll
coursesRouter.post('/:id/enroll', auth, asyncHandler(async (req, res) => {
  const courseId = req.params.id;
  if (useMemory) {
    const userIdx = inMemory.users.findIndex(u => u._id === req.user.id);
    if (userIdx === -1) return res.status(404).json({ message: 'User not found' });
    if (!inMemory.users[userIdx].enrolledCourses.includes(courseId)) {
      inMemory.users[userIdx].enrolledCourses.push(courseId);
    }
    const courseIdx = inMemory.courses.findIndex(c => c._id === courseId);
    if (courseIdx > -1) inMemory.courses[courseIdx].students++;
    return res.json({ message: 'Enrolled successfully' });
  }
  const [user, course] = await Promise.all([User.findById(req.user.id), Course.findById(courseId)]);
  if (!course) return res.status(404).json({ message: 'Course not found' });
  if (!user.enrolledCourses.includes(courseId)) {
    user.enrolledCourses.push(courseId);
    course.students += 1;
    await Promise.all([user.save(), course.save()]);
  }
  res.json({ message: 'Enrolled successfully', course });
}));

app.use('/api/courses', coursesRouter);

// ═══════════════════════════════════════════════════
// LIVE CLASSES ROUTES
// ═══════════════════════════════════════════════════
const liveRouter = express.Router();

// GET /api/live-classes
liveRouter.get('/', asyncHandler(async (req, res) => {
  const { status } = req.query;
  if (useMemory) {
    const filtered = status ? inMemory.liveClasses.filter(l => l.status === status) : inMemory.liveClasses;
    return res.json(filtered);
  }
  const query = status ? { status } : {};
  const classes = await LiveClass.find(query).sort({ date: 1, time: 1 });
  res.json(classes);
}));

// GET /api/live-classes/:id
liveRouter.get('/:id', asyncHandler(async (req, res) => {
  if (useMemory) {
    const l = inMemory.liveClasses.find(l => l._id === req.params.id);
    return l ? res.json(l) : res.status(404).json({ message: 'Class not found' });
  }
  const cls = await LiveClass.findById(req.params.id);
  if (!cls) return res.status(404).json({ message: 'Class not found' });
  res.json(cls);
}));

// POST /api/live-classes (admin/instructor)
liveRouter.post('/', auth, asyncHandler(async (req, res) => {
  if (useMemory) {
    const cls = { ...req.body, _id: 'l' + Date.now(), registered: 0, createdAt: new Date() };
    inMemory.liveClasses.push(cls);
    return res.status(201).json(cls);
  }
  const cls = new LiveClass({ ...req.body, teacherId: req.user.id });
  await cls.save();
  res.status(201).json(cls);
}));

// PUT /api/live-classes/:id
liveRouter.put('/:id', auth, asyncHandler(async (req, res) => {
  if (useMemory) {
    const idx = inMemory.liveClasses.findIndex(l => l._id === req.params.id);
    if (idx === -1) return res.status(404).json({ message: 'Class not found' });
    inMemory.liveClasses[idx] = { ...inMemory.liveClasses[idx], ...req.body };
    return res.json(inMemory.liveClasses[idx]);
  }
  const cls = await LiveClass.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!cls) return res.status(404).json({ message: 'Class not found' });
  res.json(cls);
}));

// DELETE /api/live-classes/:id
liveRouter.delete('/:id', adminAuth, asyncHandler(async (req, res) => {
  if (useMemory) {
    inMemory.liveClasses = inMemory.liveClasses.filter(l => l._id !== req.params.id);
    return res.json({ message: 'Class deleted' });
  }
  await LiveClass.findByIdAndDelete(req.params.id);
  res.json({ message: 'Live class deleted' });
}));

// POST /api/live-classes/:id/register
liveRouter.post('/:id/register', auth, asyncHandler(async (req, res) => {
  const classId = req.params.id;
  if (useMemory) {
    const userIdx = inMemory.users.findIndex(u => u._id === req.user.id);
    if (userIdx > -1 && !inMemory.users[userIdx].registeredClasses?.includes(classId)) {
      inMemory.users[userIdx].registeredClasses = [...(inMemory.users[userIdx].registeredClasses||[]), classId];
    }
    const classIdx = inMemory.liveClasses.findIndex(l => l._id === classId);
    if (classIdx > -1) inMemory.liveClasses[classIdx].registered++;
    return res.json({ message: 'Registered successfully' });
  }
  const [user, cls] = await Promise.all([User.findById(req.user.id), LiveClass.findById(classId)]);
  if (!cls) return res.status(404).json({ message: 'Class not found' });
  if (!user.registeredClasses?.includes(classId)) {
    user.registeredClasses = [...(user.registeredClasses||[]), classId];
    cls.registered += 1;
    await Promise.all([user.save(), cls.save()]);
  }
  res.json({ message: 'Registered successfully', class: cls });
}));

// PUT /api/live-classes/:id/status (go live)
liveRouter.put('/:id/status', auth, asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (useMemory) {
    const idx = inMemory.liveClasses.findIndex(l => l._id === req.params.id);
    if (idx > -1) inMemory.liveClasses[idx].status = status;
    return res.json({ message: 'Status updated', status });
  }
  const cls = await LiveClass.findByIdAndUpdate(req.params.id, { status }, { new: true });
  res.json({ message: 'Status updated', class: cls });
}));

app.use('/api/live-classes', liveRouter);

// ═══════════════════════════════════════════════════
// NOTES ROUTES
// ═══════════════════════════════════════════════════
const notesRouter = express.Router();

// GET /api/notes
notesRouter.get('/', asyncHandler(async (req, res) => {
  const { subject, search } = req.query;
  if (useMemory) {
    let notes = inMemory.notes;
    if (subject) notes = notes.filter(n => n.subject === subject);
    if (search) notes = notes.filter(n => n.title.toLowerCase().includes(search.toLowerCase()));
    return res.json(notes);
  }
  let query = {};
  if (subject) query.subject = subject;
  if (search) query.title = { $regex: search, $options: 'i' };
  const notes = await Note.find(query).sort({ createdAt: -1 });
  res.json(notes);
}));

// GET /api/notes/:id
notesRouter.get('/:id', asyncHandler(async (req, res) => {
  if (useMemory) {
    const n = inMemory.notes.find(n => n._id === req.params.id);
    return n ? res.json(n) : res.status(404).json({ message: 'Notes not found' });
  }
  const note = await Note.findById(req.params.id);
  if (!note) return res.status(404).json({ message: 'Notes not found' });
  res.json(note);
}));

// POST /api/notes (admin/instructor - with file upload)
notesRouter.post('/', auth, upload.single('file'), asyncHandler(async (req, res) => {
  const data = req.body.data ? JSON.parse(req.body.data) : req.body;
  const noteData = {
    ...data,
    filePath: req.file ? req.file.path : null,
    uploadedBy: req.user.id
  };
  if (useMemory) {
    const note = { ...noteData, _id: 'n' + Date.now(), downloads: 0, createdAt: new Date() };
    inMemory.notes.push(note);
    return res.status(201).json(note);
  }
  const note = new Note(noteData);
  await note.save();
  res.status(201).json(note);
}));

// PUT /api/notes/:id
notesRouter.put('/:id', auth, upload.single('file'), asyncHandler(async (req, res) => {
  const updates = { ...req.body };
  if (req.file) updates.filePath = req.file.path;
  if (useMemory) {
    const idx = inMemory.notes.findIndex(n => n._id === req.params.id);
    if (idx === -1) return res.status(404).json({ message: 'Notes not found' });
    inMemory.notes[idx] = { ...inMemory.notes[idx], ...updates };
    return res.json(inMemory.notes[idx]);
  }
  const note = await Note.findByIdAndUpdate(req.params.id, updates, { new: true });
  if (!note) return res.status(404).json({ message: 'Notes not found' });
  res.json(note);
}));

// DELETE /api/notes/:id
notesRouter.delete('/:id', adminAuth, asyncHandler(async (req, res) => {
  if (useMemory) {
    inMemory.notes = inMemory.notes.filter(n => n._id !== req.params.id);
    return res.json({ message: 'Notes deleted' });
  }
  const note = await Note.findByIdAndDelete(req.params.id);
  if (note?.filePath && fs.existsSync(note.filePath)) fs.unlinkSync(note.filePath);
  res.json({ message: 'Notes deleted successfully' });
}));

// GET /api/notes/:id/download (authenticated purchase check)
notesRouter.get('/:id/download', auth, asyncHandler(async (req, res) => {
  let user;
  if (useMemory) {
    user = inMemory.users.find(u => u._id === req.user.id);
  } else {
    user = await User.findById(req.user.id);
  }
  if (!user) return res.status(404).json({ message: 'User not found' });
  if (!user.purchasedNotes.includes(req.params.id) && user.role !== 'admin') {
    return res.status(403).json({ message: 'Please purchase this note to download' });
  }

  if (!useMemory) {
    const note = await Note.findByIdAndUpdate(req.params.id, { $inc: { downloads: 1 } }, { new: true });
    if (!note) return res.status(404).json({ message: 'Note not found' });
    if (note.filePath && fs.existsSync(note.filePath)) {
      return res.download(note.filePath, `${note.title}.pdf`);
    }
  }
  res.json({ message: 'Download link generated', url: '/uploads/pdfs/sample.pdf' });
}));

app.use('/api/notes', notesRouter);

// ═══════════════════════════════════════════════════
// ORDERS ROUTES
// ═══════════════════════════════════════════════════
const ordersRouter = express.Router();

// POST /api/orders (create order + process enrollment)
ordersRouter.post('/', auth, asyncHandler(async (req, res) => {
  const { items, paymentMethod, paymentData } = req.body;
  if (!items || !items.length) return res.status(400).json({ message: 'No items in order' });

  const total = items.reduce((s, i) => s + i.price, 0);

  // Simulate payment processing
  // In production: integrate Razorpay/PayU/Stripe here
  const paymentSuccess = true; // Simulated
  const transactionId = 'TXN' + Date.now();

  const orderData = {
    userId: req.user.id,
    items,
    total,
    paymentMethod: paymentMethod || 'card',
    paymentStatus: paymentSuccess ? 'success' : 'failed',
    transactionId
  };

  if (useMemory) {
    const order = { ...orderData, _id: 'ord' + Date.now(), createdAt: new Date() };
    inMemory.orders.push(order);
    // Enroll user in purchased items
    const userIdx = inMemory.users.findIndex(u => u._id === req.user.id);
    if (userIdx > -1 && paymentSuccess) {
      items.forEach(item => {
        if (item.type === 'course' && !inMemory.users[userIdx].enrolledCourses.includes(item.itemId)) {
          inMemory.users[userIdx].enrolledCourses.push(item.itemId);
        }
        if (item.type === 'note' && !inMemory.users[userIdx].purchasedNotes.includes(item.itemId)) {
          inMemory.users[userIdx].purchasedNotes.push(item.itemId);
        }
      });
    }
    return res.status(201).json({ order, message: 'Order placed successfully' });
  }

  const order = new Order(orderData);
  await order.save();

  if (paymentSuccess) {
    const user = await User.findById(req.user.id);
    items.forEach(item => {
      if (item.type === 'course' && !user.enrolledCourses.includes(item.itemId)) user.enrolledCourses.push(item.itemId);
      if (item.type === 'note' && !user.purchasedNotes.includes(item.itemId)) user.purchasedNotes.push(item.itemId);
    });
    await user.save();
  }

  res.status(201).json({ order, message: 'Order placed successfully' });
}));

// GET /api/orders (user's orders)
ordersRouter.get('/', auth, asyncHandler(async (req, res) => {
  if (useMemory) {
    return res.json(inMemory.orders.filter(o => o.userId === req.user.id));
  }
  const orders = await Order.find({ userId: req.user.id }).sort({ createdAt: -1 });
  res.json(orders);
}));

// GET /api/orders/all (admin - all orders)
ordersRouter.get('/all', adminAuth, asyncHandler(async (req, res) => {
  if (useMemory) return res.json(inMemory.orders);
  const orders = await Order.find().populate('userId', 'name email').sort({ createdAt: -1 });
  res.json(orders);
}));

app.use('/api/orders', ordersRouter);

// ═══════════════════════════════════════════════════
// DASHBOARD ROUTE
// ═══════════════════════════════════════════════════
app.get('/api/dashboard', auth, asyncHandler(async (req, res) => {
  if (useMemory) {
    const user = inMemory.users.find(u => u._id === req.user.id);
    return res.json({
      enrolledCourses: user?.enrolledCourses?.length || 0,
      purchasedNotes: user?.purchasedNotes?.length || 0,
      orders: inMemory.orders.filter(o => o.userId === req.user.id).length
    });
  }
  const [user, orders] = await Promise.all([
    User.findById(req.user.id).select('-password'),
    Order.countDocuments({ userId: req.user.id, paymentStatus: 'success' })
  ]);
  res.json({
    enrolledCourses: user.enrolledCourses.length,
    purchasedNotes: user.purchasedNotes.length,
    orders,
    user
  });
}));

// ═══════════════════════════════════════════════════
// ADMIN STATS ROUTE
// ═══════════════════════════════════════════════════
app.get('/api/admin/stats', adminAuth, asyncHandler(async (req, res) => {
  if (useMemory) {
    return res.json({
      totalStudents: inMemory.users.filter(u => u.role === 'student').length,
      totalCourses: inMemory.courses.length,
      totalClasses: inMemory.liveClasses.length,
      totalNotes: inMemory.notes.length,
      totalOrders: inMemory.orders.length,
      totalRevenue: inMemory.orders.reduce((s, o) => s + (o.total || 0), 0)
    });
  }
  const [students, courses, classes, notes, orders] = await Promise.all([
    User.countDocuments({ role: 'student' }),
    Course.countDocuments(),
    LiveClass.countDocuments(),
    Note.countDocuments(),
    Order.aggregate([{ $match: { paymentStatus: 'success' } }, { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } }])
  ]);
  res.json({
    totalStudents: students,
    totalCourses: courses,
    totalClasses: classes,
    totalNotes: notes,
    totalOrders: orders[0]?.count || 0,
    totalRevenue: orders[0]?.total || 0
  });
}));

// ─── SERVE FRONTEND ───────────────────────────────────
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ─── 404 HANDLER ─────────────────────────────────────
app.use('/api/*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// ─── ERROR HANDLER ────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ message: 'File too large (max 50MB)' });
  res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
});

// ─── START SERVER ─────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 EduPro Server running on http://localhost:${PORT}`);
  console.log(`📚 API: http://localhost:${PORT}/api`);
  console.log(`🌐 Frontend: http://localhost:${PORT}`);
  console.log(`\nDefault accounts:`);
  console.log(`  Admin:   admin@edupro.com  / admin123`);
  console.log(`  Student: student@edupro.com / student123\n`);
});
