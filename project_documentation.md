# PGMS: Paying Guest Management System
## Project Documentation

**Version:** 1.0.0  
**Date:** April 9, 2026  

---

## 1. Project Overview
**PGMS** is a comprehensive solution designed to streamline the management of Paying Guest (PG) accommodations. The system bridges the gap between PG owners and tenants through a synchronized ecosystem comprising a Web Admin Portal, a Tenant Mobile Application, and a dedicated IoT Device Service.

### Key Benefits:
- **Efficiency:** Automated rent tracking and billing.
- **Transparency:** Real-time access to payment history and logs for tenants.
- **Security:** Integrated device management for access control and monitoring.
- **Engagement:** Simplified support ticket and maintenance request system.

---

## 2. System Architecture
The system follows a modern microservices-inspired architecture to ensure scalability and reliability.

- **Frontend (Web):** React 19 + Vite (High-performance admin dashboard)
- **Mobile (Tenant):** React Native + Expo (Cross-platform accessibility)
- **Backend API:** Node.js + Express (Robust business logic)
- **Device Service:** Python + FastAPI (Low-latency IoT/Hardware integration)
- **Database:** Supabase (Remote PostgreSQL) + SQLite (Local development/Sync)

---

## 3. Core Components

### 3.1 Web Admin Portal
Designed for PG Owners to oversee operations.
- **Dashboard:** Real-time statistics on occupancy, payments, and active devices.
- **Tenant Management:** Digital onboarding, profile management, and document tracking.
- **Room & Floor Management:** Visual hierarchy of floors, rooms, and bed availability.
- **Payment System:** Rent generation, transaction recording, and dues tracking.
- **Device Control:** Manage IoT devices, viewing real-time status and logs.
- **Reporting:** Analytical reports for revenue and occupancy trends.
- **Support Helpdesk:** Centralized system to manage and resolve tenant issues.

### 3.2 Tenant Mobile App (Tenant-PGMS)
A user-centric app for tenants to stay connected with the PG environment.
- **User Dashboard:** Quick view of current dues and upcoming rent.
- **Payment Portal:** Secure payment history and balance details.
- **Access Logs:** Personal entry/exit logs recorded via integrated hardware.
- **Profile Management:** Update personal details and Emergency contacts.
- **Support Tickets:** Instantly raise and track maintenance or service requests.

### 3.3 Device & IoT Service
A backend service dedicated to hardware integration.
- **Real-time Monitoring:** WebSockets for live device status updates.
- **Access Control:** Manage schedules for entry/exit points.
- **Automated Logging:** seamless synchronization of hardware events with the central database.

---

## 4. Technical Stack Details

| Technology | Purpose |
| :--- | :--- |
| **React 19** | Modern UI development for Web |
| **Expo / React Native** | Cross-platform mobile development (iOS/Android) |
| **Node.js (Express)** | Scalable Backend API layer |
| **Python (FastAPI)** | High-performance service for IoT devices |
| **Knex.js** | SQL Query building and migrations |
| **Supabase** | Cloud-hosted PostgreSQL database |
| **JWT & Bcrypt** | Secure authentication and password hashing |
| **Docker** | Containerization for consistent deployment |

---

## 5. Security & Reliability
- **Authentication:** JSON Web Tokens (JWT) for secure state management.
- **Data Protection:** Hashed passwords using Bcrypt.
- **Scalability:** Independent services allow for scaling the Web or Mobile components based on traffic.
- **Data Integrity:** Transactional database operations using Knex.js to prevent data corruption.

---

## 6. Installation & Deployment

### Backend Setup
1. Navigate to `/backend`.
2. Install dependencies: `npm install`.
3. Configure `.env` with Supabase and Secret keys.
4. Run migrations: `npx knex migrate:latest`.
5. Start server: `npm run dev`.

### Web Frontend Setup
1. Navigate to `/frontend`.
2. Install dependencies: `npm install`.
3. Start development server: `npm run dev`.

### Mobile App Setup
1. Navigate to `/Tenant-PGMS/tenant-app`.
2. Install dependencies: `npm install`.
3. Start Expo: `npx expo start`.

---

## 7. Future Roadmap
- **Automated Invoicing:** Email/SMS notification for rent reminders.
- **Payment Gateway Integration:** Direct payment processing within the app.
- **Biometric Integration:** Advanced hardware support for facial/fingerprint recognition.
- **AI Analytics:** Predict occupancy trends and maintenance needs.

---
**Prepared by PGMS Development Team**
