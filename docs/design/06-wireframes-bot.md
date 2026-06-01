# 06 — Wireframes: Telegram Bot (Customer)

The bot has **no custom UI canvas** — design works within Telegram's primitives: message text,
photos, **inline keyboards** (buttons under a message), **reply keyboards**, the command menu, and
the share/contact buttons. The designer's deliverable here is **message copy structure + button
layout + which photo/format per state**, in both Uzbek and Russian, plus a small set of branded
images (welcome banner, payment card visual).

Conventions: `▢` photo · `[ Button ]` inline button · rows of `[ ]` = keyboard rows · `‹cmd›` slash
command · text in quotes = message body. The bot speaks the **business's** configured language.

---

## Welcome (`/start`) — branches by business mode

```
PRODUCT SELLER                 SERVICE BUSINESS              FREELANCER
▢ business banner              ▢ business banner             ▢ business banner
"Welcome to Cake Studio! 🎂    "Welcome to Aziz Barber! ✂   "Welcome to Kamola Studio 🎬
 Browse our catalog and        Book your appointment in       View your project status
 order in a few taps."         a few taps."                   any time."
[ 🛍 Browse catalog ]          [ 📅 Book appointment ]        [ 📁 View my project ]
[ 📦 My orders ]               [ 🗓 My appointments ]         [ 💬 Message us ]
[ 💬 Message us ]              [ 💬 Message us ]
```
Multi-mode business shows a button per enabled mode.

---

## PRODUCT SELLER FLOW

### Browse catalog
```
"Our catalog 🛍  Tap a product:"
[ Chocolate cake — 150 000 ]
[ Cupcakes (box 6) — 60 000 ]
[ Birthday card — 30 000 ]
[ 🛒 View cart (2) ]   [ ✕ ]
```

### Product detail
```
▢ product photo(s)
"Chocolate cake
 150 000 UZS
 Rich dark chocolate sponge…
 Prep time: 2 days"
─ if variants ─
"Choose size:"
[ Small 120 000 ] [ Large 180 000 ]
─
[ ➖ ] 1 [ ➕ ]
[ 🛒 Add to cart ]
[ ◀ Back to catalog ]
```

### Cart
```
"Your cart 🛒
 2× Cupcakes      120 000
 1× Card           30 000
 ─────────────────
 Total            150 000 UZS"
[ ✏ Edit ] [ 🗑 Clear ]
[ ✅ Checkout ]
[ ◀ Keep shopping ]
```

### Checkout (step-by-step prompts)
```
1 "What's your name?"            → free text
2 "Your phone number?"           → [ 📱 Share contact ] or text
3 "Pickup or delivery?"          → [ 🏠 Pickup ] [ 🚚 Delivery ]
4 (if delivery) "Delivery address?" → free text
5 "Any notes for your order?"    → [ Skip ] or text
```
Each step shows `[ ◀ Back ]`. Bot echoes captured value so the customer can verify.

### Order summary
```
"Please confirm your order:
 2× Cupcakes, 1× Card
 Total: 150 000 UZS
 🚚 Delivery → Chilonzor 12
 Notes: leave at door"
[ ✅ Confirm order ]
[ ✏ Edit ] [ ✕ Cancel ]
```

### Payment instructions  ★ trust-critical
```
"Order #1042 placed! 🎉
 To pay, transfer 150 000 UZS to:

   8600 1234 5678 9012   (Uzcard)

 ⚠ Write #1042 in the transfer comment."
[ 📋 Copy card number ]
[ ✅ I have paid ]
[ ❓ Need help ]
```
Designer: make card number visually unmistakable (own line, monospace-feel, copy button). Consider a
branded card image as the photo.

### Awaiting confirmation → confirmed
```
After "I have paid":
"Thanks! We're confirming your payment.
 You'll get a message once it's confirmed. ⏳"

Owner confirms →
"✅ Payment confirmed! Your order #1042 is now being prepared.
 We'll update you at each step."

Status updates (auto):
"📦 Order #1042 is READY for delivery."
"🚚 Order #1042 has been delivered. Thank you! 🙏"
```

