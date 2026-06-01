# 05 — Wireframes: Owner App

Low-fidelity, mobile-first (≈375pt frame). Boxes show **structure and hierarchy**, not visual style.
Real content used so the designer can judge density and localization length. These show structure
and behavior only — **all visual styling is the designer's to define** (see `00-visual-foundation.md`
for inputs and constraints).

Conventions: `[ Button ]` button · `( ) / (•)` radio · `[x]` checkbox · `▸` chevron/disclosure ·
`◀` back · `≡` overflow · `🔍` search · `+` add · `▢` image/avatar placeholder · `══` active tab.

---

## 1. Splash

```
┌──────────────────────────┐
│                          │
│                          │
│           ▢              │
│        [ Logo ]          │
│        AppName           │
│                          │
│         (spinner)        │
│                          │
└──────────────────────────┘
```
Checks token → routes to Login or Home. Show brand for ≥600ms even if check is instant.

---

## 2. Login (phone)

```
┌──────────────────────────┐
│                          │
│   Xush kelibsiz 👋        │
│   Enter your phone        │
│                          │
│  ┌──────────────────────┐ │
│  │ +998 │  90 123 45 67 │ │
│  └──────────────────────┘ │
│                          │
│  [   Send code        ]  │  ← primary action
│                          │
│  By continuing you agree  │
│  to the Terms.            │
└──────────────────────────┘
```
Country code fixed to +998 (mask input). Disable CTA until valid length.

---

## 3. OTP

```
┌──────────────────────────┐
│ ◀                        │
│  Enter the code           │
│  Sent to +998 90 •• •• 67 │
│                          │
│   ▢   ▢   ▢   ▢          │  ← 4 boxes, auto-advance
│                          │
│  [   Verify          ]   │
│                          │
│  Resend code in 0:42      │  ← countdown, then link
└──────────────────────────┘
```
Auto-submit on 4th digit. Error state shakes boxes + red helper. (Dev code 1234.)

---

## 4. Onboarding (5-step wizard)

Shared chrome: progress dots `● ● ○ ○ ○`, `◀ Back`, primary `Next` / final `Finish`.

```
STEP 1 — Business              STEP 2 — What do you do?       STEP 3 — Language
┌────────────────────┐         ┌────────────────────┐        ┌────────────────────┐
│ ◀  ● ○ ○ ○ ○        │         │ ◀  ● ● ○ ○ ○        │        │ ◀  ● ● ● ○ ○        │
│ Your business       │         │ Choose your mode(s) │        │ Language            │
│   ▢ add photo       │         │ [x] 🛍 Products      │        │ (•) Oʻzbekcha       │
│ ┌────────────────┐  │         │ [ ] ✂ Services      │        │ ( ) Русский         │
│ │ Name           │  │         │ [ ] 💻 Freelance     │        │                     │
│ └────────────────┘  │         │  (multi-select ok)  │        │ Used for app + bot. │
│ ┌────────────────┐  │         │                     │        │                     │
│ │ Description    │  │         │                     │        │                     │
│ └────────────────┘  │         │                     │        │                     │
│ [     Next      ]   │         │ [     Next      ]   │        │ [     Next      ]   │
└────────────────────┘         └────────────────────┘        └────────────────────┘

STEP 4 — Get paid                STEP 5 — Your bot
┌────────────────────┐          ┌────────────────────┐
│ ◀  ● ● ● ● ○        │          │ ◀  ● ● ● ● ●        │
│ Payment card        │          │ Connect Telegram bot│
│ Card number         │          │ 1. Open @BotFather  │
│ ┌────────────────┐  │          │ 2. Paste token:     │
│ │ 8600 •••• •••• │  │          │ ┌────────────────┐  │
│ └────────────────┘  │          │ │ token…         │  │
│ Bank: (•)Uzcard ( )Humo        │ └────────────────┘  │
│                     │          │  ┌──────┐           │
│ [ Skip ]  [ Next ]  │          │  │ ▢ QR │ t.me/...  │
│ Skipping blocks      │          │  └──────┘ [Copy]   │
│ paid orders.         │          │ [    Finish     ]  │
└────────────────────┘          └────────────────────┘
```

---

## 5. Home / Dashboard (mode-aware)

