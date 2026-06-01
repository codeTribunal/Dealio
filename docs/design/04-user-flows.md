# 04 — User Flows

The critical end-to-end journeys. Each spans both surfaces where relevant. Design these as
continuous experiences — a handoff between bot and app must feel like one product.

Legend: `[App]` owner app screen · `[Bot]` Telegram state · `(push)` notification · `◇` decision.

---

## Flow A — Owner onboarding (first run)

```
[App] Splash → Login (phone)
   → OTP (enter 1234 in dev)
   → ◇ no business yet → Onboarding
        Step 1 Business name + photo
        Step 2 Mode select (multi: Products/Services/Freelance)
        Step 3 Language (Uzbek/Russian)
        Step 4 Payment card (number + Uzcard/Humo)   ◇ skippable, warn it blocks paid orders
        Step 5 Bot setup (paste BotFather token → show bot link + QR)
   → Home (empty state, mode-aware "add your first product/service/project")
```
Design notes: progress indicator across 5 steps; every step has Back; allow Skip on card with a
clear consequence; bot step needs an inline explainer of where to get a token.

---

## Flow B — Product order, customer → owner (the hero flow)

```
[Bot]  /start → "Browse catalog" → product detail → select variant → Add to cart
       → View cart → Checkout (name, phone, delivery, address, notes)
       → Order summary → Confirm
       → Payment instructions: "Transfer 150 000 UZS to 8600 •••• (Uzcard).
                                Write #1042 in the comment." [Copy card] button
       → customer taps "I have paid"
(push) → Owner Telegram + app push: "Dilnoza paid for order #1042 · 150 000 UZS [Mark as paid]"
[App]  Orders → Order #1042 (status NEW, payment PAYMENT_RECEIVED)
       → Owner taps Confirm payment  ◇ OR taps "Mark as paid" in Telegram
       → payment CONFIRMED, order auto-advances
(push) → [Bot] customer: "Payment confirmed! Your order is being prepared."
[App]  Owner advances status: PREPARING → READY → DELIVERED (each → bot message to customer)
```
Design notes: the **payment-instructions** message is trust-critical — card number prominent,
one-tap copy, exact amount, order number to quote. The owner's **confirm** moment must be a single
decisive action with an undo grace if possible.

---

## Flow C — Appointment booking (service business)

```
[Bot]  /start → "Book appointment" → select service (shows duration + price)
       → ◇ multiple staff? → select staff (else skip)
       → select date (next 14 days, only dates with availability shown)
       → select time slot (computed: working hours − existing bookings)
       → confirm booking summary
       → ◇ pay-in-advance? → payment instructions → "I have paid"
                          else → booking REQUESTED
(push) → Owner: "New booking request: Haircut, Aziz, 2 Jun 14:00 [Confirm] [Decline]"
[App]  Appointments (calendar) → tap slot → Appointment detail → Confirm
(push) → [Bot] customer: "Your booking is confirmed for 2 Jun, 14:00."
...
(cron) 24h before → [Bot] reminder: "Reminder: Haircut tomorrow 14:00. Reply CANCEL to cancel."
       → ◇ customer replies CANCEL → appointment CANCELLED → (push) owner notified, slot frees
```
Design notes: availability calendar must clearly distinguish available / full / past dates. Time
slots as a grid of pill buttons. Owner's calendar needs day + week views and a clear "requested vs
confirmed" visual distinction.

---

## Flow D — Freelance project lifecycle

```
[App]  Projects → New project (customer, name, total price, deadline)
       → add Milestones (name, due date, amount)
       → status PROPOSAL_SENT → share proposal link (static HTML page)
[Bot]  customer: "View my project" → project status (milestone, deadline, payment)
[App]  work progresses: milestone SUBMITTED_FOR_REVIEW
[Bot]  (push) customer notified milestone ready for review → APPROVED
[App]  generate Invoice (line items, due date) → status UNPAID
[Bot]  (push) customer: invoice notification → pays via card → "I have paid"
(push) → Owner marks invoice PAID; milestone → PAYMENT_RECEIVED
       → all milestones paid → project COMPLETED
```

---

## Flow E — Customer messaging

```
[Bot]  customer sends free text (not a command) → forwarded to owner inbox
(push) → Owner: "New message from Kamola"
[App]  Messages → Conversation → owner replies
       → reply delivered back through the bot to the customer
```
Design notes: a familiar chat thread for the owner; clearly mark owner vs customer bubbles; show
which business customer it is and link to their Customer detail.

---

## Cross-cutting states every flow must cover

- **Loading** — skeletons on lists, spinners on actions.
- **Empty** — friendly first-use prompts ("No orders yet — share your bot link").
- **Error** — network failure with retry; 401 → silent re-login redirect.
- **Offline** — read cached order/appointment lists; queue or block writes with clear messaging.
- **Success confirmation** — toast/inline confirmation after every state-changing action.
