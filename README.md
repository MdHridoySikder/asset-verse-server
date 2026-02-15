## 🌐 Live API URL: https://asset-verse-server-wheat-three.vercel.app

# 🚀 AssetVerse Server

## 📌 Project Purpose

AssetVerse Server is the backend API for the **AssetVerse — Corporate Asset Management System**.  
It manages authentication, asset tracking, employee affiliation, request processing, subscription upgrades, and secure role-based access control.

This server ensures secure data handling and smooth communication between HR Managers and Employees.

---

## ✨ Key Features

- 🔐 JWT Authentication System
- 🛡 Role-Based Access Control (HR / Employee)
- 🏢 Company & Employee Affiliation Logic
- 📦 Asset CRUD Operations
- 🔄 Asset Request Workflow (Pending / Approved / Rejected / Returned)
- 🤝 Auto-Affiliation on First Approval
- 📄 Server-side Pagination Support
- 💳 Stripe Payment Integration for Package Upgrade
- ⚙ Secure Middleware Implementation
- 🚀 Production-ready Deployment (Vercel)

---

## 🛠 Technologies Used

- Node.js – Server runtime
- Express.js – Backend framework
- MongoDB – NoSQL Database
- Firebase Admin SDK – Authentication verification
- JSON Web Token (JWT) – Token generation & verification
- Stripe – Payment integration
- CORS – Cross-origin resource sharing
- dotenv – Environment variable management
- Vercel – Deployment platform

---

## 🗄 Database Collections

### 1️⃣ users

Stores HR & Employee accounts

- HR includes `packageLimit`, `subscription`, `company` info

### 2️⃣ assets

Stores company assets

- Tracks total & available quantity

### 3️⃣ requests

Stores asset request history

- Status: `pending` / `approved` / `rejected` / `returned`

### 4️⃣ assignedAssets

Tracks approved and assigned assets

- Handles return process

### 5️⃣ employeeAffiliations

Tracks employee-company relationships

### 6️⃣ packages

Stores Basic / Standard / Premium package data

### 7️⃣ payments

Stores Stripe transaction history

---

## 🔑 Environment Variables

Create a `.env` file in the root directory and add:

## 👨‍💻 Author

**Md Hridoy Sikder**  
📧 hridoy702345@gmail.com
