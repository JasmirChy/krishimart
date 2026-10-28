# 🌱 KrishiMart — Farm-to-Table Marketplace

KrishiMart is a full-stack agricultural marketplace built with **Python (Django REST Framework)**, **PostgreSQL**, and **React (Vite + Tailwind CSS)** connecting local farmers, cooperatives, and households across Nepal.

## ✨ Core Features
- **Email or Phone Authentication**: Customers and Farmers can register and sign in using either their Email Address or Phone Number (`EmailOrPhoneBackend` + JWT Auto-Refresh).
- **Mandatory Admin Verification Gate**: Newly registered users are placed in a pending state (`is_admin_verified = False`) and unlock full platform access only after Admin verification.
- **"Sell Your Products" Farmer Portal**: Verified Farmers and Customers can submit fresh vegetable/produce batches with descriptions, quantities, expected prices, contact numbers, pickup locations, and photos directly to the Admin.
- **1-Click Store Publishing & Stock Tracking**: Admins can approve farmer offers and publish them directly to the live store. Customer orders automatically deduct stock in PostgreSQL (and restore stock if cancelled).
- **Two-Way Buyer/Seller ↔ Admin Live Chat**: Direct messaging with unread counters, auto-scrolling threads, and timestamps.
- **Full Admin Control Center (`/admin`)**: Live revenue & user KPIs, user verification/role management, product editing, order management, and unified chat inbox.

## 🚀 Quick Start

### 1. Backend (Django + PostgreSQL)
```bash
cd backend
venv\Scripts\activate
python manage.py migrate
python manage.py runserver

### 2.Frontend (React + Vite + Tailwind CSS)
cd frontend
npm install
npm run dev

