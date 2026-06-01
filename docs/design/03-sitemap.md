# 03 — Sitemap

Two trees: the **Owner App** (Flutter routes, canonical in CLAUDE.md) and the **Customer Bot**
(Telegram conversation states).

## Owner App sitemap

```
Splash  (/)                         ── auth check → routes to Login or Home
│
├─ Login  (/login)                  ── phone entry
│   └─ OTP  (/otp)                   ── 4-digit code (dev code 1234)
│       └─ Onboarding  (/onboarding) ── first run only; multi-step:
│            ├─ 1. Business name + photo
│            ├─ 2. Mode selection (Products / Services / Freelance, multi)
│            ├─ 3. Language (Uzbek / Russian)
│            ├─ 4. Payment card (number + Uzcard/Humo)
│            └─ 5. Bot setup (token, username, QR + link)
│
└─ Home  (/home)  ★ tab                dashboard, mode-aware summary
   │
   ├─ PRODUCTS mode ───────────────────────────────────────────
   │  ├─ Catalog  (/catalog)  ★ tab
   │  │   ├─ New product   (/catalog/new)
   │  │   ├─ Product detail (/catalog/:id)
   │  │   └─ Edit product   (/catalog/:id/edit)
   │  └─ Orders  (/orders)  ★ tab
   │      └─ Order detail   (/orders/:id)   ── timeline, payment confirm
   │
   ├─ SERVICES mode ───────────────────────────────────────────
   │  ├─ Appointments  (/appointments)  ★ tab   ── day & week calendar
   │  │   └─ Appointment detail (/appointments/:id)
   │  ├─ Services  (/services)                  ── list + form
   │  └─ Staff  (/staff)                        ── list + form
   │
   ├─ FREELANCE mode ──────────────────────────────────────────
   │  └─ Projects  (/projects)  ★ tab
   │      └─ Project detail (/projects/:id)     ── milestones + invoices
   │          └─ New milestone (/projects/:id/milestone/new)
   │
   └─ Always available ────────────────────────────────────────
      ├─ Customers  (/customers)  ★ tab
      │   └─ Customer detail (/customers/:id)   ── full history + notes
      ├─ Messages  (/messages)  ★ tab
      │   └─ Conversation (/messages/:customerId)
      ├─ Analytics  (/analytics)                ── period stats
      └─ Settings  (/settings)                  ── business, payment, bot, language, theme, logout
```

`★ tab` = candidate for the bottom tab bar (composition varies by mode — see IA doc). Non-tab
destinations live under **More** / Settings.

### Screen count (owner app)
Splash, Login, OTP, Onboarding (5 steps), Home, Catalog list, Product detail, Product form,
Order list, Order detail, Customer list, Customer detail, Appointment calendar, Appointment detail,
Service list, Service form, Staff list, Staff form, Project list, Project detail, Milestone form,
Analytics, Messages inbox, Conversation, Settings.
→ **~25 unique screens** (some forms reused new/edit), each needing default / loading / empty /
error states.

## Customer Bot sitemap (conversation states)

```
/start  ──→  Welcome (branches by business mode)
│
├─ PRODUCT SELLER flow
│   Browse catalog ─→ Product detail ─→ (variant select) ─→ Add to cart
│        └─→ View cart ─→ Edit / Checkout
│             └─→ Checkout: name → phone → delivery method → address → notes
│                  └─→ Order summary ─→ Confirm
│                       └─→ Payment instructions (card + copy + #orderNo)
│                            └─→ "I have paid" ─→ Awaiting confirmation
│                                 └─→ Owner confirms ─→ Order confirmed msg
│
├─ SERVICE BUSINESS flow
│   Book appointment ─→ Select service ─→ Select staff (if >1)
│        └─→ Select date (14-day, available only) ─→ Select time slot
│             └─→ Confirm booking
│                  ├─ pay-at-appointment ─→ Booking confirmed
│                  └─ pay-in-advance ─→ Payment instructions ─→ "I have paid" ─→ Confirmed
│   Reminder (cron, 24h before) ─→ customer may reply CANCEL ─→ Cancellation handled
│
├─ FREELANCER flow
│   View my project ─→ Project status (current milestone, deadline, payment)
│        └─→ Send message ─→ forwarded to owner inbox
│   Invoice notification ─→ invoice details
│
└─ GENERAL commands (always)
    /orders        ─→ list customer's orders + status
    /appointments  ─→ list upcoming appointments
    /projects      ─→ active project status
    /help          ─→ available commands
```

See `06-wireframes-bot.md` for each state's message + keyboard layout.
