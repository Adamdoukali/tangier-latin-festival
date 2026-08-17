# Tangier Latin Festival 2027 — Partner / Collaborator System Architecture & Features

This document explains the complete architecture, features, and workflows of the Partner Portal for the Tangier Latin Festival 2027. It is designed to provide full context to an AI model or developer explaining the partner system.

---

## 1. What is a Partner / Collaborator?
A **Partner** (Collaborator) is a promoter, dance artist, dance school, ambassador, or affiliate who promotes the Tangier Latin Festival. Each partner has:
- A unique **Partner Code** (e.g., `ADAM`, `SALSA_PARIS`, `LATIN_MADRID`).
- A dedicated **Partner Portal** accessible via `partner.tangierlatinfestival.com` or `/partner`.
- A dedicated **Referral Link** (e.g., `tickets.tangierlatinfestival.com/ADAM` or `/book?ref=ADAM`).
- An assigned **Commission Structure** and optional **Milestone Mission Goal**.
- An allocated quota of **Free/VIP Guest Invites** to grant to VIPs or team members.

---

## 2. Core Features & Capabilities

### A. Authentication & Security
- **Email + Password Login**: Partners log into their portal using their email and secure password (hashed via SHA-256 with salt).
- **Session Management**: Secure session persistence with automatic token management in `localStorage`.
- **Self-Service Password Reset**: Partners can request a reset link via email or update their password directly from their profile.
- **Admin Activation Toggle**: Admins can activate or deactivate partner accounts at any time.

### B. Partner Referral Tracking & Booking Attribution
- **Short Referral Links**: Partners receive custom URLs like `tickets.tangierlatinfestival.com/:code`.
- **Automatic Language Sync**: The partner's link automatically configures the festival booking page in the partner's designated language (`en` English, `fr` French, `es` Spanish).
- **Attribution Engine**: When a client opens a partner link, the partner code is stored in `localStorage` (`tlf_ref_code`). When the client submits a booking request, the booking is permanently linked to the partner's ID (`collaboratorId`).

### C. Commission Structures
The system supports three flexible commission models per partner:
1. **Percentage Commission**:
   - E.g., `10%` or `15%` of the net sales revenue generated.
2. **Per-Person Commission (Flat Rate)**:
   - E.g., `20 EUR` or `200 MAD` per person who attends.
3. **Split Per-Person Rate by Room Category**:
   - **Double Room**: e.g., `25 EUR` per person (Double room with 2 people = `50 EUR`).
   - **Single Room**: e.g., `20 EUR` per person.
   - **Full Pass / Special Pack**: e.g., `15 EUR` per person.
4. **Promo Code Overrides**:
   - If a special discount code is used, it can override the standard partner commission (e.g., lowered to €10/person).

### D. Milestone Mission Award (Gamification / Bonus Challenge)
- Admins can assign a **Mission Goal** to a partner (e.g., "Bring 10 people to the festival").
- **Mission Reward**: E.g., "1 Free Hotel Room", "Free Full Pass", or "500 MAD Cash Bonus".
- **Per-Person Progress**: Every person booked (e.g. 2 guests in a double room count as 2 towards the goal) counts towards the mission progress in real-time.
- **Fair Commission Engine**: The first $N$ people fulfill the mission award. Once the mission is achieved ($Progress \ge Goal$), regular commissions immediately start on all subsequent people sold.

### E. Free VIP / Team Invites Management
- Each partner has an invite quota (e.g., 5 free passes).
- **Issue Invites**: The partner enters the guest's name, email, and notes to generate a unique invite link.
- **Redemption Flow (`/redeem?code=...`)**: The recipient fills in their details, dates, and claims their official festival pass.
- **Live Status Tracking**: The partner sees which invites have been claimed and which are still pending.

### F. Real-Time Bookings & Guest Management
- **Live Booking List**: Displays all customer bookings made through the partner's link.
- **Status Badges**: Shows `Pending`, `Confirmed`, `Checked-in`, or `Declined`.
- **Double Room Breakdown**: Clearly displays multi-guest bookings with per-person and total pricing breakdowns (e.g. `2 people (325 €/pers → 650 €)`).
- **One-Click Confirmation**: Partners can approve pending bookings. Confirming a booking automatically triggers:
  1. An official confirmation email with ticket details in the guest's language.
  2. Live QR code pass generation.
  3. PDF ticket generator with festival schedule and details.

### G. Shareable Marketing Tools & QR Codes
- **Instant QR Code Generator**: Generates a downloadable, high-resolution QR code pointing directly to the partner's booking page.
- **One-Click Copy**: Quick buttons to copy referral links, invite links, and WhatsApp sharing messages.
- **Multi-Currency Support**: Automatic formatting in EUR (€), MAD (Moroccan Dirham), or USD ($).

---

## 3. Included Source Files
- `partner.tsx`: The full client-facing Partner Portal UI, analytics, mission card, booking table, invite generator, and QR tools.
- `admin_collaborators.tsx`: The Admin dashboard for managing all festival partners, setting deals, commissions, and monitoring live sales.
- `admin_store.ts`: The complete business logic, commission calculator, mission progress tracker, and Supabase database interactions.
- `book.tsx`: The public booking page with partner referral detection and language syncing.
- `invite.tsx` & `redeem.tsx`: The VIP invite generation and redemption system.