---

## SERVICE BUSINESS FLOW

### Select service
```
"Choose a service:"
[ ✂ Haircut — 45 min · 80 000 ]
[ 🎨 Color — 90 min · 150 000 ]
[ ◀ Back ]
```

### Select staff (only if >1)
```
"With whom?"
[ Aziz ] [ Lola ]
[ Anyone available ]
[ ◀ Back ]
```

### Select date
```
"Pick a date (next 14 days):"
[ Mon 2 ] [ Tue 3 ] [ Wed 4 ]
[ Thu 5 ] [ Fri 6 ] [ Sat 7 ]
… (only dates with availability shown)
[ ◀ Back ]
```

### Select time slot
```
"Available times for Mon, 2 Jun:"
[ 09:00 ] [ 10:30 ] [ 12:00 ]
[ 14:00 ] [ 15:30 ]
[ ◀ Back ]
```

### Confirm booking
```
"Confirm your booking:
 ✂ Haircut · 45 min
 👤 Aziz
 🗓 Mon, 2 Jun · 14:00
 💰 80 000 UZS (pay at appointment)"
[ ✅ Confirm ]
[ ✕ Cancel ]
```
If **pay-in-advance**: route to the same Payment-instructions block as orders before confirming.

### Booking confirmed + reminder
```
"✅ Booked! Mon, 2 Jun at 14:00 with Aziz.
 See you then! 🙌"

Reminder (24h before, cron):
"⏰ Reminder: Haircut tomorrow, Mon 2 Jun at 14:00 with Aziz.
 Reply CANCEL to cancel."

If customer replies CANCEL:
"Your appointment on 2 Jun 14:00 has been cancelled. Hope to see you soon!"
```

---

## FREELANCER FLOW

### Project status
```
"📁 Promo video
 Status: In progress
 Deadline: 12 Jun 2026

 Milestones:
 ① Script        ✅ Paid
 ② Rough cut      🔍 In review
 ③ Final cut      ⏳ Pending

 Paid: 2 500 000 / 5 000 000 UZS"
[ 💬 Message us ]
[ 🔄 Refresh ]
```

### Invoice notification
```
"🧾 New invoice INV-002
 Rough cut — 2 500 000 UZS
 Due: 8 Jun 2026

 Transfer to 8600 …  (Humo)
 Write INV-002 in the comment."
[ 📋 Copy card ] [ ✅ I have paid ]
```

---

## GENERAL COMMANDS (command menu)

```
‹orders›        "Your orders:
                 #1042 · 150 000 · Preparing
                 #1039 · 90 000  · Delivered"
                [ tap an order for details ]

‹appointments›  "Upcoming:
                 • Haircut · 2 Jun 14:00 · Confirmed"

‹projects›      → Project status block (above)

‹help›          "Here's what I can do:
                 🛍 Browse catalog
                 📦 /orders — your orders
                 📅 Book an appointment
                 💬 Message the owner
                 Just type to send a message."
```

### Free-text → owner inbox
Any message that isn't a command/button is forwarded to the owner. Bot acknowledges:
```
"✅ Message sent to Cake Studio. They'll reply here soon."
```

---

## Bot design deliverables (summary)

- Full **message copy** for every state above, **in Uzbek-Latin and Russian**, with placeholders
  marked (`{amount}`, `{orderNo}`, `{date}`).
- **Inline keyboard layouts** (button labels + grouping) per state.
- A short set of **branded images**: welcome banner template, payment-card visual, order/booking
  confirmation graphic (optional).
- **Emoji usage guide** — which emoji map to which status, kept consistent with the app's status
  colors.
- Edge-case copy: out of stock, no availability, payment help, session timeout, error/fallback.