```
┌──────────────────────────┐
│ Good morning, Dilnoza  🔔 │  ← greeting + notifications
│ Cake Studio · 🛍✂          │  ← business + active modes
├──────────────────────────┤
│ ┌─────────┐ ┌─────────┐   │  ← StatCard row (scrolls)
│ │ Today   │ │ Revenue │   │
│ │  4 new  │ │ 320 000 │   │
│ │ orders  │ │  UZS    │   │
│ └─────────┘ └─────────┘   │
│                          │
│ Quick actions             │  ← fast shortcuts to top tasks
│ [+ Order] [+ Product] [📅]│
│                          │
│ Needs attention           │  ← actionable list
│ • #1042 paid — confirm ▸  │  (warning)
│ • Booking req 14:00    ▸  │
│ • Milestone review     ▸  │
│                          │
│ Today's schedule (svc)    │  ← only if SERVICES on
│ 10:00 Haircut — Aziz      │
│ 14:00 Color  — Aziz       │
├──────────────────────────┤
│ Home  Orders  Cust  Msg ≡ │  ← bottom tabs (mode-composed)
│ ══                        │
└──────────────────────────┘
```
"Needs attention" is the heart of Home — surfaces every pending owner action across all modes.

---

## 6. Catalog (product list)

```
┌──────────────────────────┐
│ ◀  Catalog        🔍  +   │
├──────────────────────────┤
│ [ All ][ Active ][Paused] │  ← filter chips
│ ┌──────────────────────┐  │
│ │ ▢  Chocolate cake     │  │  ← thumb + name
│ │    150 000 UZS  ·12 in│  │     price + stock
│ │    ● Active        ▸  │  │     status dot
│ ├──────────────────────┤  │
│ │ ▢  Cupcakes (box 6)   │  │
│ │    60 000 UZS · ∞      │  │  ← unlimited
│ │    ○ Paused        ▸  │  │
│ └──────────────────────┘  │
│                          │
│        [ + Product ]      │  ← FAB or sticky CTA
└──────────────────────────┘
EMPTY: ▢ "No products yet. Add your first to start selling." [ + Product ]
```

---

## 7. Product detail

```
┌──────────────────────────┐
│ ◀  Product        ✎  ≡    │  ← edit, overflow(delete/toggle)
├──────────────────────────┤
│ ▢▢▢  (photo carousel ● ○) │
│ Chocolate cake            │
│ 150 000 UZS               │
│ ● Active        [Pause]   │
│                          │
│ Description               │
│ Rich dark chocolate…      │
│                          │
│ Stock        12  · prep 2d│
│ Variants                  │
│  • Small  120 000          │
│  • Large  180 000          │
│                          │
│ Recent orders (3)      ▸  │
└──────────────────────────┘
```

---

## 8. Product form (new / edit)

```
┌──────────────────────────┐
│ ✕  New product     Save   │
├──────────────────────────┤
│ Photos                    │
│ [▢][▢][ + ]               │  ← image_picker, reorderable
│ Name      [____________]  │
│ Description [__________]  │
│ Price     [______] UZS    │
│ Stock     [____] [x]∞     │  ← unlimited toggle disables qty
│ Prep time [______]        │
│ Variants            [ + ] │
│  • Small [120000] [🗑]     │
│ Active    ( on/off )      │
│                          │
│ [        Save         ]   │
└──────────────────────────┘
```

---

## 9. Orders (list)

```
┌──────────────────────────┐
│ ◀  Orders     🔍  ⛃filter │
├──────────────────────────┤
│ [New][Preparing][Ready]…  │  ← status filter chips (scroll)
│ ┌──────────────────────┐  │
│ │ #1042  Dilnoza        │  │
│ │ 150 000 UZS · 2 items │  │
│ │ 🟠 Paid — confirm     │  │  ← payment + order status badges
│ │ NEW            12:30 ▸│  │
│ ├──────────────────────┤  │
│ │ #1041  Aziz           │  │
│ │ 60 000 UZS            │  │
│ │ 🟢 Confirmed · PREPARING│ │
│ └──────────────────────┘  │
└──────────────────────────┘
```
Each row carries **two** statuses (payment + fulfillment). Designer: define the dual-badge layout.

---

## 10. Order detail

```
┌──────────────────────────┐
│ ◀  Order #1042       ≡    │
├──────────────────────────┤
│ 🟠 Payment received        │  ← prominent payment banner
│ [   Confirm payment    ]  │  ← THE primary action on this screen
│                          │
│ Customer                  │
│  ▢ Dilnoza · +998 …    ▸  │
│ Items                     │
│  2× Cupcakes      120 000 │
│  1× Card           30 000 │
│  ─────────────────────    │
│  Total            150 000 │
│ Delivery                  │
│  🚚 Delivery · Chilonzor… │
│  Date: 2 Jun              │
│ Notes / internal notes    │
│                          │
│ Status                    │
│  NEW › PREPARING › READY…  │  ← stepper to advance
│ Timeline                  │
│  • 12:30 Order placed      │
│  • 12:34 Marked paid       │
└──────────────────────────┘
```

