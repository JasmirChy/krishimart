🌱 KrishiMart Nepal — किसान र उपभोक्ता जोड्ने डिजिटल बजारKrishiMart Nepal is a full-stack agricultural e-commerce and wholesale procurement platform designed to connect Nepali farmers directly with household and commercial consumers via a verified central hub (Dhangadhi Hub, Kailali & Kathmandu Valley). It eliminates middleman exploitation through transparent wholesale procurement, real-time WebSocket communication, automated HTML email notifications, and standardized 1/4 A4 (105mm × 148.5mm) printable/downloadable vouchers and receipts.Live Frontend (Vercel): https://krishimart-gold.vercel.app/Live Backend API (Render): https://krishimart-backend.onrender.com/api/Key Features Across All 3 RolesRoleCore Capabilities🌾 Farmer (FARMER)Submit wholesale harvest batches with crop photos, track Admin procurement decisions (PENDING, APPROVED, BOUGHT, REJECTED), view & print 1/4 A4 Farmer Procurement Vouchers (#KM-PUR-ID), download PNG slips, share verified farm stories with photos, chat live with Admin, and purchase store items.🛒 Customer (CUSTOMER)Browse farm-fresh produce by category & district, switch between English / नेपाली (EN / नेपाली), add items to a persistent shopping basket, place orders (COD, eSewa, Khalti), view real-time order status & synced Admin discounts (% OFF), print/download 1/4 A4 Order Receipts (#KM-ORD-ID), post photo reviews, and chat live with Admin.🛡️ Admin (ADMIN)Verify/approve user accounts, review farmer harvest offers, buy wholesale batches directly into store inventory, settle farmer payouts (PENDING → PAID), confirm/deliver/cancel customer orders with customizable Discount (%), export ledgers & orders to CSV / Excel, moderate stories & reviews with image previews, and manage live support chat.Automated Primary-Inbox HTML Email SystemKrishiMart dispatches responsive HTML card emails natively over Port 443 HTTPS via a Google Apps Script Gmail Bridge (with automatic SMTP/Brevo fallback) so emails bypass cloud SMTP port blocks and land directly in the Gmail Primary Inbox:6-Digit Password Reset OTP (#accounts/login/) — Self-service 6-digit verification code with 10-minute expiration and live resend support.Account Verified & Approved / Paused (#KM-USR-ID) — Sent automatically when the Admin verifies or pauses a Farmer or Customer profile.Customer Order Status & Discounted Receipt (#KM-ORD-ID) — Sent when an order is Confirmed (with Subtotal, Discount %, and Final Payable amount), Delivered, or Cancelled.Farmer Wholesale Procurement & Payout Settlement (#KM-PUR-ID) — Sent when KrishiMart purchases a farmer's harvest batch and when a pending payout is marked PAID.Farmer Harvest Offer Approved / Declined (#KM-SUB-ID) — Sent with Admin review notes when a submitted crop batch is approved or declined.Technology StackLayerTechnologies UsedFrontendReact 19, Vite, Tailwind CSS v4, Axios (JWT Interceptor), Lucide React Icons, HTML5 Canvas (1/4 A4 PNG Slip Generator)BackendPython 3.12+, Django 6.0, Django REST Framework (DRF), SimpleJWT, Django Channels & Daphne (ASGI WebSockets)DatabasePostgreSQL 18 (Render Managed Database in Production / Local PostgreSQL in Development)Cloud & DevOpsVercel (Frontend SPA Hosting), Render (ASGI Web Service + PostgreSQL), Google Apps Script Web App (HTTPS Gmail Delivery)Project Directory Structurekrishimart/
├── backend/
│   ├── accounts/          # Custom User model (FARMER, CUSTOMER, ADMIN), JWT Auth, OTP Reset, Admin User APIs
│   ├── marketplace/       # Products, Farmer Submissions, Procurement Ledger, Orders, Discounts, Stories/Reviews
│   ├── chat/              # Real-time WebSocket & REST support chat between Farmers/Customers and Admin
│   ├── config/            # Django settings, ASGI/WSGI configuration, URL routing
│   ├── manage.py
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── api/           # Axios client with automatic JWT token attachment
    │   ├── components/    # AdminPanel.jsx, AuthView.jsx, ChatWidget.jsx
    │   ├── App.jsx        # Main Marketplace, Farmer Portal, Customer Orders, 1/4 A4 Slip Modal, EN/NP Toggle
    │   └── main.jsx
    ├── index.html
    ├── package.json
    └── vite.config.js
Local Setup & Installation Guide1. Clone the Repositorygit clone https://github.com/YOUR_USERNAME/krishimart.git
cd krishimart
2. Backend Setup (Django + PostgreSQL)cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS / Linux:
source venv/bin/activate

pip install -r requirements.txt
Create a .env file inside backend/:SECRET_KEY=your-secret-key
DEBUG=True
DB_NAME=krishimart_db
DB_USER=postgres
DB_PASSWORD=your_postgres_password
DB_HOST=localhost
DB_PORT=5432
GOOGLE_SCRIPT_WEBHOOK_URL=https://script.google.com/macros/s/AKfycby54qvMjU39dehVbkysaL16Z2qEpfvo_txYzaDJ9tzZsqBz98IWtEuEs-mXUDBVMuQr/exec
Run database migrations and start the ASGI server:python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
3. Frontend Setup (React + Vite)cd ../frontend
npm install
npm run dev
Open http://localhost:5173 in your browser.Key API EndpointsEndpointMethodDescription/api/accounts/register/POSTRegister a new FARMER or CUSTOMER account (pending Admin verification)/api/accounts/login/POSTJWT sign-in, send_otp (6-digit email OTP), and verify_otp_and_reset/api/accounts/admin/users/{id}/toggle_verification/POSTVerify/unverify user account and trigger automated status email/api/marketplace/products/GET, POSTList available store produce or add new inventory items/api/marketplace/submissions/{id}/buy_from_farmer/POSTProcure a farmer's crop offer, generate voucher #KM-PUR-ID, and optionally publish to store/api/marketplace/submissions/{id}/review/POSTApprove or decline a farmer's crop offer and email review remarks/api/marketplace/farmer-purchases/{id}/mark_paid/POSTSettle a pending farmer payout (PAID) and email settlement confirmation/api/marketplace/orders/{id}/apply_discount_and_email/POSTSave Admin discount (%) and send the single-time Confirmed Order Receipt email/api/marketplace/stories/GET, POSTSubmit and moderate Farmer Stories & Buyer Reviews with photo uploads