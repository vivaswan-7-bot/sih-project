
```markdown
# 🌊 INCOIS Social - Ocean Intelligence Platform

A social platform where users can post updates, images, and videos about ocean-related events (like floods, cyclones, tsunamis, etc.), similar to Instagram/Twitter.  
Officials and Analysts also get access to a dashboard for analytics.

---

## 🚀 Features
- User authentication (Register/Login as Citizen, Official, Analyst).
- Create posts with **text, images, or videos**.
- React to posts (👍 like, ❤️ love, 😢 sad, ⚠️ alert).
- Comment and repost functionality.
- Analytics dashboard for Officials/Analysts.
- Role-based access control.

---

## 📂 Project Structure
```

project-root/
├── backend/           # Express + MongoDB backend
│   ├── routes/        # API routes
│   ├── models/        # Mongoose models
│   ├── middleware/    # Auth middleware
│   ├── utils/         # Validators, helpers
│   ├── uploads/       # Uploaded images/videos (auto-created)
│   ├── server.js      # Entry point
│   └── package.json
│
├── frontend/          # React frontend (Vite)
│   ├── src/           # React components
│   ├── public/        # Static files
│   └── package.json
│
└── README.md

````

---

## ⚙️ Installation

### 1. Clone the repository
```bash
git clone https://github.com/your-username/incois-social.git
cd incois-social
````

### 2. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file inside **backend/**:

```
PORT=4000
MONGO_URI=mongodb://localhost:27017/incois-social
JWT_SECRET=your_jwt_secret
```

Start backend:

```bash
npm start
```

---

### 3. Frontend Setup

```bash
cd frontend
npm install
```

Create a `.env` file inside **frontend/**:

```
VITE_API_URL=http://localhost:4000
```

Start frontend:

```bash
npm run dev
```

---

## 🖼️ Media Uploads

* Uploaded files are stored in `backend/uploads/`.
* Accessible at: `http://localhost:4000/uploads/<filename>`.

---

## 👥 User Roles

* **Citizen** → Can create posts, like, comment, react, repost.
* **Official** → Can access dashboard + moderate.
* **Analyst** → Can access dashboard.

---

## 🛠️ Tech Stack

* **Frontend**: React (Vite), Fetch API
* **Backend**: Node.js, Express.js, Multer (file uploads)
* **Database**: MongoDB + Mongoose
* **Auth**: JWT (JSON Web Tokens)

---

👉 Do you want me to also **write a `.gitignore` file** so that when you upload manually to GitHub, it ignores `node_modules/`, `uploads/`, and `.env` automatically?
```