---

## 11. Customers (list)

```
┌──────────────────────────┐
│ ◀  Customers     🔍       │
├──────────────────────────┤
│ ┌──────────────────────┐  │
│ │ ▢ Dilnoza             │  │
│ │   +998 90 … · 6 orders│  │
│ │   last seen 2d ago  ▸ │  │
│ ├──────────────────────┤  │
│ │ ▢ Aziz                │  │
│ │   3 orders · 1 booking│  │
│ └──────────────────────┘  │
└──────────────────────────┘
```

---

## 12. Customer detail

```
┌──────────────────────────┐
│ ◀  Customer          ≡    │
├──────────────────────────┤
│   ▢  Dilnoza              │
│   +998 90 123 45 67       │
│   @dilnoza_tg · UZ         │
│ ┌─────┐┌─────┐┌─────┐     │
│ │6 ord││2 apt││1 prj│     │  ← lifetime mini-stats
│ └─────┘└─────┘└─────┘     │
│ Notes (owner only)    ✎   │
│  "Allergic to nuts"        │
│ History (tabs)            │
│ [Orders][Bookings][Msgs]  │
│  • #1042 150 000  CONF    │
│  • #1039 90 000   DELIV   │
│ [   Message customer   ]  │
└──────────────────────────┘
```

---

## 13. Appointments — calendar

```
┌──────────────────────────┐
│ ◀ Appointments  [Day|Week]│  ← view toggle
├──────────────────────────┤
│ ‹  Mon, 2 Jun 2026  ›     │
│ Staff: [All ▾]            │
├──────────────────────────┤
│ 09 ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄    │
│ 10 ▟ Haircut · Dilnoza    │  ← confirmed block (filled)
│ 11 ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄    │
│ 12 ▚ Color · req      ▸   │  ← requested (hatched)
│ 13 ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄    │
│ 14 ▟ Shave · Aziz         │
├──────────────────────────┤
│              [ + Booking ]│
└──────────────────────────┘
```
Distinguish **requested vs confirmed vs completed/no-show** visually (fill, hatch, dim). Week view =
7 day-columns with stacked blocks.

---

## 14. Appointment detail

```
┌──────────────────────────┐
│ ◀  Appointment       ≡    │
├──────────────────────────┤
│ 🟠 REQUESTED               │
│ [ Confirm ]  [ Decline ]  │
│                          │
│ Haircut · 45 min          │
│ 2 Jun 2026 · 14:00–14:45  │
│ Staff: Aziz               │
│ Customer ▢ Dilnoza     ▸  │
│ Price 80 000 · pay at appt│
│ Payment 🟠 Pending         │
│ Notes …                   │
│ Status: Confirm › Complete│
│         · No-show · Cancel│
└──────────────────────────┘
```

---

## 15. Services (list + form)

```
LIST                          FORM (sheet)
┌────────────────────┐        ┌────────────────────┐
│ ◀ Services    +     │        │ ✕  Service    Save  │
├────────────────────┤        │ Name [___________]  │
│ ✂ Haircut           │        │ Duration [45] min   │
│   45 min · 80 000   │        │ Price [80000] UZS   │
│   ● Active     ▸    │        │ Staff who do this:  │
│ ✂ Color             │        │  [x] Aziz [ ] Lola  │
│   90 min · 150 000  │        │ Active ( on/off )   │
│   ○ Paused     ▸    │        │ [      Save      ]  │
└────────────────────┘        └────────────────────┘
```

---

## 16. Staff (list + form)

```
LIST                          FORM
┌────────────────────┐        ┌────────────────────┐
│ ◀ Staff       +     │        │ ✕  Staff      Save  │
├────────────────────┤        │ ▢ photo             │
│ ▢ Aziz              │        │ Name [___________]  │
│   @aziz · 3 services│        │ Telegram @[______]  │
│   Mon–Sat        ▸  │        │ Working hours  ▸    │
│ ▢ Lola              │        │ Days off (cal)  ▸   │
│   Tue–Sun        ▸  │        │ Services [x][ ][ ]  │
│             [ + ]   │        │ [  Save  ][ Remove ]│
└────────────────────┘        └────────────────────┘
```

---

## 17. Projects (list)

