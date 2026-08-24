# RichenQuest — Complete Student Platform & Zoho Automation Architecture

RichenQuest is a modern, student-centric global university admissions platform built with **React + JavaScript + Tailwind CSS** on the frontend and **Zoho Catalyst Functions** on the backend.

The platform is designed around a **Zoho Automation-Ready Architecture**, allowing real-time synchronization with the entire Zoho Ecosystem (**Zoho CRM, Zoho Flow, Zoho Bookings, Zoho WorkDrive, Zoho Books, Zoho Mail, Zoho Cliq, Zoho SalesIQ, and Zoho Analytics**).

---

## 1. Architectural Blueprint

```text
                        RICHENQUEST STUDENT PLATFORM
                                    │
                                    ▼
                     React 18 + JavaScript + Tailwind CSS
                                    │
                                    ▼
                        SERVICE LAYER (src/services/)
   ┌────────────────┬─────────────────┬────────────────┬─────────────────┐
   │ authService    │ zohoService     │ bookingService │ documentService │
   │ leadService    │ studentService  │ paymentService │ analyticsService│
   └────────────────┴─────────────────┴────────────────┴─────────────────┘
                                    │
                                    ▼
                         UNIVERSAL API CLIENT (apiClient.js)
                                    │
                                    ▼
                         ZOHO CATALYST API GATEWAY
                                    │
           ┌────────────────────────┼────────────────────────┐
           ▼                        ▼                        ▼
    Catalyst Functions     Catalyst Data Store     Catalyst Authentication
    (Node.js Serverless)    (App State & Logs)      (Session Verification)
           │
           ▼
    BUSINESS LOGIC & ZOHO INTEGRATION LAYER (functions/shared/zoho/)
           │
   ┌───────┼────────────────────────┬────────────────────────┐
   ▼       ▼                        ▼                        ▼
Zoho CRM (crm.js)                Zoho Flow (flow.js)   Zoho WorkDrive (workdrive.js)
(Leads/Contacts/Cases)          (Webhook Engine)       (Document Dossier)
   │                                │                        │
   └────────────────────────────────┼────────────────────────┘
                                    │
           ┌────────────────────────┼────────────────────────┐
           ▼                        ▼                        ▼
       Zoho Books (books.js)    Zoho Bookings (bookings.js) Phone OTP Provider (phoneVerify.js)
    (Invoices/Receipts)         (Counselor Schedules)   (External SMS Gateway / Twilio)
```

---

## 2. Project Directory Structure

```text
richenquest/
├── client/                     # Frontend Application (React + Vite + Tailwind)
│   ├── public/                 # Static assets & icons
│   ├── src/
│   │   ├── components/         # Reusable UI component system (Button, Modal, FileUpload, Cards)
│   │   ├── config/             # Safe environment variables (environment.js)
│   │   ├── constants/          # Business entities, degree levels, target countries (entities.js)
│   │   ├── context/            # Auth, Notification, and Toast contexts
│   │   ├── integrations/       # SalesIQ and Zoho Flow webhook boundaries
│   │   ├── layouts/            # Navbar, Footer, Sidebar, TopHeader, Layout wrappers
│   │   ├── pages/
│   │   │   ├── public/         # Home, About, Services, HowItWorks, FAQ, Contact, Login, Signup
│   │   │   ├── student/        # Dashboard, Profile, Inquiry, Consultation, Bookings, Documents, Applications, Payments, Notifications, Support
│   │   │   └── status/         # 404 NotFound, 403 Unauthorized, 500 ErrorPage
│   │   ├── services/           # apiClient.js + Domain Services (auth, student, case, booking, document, payment, etc.)
│   │   └── utils/              # formatters.js (INR currency, dates), validators.js
│   ├── package.json
│   └── vite.config.js
│
├── functions/                  # Zoho Catalyst Functions (Node.js Serverless)
│   ├── auth/                   # Signin, Signup, Session Verification, Password Reset
│   ├── leads/                  # Student Inquiries & CRM Lead creation
│   ├── students/               # Student profile retrieval & updates
│   ├── cases/                  # Application milestones & status
│   ├── bookings/               # Consultation scheduling & Zoho Bookings
│   ├── documents/              # File uploads & Zoho WorkDrive integration
│   ├── payments/               # Student invoices & Zoho Books ledger
│   ├── notifications/          # Real-time activity feed
│   ├── crm/                    # Zoho CRM sync status & manual sync
│   ├── webhooks/               # Inbound Zoho Flow/CRM callback receiver
│   ├── shared/                 # Data Store layer, response envelope, Zoho clients
│   │   ├── zoho/               # oauth.js, crm.js, books.js, bookings.js, workdrive.js, flow.js, phoneVerify.js
│   │   ├── dataStore.js        # Catalyst Data Store abstraction
│   │   ├── response.js         # Standard API envelopes
│   │   └── zohoClient.js       # Central Zoho client
│   └── devServer.js            # Catalyst Local API Gateway
│
├── shared/                     # Shared root module
│   └── index.js
│
├── catalyst.json               # Zoho Catalyst Project Configuration
├── .env.example                # Safe environment variable templates
├── .gitignore                  # Production git rules
└── README.md                   # Project documentation
```

---

## 3. Environment Configuration

Copy `.env.example` to `.env` and provide your actual credentials:

```bash
# Frontend Variables (Safe / Public Only)
VITE_API_BASE_URL=/api
VITE_APP_ENV=development
VITE_SALESIQ_WIDGET_CODE=
VITE_COMPANY_NAME=RichenQuest
VITE_SUPPORT_EMAIL=admissions@richenquest.com
VITE_SUPPORT_PHONE=+91 76312 07948
VITE_WHATSAPP_NUMBER=+447700900077

# Server-Side Configuration
PORT=5000
NODE_ENV=development
CATALYST_PROJECT_ID=
CATALYST_PROJECT_DOMAIN=

# Zoho CRM Server-Side OAuth
ZOHO_CRM_CLIENT_ID=
ZOHO_CRM_CLIENT_SECRET=
ZOHO_CRM_REFRESH_TOKEN=
ZOHO_CRM_ORG_ID=

# Zoho Flow Webhook URLs
ZOHO_FLOW_LEAD_WEBHOOK_URL=
ZOHO_FLOW_BOOKING_WEBHOOK_URL=
ZOHO_FLOW_DOCUMENT_WEBHOOK_URL=
ZOHO_FLOW_PAYMENT_WEBHOOK_URL=

# Zoho Books Integration
ZOHO_BOOKS_ORG_ID=
ZOHO_BOOKS_AUTH_TOKEN=

# Zoho WorkDrive Root Folder
ZOHO_WORKDRIVE_ROOT_FOLDER_ID=

# Zoho Bookings Integration
ZOHO_BOOKINGS_SERVICE_ID=
ZOHO_BOOKINGS_STAFF_ID=

# External Phone Verification (Twilio / SMS Gateway)
SMS_PROVIDER_NAME=twilio
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_VERIFY_SERVICE_SID=
```

---

## 4. Local Development

### 1. Install Dependencies
```bash
npm install
npm run --prefix client install
```

### 2. Run Application
```bash
npm run dev
```

* **Frontend**: `http://localhost:3000`
* **API Gateway**: `http://localhost:5000/api/health`

---

## 5. Production Deployment via Zoho Catalyst

### Step 1: Install Catalyst CLI
```bash
npm install -g zcatalyst-cli
```

### Step 2: Login and Link Project
```bash
catalyst login
catalyst init
```

### Step 3: Build & Deploy
```bash
npm run build
catalyst deploy
```

---

## 6. License
© RichenQuest Education Ltd. All rights reserved.
