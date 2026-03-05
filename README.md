# 🎓 EduPro — Online Learning Platform

A complete, full-stack online learning platform with:
- **Course selling** with enrollment & curriculum viewer
- **Live interactive classes** with scheduling & joining
- **PDF Notes store** with download after purchase
- **Student Dashboard** with progress tracking
- **Admin Panel** for full content management
- **Cart & Checkout** with payment simulation

---

## 🚀 Quick Start

### Prerequisites
- Node.js v16+
- MongoDB (local or Atlas)

### Installation

```bash
# 1. Install dependencies
npm install

# 2. Set up environment
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret

# 3. Seed the database (optional but recommended)
npm run seed

# 4. Start the server
npm start
# OR for development with auto-reload:
npm run dev
```

Open http://localhost:5000 in your browser.

---

## 📁 Project Structure

```
edupro/
├── index.html       ← Complete frontend (single-page app)
├── server.js        ← Express backend server
├── seed.js          ← Database seeder
├── package.json
├── .env.example     ← Environment variables template
└── uploads/         ← Uploaded PDF files & images (auto-created)
    ├── pdfs/
    └── thumbnails/
```

---

## 🔑 Default Accounts

| Role    | Email                 | Password    |
|---------|-----------------------|-------------|
| Admin   | admin@edupro.com      | admin123    |
| Student | student@edupro.com    | student123  |

---

## 📡 API Reference

### Authentication
| Method | Endpoint              | Description            |
|--------|-----------------------|------------------------|
| POST   | /api/auth/register    | Create new account     |
| POST   | /api/auth/login       | Login & get JWT token  |
| GET    | /api/auth/me          | Get current user       |
| PUT    | /api/auth/profile     | Update profile         |

### Courses
| Method | Endpoint                   | Description          |
|--------|----------------------------|----------------------|
| GET    | /api/courses               | List all courses     |
| GET    | /api/courses/:id           | Get course details   |
| POST   | /api/courses               | Create course (auth) |
| PUT    | /api/courses/:id           | Update course        |
| DELETE | /api/courses/:id           | Delete course        |
| POST   | /api/courses/:id/enroll    | Enroll in course     |

Query params: `?category=programming&search=react&sort=popular&limit=10`

### Live Classes
| Method | Endpoint                       | Description           |
|--------|--------------------------------|-----------------------|
| GET    | /api/live-classes              | List all sessions     |
| POST   | /api/live-classes              | Schedule class        |
| PUT    | /api/live-classes/:id          | Update class          |
| DELETE | /api/live-classes/:id          | Delete class          |
| POST   | /api/live-classes/:id/register | Register for class    |
| PUT    | /api/live-classes/:id/status   | Change status (live)  |

Query params: `?status=live|upcoming|recorded`

### PDF Notes
| Method | Endpoint                 | Description          |
|--------|--------------------------|----------------------|
| GET    | /api/notes               | List all notes       |
| POST   | /api/notes               | Upload notes + PDF   |
| PUT    | /api/notes/:id           | Update note          |
| DELETE | /api/notes/:id           | Delete note          |
| GET    | /api/notes/:id/download  | Download PDF         |

Query params: `?subject=programming|mathematics|science|competitive`

### Orders
| Method | Endpoint          | Description          |
|--------|-------------------|----------------------|
| POST   | /api/orders       | Create order         |
| GET    | /api/orders       | Get user orders      |
| GET    | /api/orders/all   | Admin: all orders    |

### Admin
| Method | Endpoint          | Description          |
|--------|-------------------|----------------------|
| GET    | /api/admin/stats  | Platform statistics  |
| GET    | /api/dashboard    | User dashboard data  |

---

## ⚙️ Environment Variables

| Variable          | Description                    | Default                    |
|-------------------|--------------------------------|----------------------------|
| PORT              | Server port                    | 5000                       |
| MONGO_URI         | MongoDB connection string      | localhost/edupro           |
| JWT_SECRET        | JWT signing secret             | (change in production!)    |
| RAZORPAY_KEY_ID   | Razorpay API key (optional)    | -                          |
| RAZORPAY_KEY_SECRET | Razorpay secret (optional)  | -                          |

---

## 💳 Payment Integration (Production)

To integrate **Razorpay** (recommended for India):
```bash
npm install razorpay
```
Then replace the payment simulation in `/api/orders` POST route with:
```js
const Razorpay = require('razorpay');
const razorpay = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
const payment = await razorpay.orders.create({ amount: total * 100, currency: 'INR', receipt: 'order_' + Date.now() });
```

---

## 🔒 Security Notes

- Change `JWT_SECRET` in production to a long random string
- Set `NODE_ENV=production` in production
- Enable HTTPS in production
- Limit file upload sizes based on your hosting plan
- Add rate limiting with `express-rate-limit` for production

---

## 🎯 Features Overview

### For Students
- Browse and search 100+ courses
- Watch live interactive classes
- Download PDF study notes
- Track learning progress in dashboard
- View purchase history and certificates

### For Admins
- Manage all courses (add, edit, delete)
- Schedule and manage live classes
- Upload and manage PDF notes
- View all students and orders
- Revenue analytics dashboard

### Technical Features
- JWT authentication
- File upload for PDFs and thumbnails
- In-memory fallback (works without MongoDB)
- Responsive design for all devices
- Cart with local storage persistence
- Toast notifications
- Search and filter functionality

---

## 📞 Support

Need help? Check the code comments or open an issue.