```
┌──────────────────────────┐
│ ◀  Projects       +       │
├──────────────────────────┤
│ ┌──────────────────────┐  │
│ │ Promo video — Kamola  │  │
│ │ 5 000 000 UZS         │  │
│ │ ▰▰▰▱▱  2/4 milestones │  │  ← progress
│ │ 🔵 IN_PROGRESS · 12 Jun│ │  ← status + deadline
│ ├──────────────────────┤  │
│ │ Logo pack — Bek       │  │
│ │ 🟣 PROPOSAL_SENT    ▸ │  │
│ └──────────────────────┘  │
└──────────────────────────┘
```

---

## 18. Project detail

```
┌──────────────────────────┐
│ ◀  Project           ≡    │
├──────────────────────────┤
│ Promo video               │
│ Kamola · 5 000 000 UZS    │
│ 🔵 IN_PROGRESS             │
│ Start 1 Jun · Due 12 Jun  │
│ [ Share proposal link 🔗 ]│
│                          │
│ Milestones          [ + ] │
│ ┌──────────────────────┐  │
│ │ ① Script   PAID     ✓ │  │
│ │ ② Rough cut  REVIEW ▸ │  │
│ │ ③ Final    PENDING    │  │
│ └──────────────────────┘  │
│ Invoices                  │
│  • INV-001 2 500 000 PAID │
│  • [ Generate invoice ]   │
└──────────────────────────┘
```

---

## 19. Milestone form

```
┌──────────────────────────┐
│ ✕  Milestone      Save    │
├──────────────────────────┤
│ Name   [_______________]  │
│ Due date   [ 8 Jun ▾ ]    │
│ Amount [1 000 000] UZS    │
│ Status [ Pending ▾ ]      │
│ [        Save         ]   │
└──────────────────────────┘
```

---

## 20. Analytics

```
┌──────────────────────────┐
│ ◀  Analytics  [Week|Mo|Yr]│
├──────────────────────────┤
│ ┌─────────┐ ┌─────────┐   │
│ │ Revenue │ │ Orders  │   │
│ │ 4.2M UZS│ │   38    │   │
│ │ ▲ 12%   │ │ ▲ 5     │   │
│ └─────────┘ └─────────┘   │
│ Revenue trend             │
│  ▁▂▃▅▇▆▄  (line/bar)      │
│ Top customers             │
│  1. Dilnoza   1.1M        │
│  2. Bek        800k       │
│ Top products / services   │
│  • Chocolate cake  ×12    │
│ Bookings by staff (svc)   │
└──────────────────────────┘
```

---

## 21. Messages — inbox

```
┌──────────────────────────┐
│ ◀  Messages      🔍       │
├──────────────────────────┤
│ ┌──────────────────────┐  │
│ │ ▢ Kamola         12:40│  │
│ │   "Is the cut done?"  │  │
│ │                    ●  │  │  ← unread dot
│ ├──────────────────────┤  │
│ │ ▢ Bek            Mon  │  │
│ │   You: "Sent, thanks" │  │
│ └──────────────────────┘  │
└──────────────────────────┘
```

---

## 22. Conversation

```
┌──────────────────────────┐
│ ◀ ▢ Kamola           ▸    │  ← tap header → customer detail
├──────────────────────────┤
│        ┌───────────────┐  │
│        │ Is it ready?  │  │  ← customer (left)
│        └───────────────┘  │
│  ┌───────────────┐        │
│  │ Yes! Ready 4pm│        │  ← owner message (right-aligned)
│  └───────────────┘        │
├──────────────────────────┤
│ [ Type a message…   ] [➤]│
└──────────────────────────┘
```
Replies delivered through the bot. Show delivery state if available.

---

## 23. Settings

```
┌──────────────────────────┐
│ ◀  Settings               │
├──────────────────────────┤
│ ▢ Cake Studio          ▸  │  ← business profile
│                          │
│ Business                  │
│  Profile & photo       ▸  │
│  Modes (🛍✂💻)          ▸  │
│  Working hours         ▸  │
│ Payment                   │
│  Card · 8600 ••••      ▸  │
│ Telegram bot              │
│  @cakestudio_bot · QR  ▸  │
│ Preferences               │
│  Language [UZ ▾]          │
│  Theme  (Light/Dark/Sys)  │
│  Notifications         ▸  │
│ ─────────────             │
│  Help & support        ▸  │
│  [    Log out    ]        │
└──────────────────────────┘
```

---

## State variants required for every list/detail screen

For each screen above, the designer delivers: **default · loading (skeleton) · empty · error
(retry) · offline (cached banner)**. See `08-deliverables-checklist.md`.
