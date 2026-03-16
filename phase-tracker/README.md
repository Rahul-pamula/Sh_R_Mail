# ShrMail Phase Tracker 🚀

A modern full-stack MEAN (MongoDB, Express, Angular, Node.js) web dashboard to track development phases and tasks.
Built specially as an assignment to manage the development progress of the core ShrMail engine.

## Features ✨
- **Phase Management**: Create, edit, and delete major project phases.
- **Task Management**: Add checkable tasks to any block, rename them, or delete them.
- **Progress Tracking**: Real-time progress bars per phase and an overarching global percentage.
- **Modern UI**: Dark mode dashboard built with TailwindCSS and responsive CSS grids.

---

## 💻 Local Setup Instructions

### Prerequisites
- Node.js (v18+ recommended)
- MongoDB Server (installed locally or an Atlas connection string)
- Angular CLI (`npm install -g @angular/cli`)

### 1. Initialize Backend
1. Open a terminal and navigate to the `backend` folder:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file (one is already provided) with your MongoDB connection string:
   ```env
   PORT=3000
   MONGODB_URI=mongodb://localhost:27017/phase-tracker
   ```
4. Start the Express server:
   ```bash
   node server.js
   ```
   *The backend will run on `http://localhost:3000`.*

### 2. Initialize Frontend (Angular)
1. Open a **new** terminal and navigate to the `frontend` folder:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Angular development server:
   ```bash
   ng serve
   ```
4. Open your browser and navigate to `http://localhost:4200` to view the dashboard!

---

## ☁️ Deployment Guide

If you need to host this online for your assignment, follow these steps:

### 1. Database (MongoDB Atlas)
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register) and structure a free cluster.
2. Under "Database Access", create a new user and password.
3. Under "Network Access", allow access from anywhere (`0.0.0.0/0`).
4. Click "Connect" -> "Connect your application" and copy the connection string.

### 2. Backend (Render.com)
1. Upload your code to a GitHub repository.
2. Go to [Render](https://render.com) and create a new **Web Service**.
3. Connect your GitHub repository and select the `backend` directory as the Root Directory.
4. Set the Build Command to: `npm install`
5. Set the Start Command to: `node server.js`
6. Add an Environment Variable: 
   - Key: `MONGODB_URI` 
   - Value: *(paste the Atlas connection string)*
7. Click **Deploy**. Once finished, copy the provided `onrender.com` URL.

### 3. Frontend (Vercel or Render)
*Before deploying the frontend, update `frontend/src/app/services/phase.service.ts` to replace `http://localhost:3000/api` with your new Render backend URL.*

1. Go to [Vercel](https://vercel.com/) and create a new project.
2. Connect your GitHub repository.
3. Select the `frontend` directory as the Root Directory.
4. Vercel will auto-detect the Angular framework. Ensure the Build Command is `npm run build` and Output Directory is `dist/frontend/browser`.
5. Click **Deploy**.

**You're all set! Your full-stack Phase Tracker is now live!**
