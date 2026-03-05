/**
 * EduPro Database Seeder
 * Run: node seed.js
 * Seeds the database with sample courses, live classes, and notes
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/edupro';

mongoose.connect(MONGO_URI).then(() => console.log('Connected to MongoDB')).catch(err => { console.error(err); process.exit(1); });

// ─── MODELS ───────────────────────────────────────────
const User = mongoose.model('User', new mongoose.Schema({
  name: String, email: { type: String, unique: true }, password: String,
  role: { type: String, default: 'student' }, avatar: String,
  enrolledCourses: [mongoose.Schema.Types.ObjectId],
  purchasedNotes: [mongoose.Schema.Types.ObjectId]
}));

const Course = mongoose.model('Course', new mongoose.Schema({
  title: String, description: String, category: String,
  emoji: String, thumb: String, price: Number, oldPrice: Number,
  rating: Number, students: Number, duration: String, lessons: Number,
  instructor: String, includes: [String], curriculum: [{ title: String, lessons: [String] }],
  isPublished: { type: Boolean, default: true }, createdAt: { type: Date, default: Date.now }
}));

const LiveClass = mongoose.model('LiveClass', new mongoose.Schema({
  title: String, teacher: String, date: String, time: String,
  duration: Number, price: Number, link: String,
  status: String, registered: Number, createdAt: { type: Date, default: Date.now }
}));

const Note = mongoose.model('Note', new mongoose.Schema({
  title: String, subject: String, emoji: String,
  pages: Number, price: Number, downloads: Number,
  createdAt: { type: Date, default: Date.now }
}));

// ─── SEED DATA ────────────────────────────────────────
async function seed() {
  try {
    // Clear existing data
    await Promise.all([User.deleteMany(), Course.deleteMany(), LiveClass.deleteMany(), Note.deleteMany()]);
    console.log('🗑  Cleared existing data');

    // Create Users
    const adminPass = await bcrypt.hash('admin123', 12);
    const studentPass = await bcrypt.hash('student123', 12);
    const users = await User.insertMany([
      { name: 'Admin User', email: 'admin@edupro.com', password: adminPass, role: 'admin', avatar: 'A' },
      { name: 'Rahul Sharma', email: 'rahul@edupro.com', password: adminPass, role: 'instructor', avatar: 'R' },
      { name: 'Test Student', email: 'student@edupro.com', password: studentPass, role: 'student', avatar: 'T' },
    ]);
    console.log('👥 Created', users.length, 'users');

    // Create Courses
    const courses = await Course.insertMany([
      { title: 'React.js Complete Guide 2024', description: 'Master React.js from scratch with hooks, context, Redux, and real-world projects.', category: 'programming', emoji: '⚛️', thumb: 'thumb-blue', price: 1299, oldPrice: 2999, rating: 4.9, students: 2847, duration: '32 hrs', lessons: 148, instructor: 'Rahul Sharma', includes: ['32 hours on-demand video', '12 projects', 'Lifetime access', 'Certificate'], curriculum: [{ title: 'Getting Started', lessons: ['Introduction to React', 'Setting up environment', 'Your first component'] }, { title: 'Core Concepts', lessons: ['State & Props', 'Event Handling', 'Lists & Keys'] }] },
      { title: 'Python for Data Science', description: 'Learn Python for data analysis, visualization, and machine learning.', category: 'data science', emoji: '🐍', thumb: 'thumb-green', price: 999, oldPrice: 1999, rating: 4.8, students: 4200, duration: '28 hrs', lessons: 120, instructor: 'Priya Patel', includes: ['28 hours video', 'Jupyter notebooks', 'Datasets included', 'Certificate'], curriculum: [{ title: 'Python Basics', lessons: ['Variables & Types', 'Control Flow', 'Functions'] }, { title: 'Data Analysis', lessons: ['NumPy', 'Pandas', 'Visualization'] }] },
      { title: 'UI/UX Design Masterclass', description: 'Complete UI/UX design covering user research, wireframing, and Figma.', category: 'design', emoji: '🎨', thumb: 'thumb-purple', price: 1499, oldPrice: 3499, rating: 4.7, students: 1823, duration: '24 hrs', lessons: 96, instructor: 'Ananya Singh', includes: ['24 hours video', 'Figma assets', 'Portfolio projects', 'Certificate'], curriculum: [{ title: 'Design Principles', lessons: ['Color Theory', 'Typography', 'Grid Systems'] }] },
      { title: 'Node.js & MongoDB Backend', description: 'Build scalable REST APIs with Node.js, Express, and MongoDB.', category: 'programming', emoji: '🟢', thumb: 'thumb-teal', price: 1199, oldPrice: 2499, rating: 4.8, students: 3150, duration: '26 hrs', lessons: 110, instructor: 'Vikram Reddy', includes: ['26 hours video', 'Source code', 'API collection', 'Certificate'], curriculum: [{ title: 'Node.js Basics', lessons: ['What is Node.js', 'npm Ecosystem'] }] },
      { title: 'AWS Cloud Practitioner', description: 'Prepare for AWS Cloud Practitioner certification.', category: 'devops', emoji: '☁️', thumb: 'thumb-orange', price: 1799, oldPrice: 3999, rating: 4.9, students: 980, duration: '20 hrs', lessons: 85, instructor: 'Amit Kumar', includes: ['20 hours video', 'Practice exams', 'Study notes', 'Certificate'], curriculum: [{ title: 'Cloud Fundamentals', lessons: ['What is Cloud', 'AWS Infrastructure'] }] },
      { title: 'Digital Marketing Bootcamp', description: 'Learn SEO, social media, email marketing and analytics.', category: 'business', emoji: '📈', thumb: 'thumb-pink', price: 799, oldPrice: 1799, rating: 4.6, students: 2200, duration: '18 hrs', lessons: 80, instructor: 'Neha Gupta', includes: ['18 hours video', 'Templates & tools', 'Case studies', 'Certificate'], curriculum: [{ title: 'Marketing Basics', lessons: ['Digital Marketing Intro', 'Customer Psychology'] }] },
    ]);
    console.log('📚 Created', courses.length, 'courses');

    // Enroll test student in first 2 courses
    await User.findOneAndUpdate({ email: 'student@edupro.com' }, { enrolledCourses: [courses[0]._id, courses[1]._id] });

    // Create Live Classes
    const liveClasses = await LiveClass.insertMany([
      { title: 'Python Crash Course: Beginners Welcome', teacher: 'Priya Patel', date: '2024-12-15', time: '6:00 PM', duration: 90, price: 0, link: 'https://meet.google.com/abc-defg-hij', status: 'live', registered: 142 },
      { title: 'React Hooks Deep Dive', teacher: 'Rahul Sharma', date: '2024-12-16', time: '7:00 PM', duration: 60, price: 299, link: 'https://meet.google.com/xyz-abcd-efg', status: 'upcoming', registered: 87 },
      { title: 'System Design Interview Prep', teacher: 'Vikram Reddy', date: '2024-12-17', time: '8:00 PM', duration: 120, price: 499, link: 'https://meet.google.com/pqr-stuv-wxy', status: 'upcoming', registered: 203 },
      { title: 'ML Model Deployment on AWS', teacher: 'Dr. Sandeep Mehta', date: '2024-12-18', time: '5:00 PM', duration: 90, price: 399, link: 'https://meet.google.com/lmn-opqr-stu', status: 'upcoming', registered: 64 },
      { title: 'Figma Advanced: Auto Layout', teacher: 'Ananya Singh', date: '2024-12-19', time: '6:30 PM', duration: 75, price: 199, link: 'https://meet.google.com/vwx-yzab-cde', status: 'upcoming', registered: 115 },
    ]);
    console.log('📡 Created', liveClasses.length, 'live classes');

    // Create Notes
    const notes = await Note.insertMany([
      { title: 'Complete DSA Handbook', subject: 'programming', emoji: '📘', pages: 124, price: 299, downloads: 1840 },
      { title: 'React Cheat Sheet 2024', subject: 'programming', emoji: '⚛️', pages: 28, price: 99, downloads: 3200 },
      { title: 'Calculus Notes — Integrals & Derivatives', subject: 'mathematics', emoji: '📐', pages: 86, price: 199, downloads: 940 },
      { title: 'Physics Formula Sheets (JEE)', subject: 'science', emoji: '⚡', pages: 48, price: 149, downloads: 2100 },
      { title: 'SQL Mastery Notes', subject: 'programming', emoji: '🗄️', pages: 64, price: 179, downloads: 1520 },
      { title: 'GATE CS Previous Year Solutions', subject: 'competitive', emoji: '🏆', pages: 200, price: 399, downloads: 780 },
    ]);
    console.log('📄 Created', notes.length, 'PDF notes');

    console.log('\n✅ Database seeded successfully!');
    console.log('\nLogin credentials:');
    console.log('  Admin:    admin@edupro.com / admin123');
    console.log('  Student:  student@edupro.com / student123');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  }
}

seed();
