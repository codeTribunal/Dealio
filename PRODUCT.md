# Product

## Register

product

## Users

Owners of small, often informal businesses in Uzbekistan, across three segments:
- **Product sellers** — cakes, clothes, handmade goods sold via Instagram and Telegram.
- **Service businesses** — salons, tutors, nail technicians, photographers selling time slots.
- **Freelancers** — video editors, designers, developers taking project-based work.

Context of use: the owner is usually running the business alone, from their phone,
between other tasks. They are not necessarily fluent with apps, and they work in
**Uzbek or Russian**. Their end customers never install anything — they order, book,
and pay through a per-business **Telegram bot**. So the product has two owner-facing
surfaces (a Flutter mobile app and a Next.js web dashboard, treated as co-primary)
plus a customer-facing bot the owner never has to think about.

The job to be done: run the whole business — take orders and bookings, get paid,
keep track of customers and money — without spreadsheets, scattered DMs, or a
computer, in the owner's own language.

## Product Purpose

Dealio is a CRM and business-management platform for Uzbekistan's informal
small-business economy. The owner manages catalog/orders, services/appointments,
projects/milestones, customers, P2P card payments, and analytics from the app or web
dashboard; their customers transact through a branded Telegram bot. One backend serves
both.

Success looks like a non-technical owner running their entire business inside Dealio —
confidently taking money and fulfilling orders — instead of juggling notebooks and chat
threads, and never feeling the software is "for someone more technical than me."

## Brand Personality

**Calm and trustworthy.** Dealio handles a small business's money and customers, so it
must feel safe, dependable, and unhurried — quiet confidence, not flash. Voice: plain,
reassuring, and direct; short sentences; say exactly what will happen, especially around
money. Personality lives in small, earned moments, never in decoration that competes with
the task.

## Anti-references

Dealio should explicitly NOT look or feel like any of these:
- **The generic SaaS dashboard** — blue accent, identical icon+heading+text card grids,
  the big-number hero-metric template. The category-reflex look.
- **Cold/corporate enterprise software** — heavy, dense, intimidating; built for IT
  departments, not a solo baker.
- **Childish or playful** — cartoonish, over-rounded, sticker-like. It undermines trust
  the moment money is on screen.
- **Cluttered and overwhelming** — everything at once; the owner can't find the one thing
  they came to do.

## Design Principles

1. **One clear next action per screen.** The owner is busy and mid-task. Surface the
   primary job prominently and defer everything else; never make them hunt.
2. **Earn trust wherever money appears.** Totals, payment states, and confirmations must
   be unambiguous and calm. No ambiguity, no surprise, no cleverness around money.
3. **Two languages, equally first-class.** Uzbek and Russian are co-equal. Nothing
   truncates, overflows, or feels second-rate in either; design to the longer string.
4. **Forgiving for non-experts.** Assume the owner is not a power user: large targets,
   plain short words over dense text, reversible actions, and empty states that teach the
   interface rather than say "nothing here."
5. **Familiar, not clever.** Use standard product patterns so the tool disappears into
   the task. Consistency screen-to-screen beats novelty; save delight for moments, not
   whole pages.

## Accessibility & Inclusion

- **WCAG AA baseline:** body text contrast ≥ 4.5:1 (≥ 3:1 for large text), visible focus
  states, and adequate target sizes throughout.
- **Low-literacy friendly:** lead with clear, consistent icons paired with short plain
  words; avoid dense paragraphs and jargon.
- **Less tech-savvy owners:** large tap targets (≥ 44px), simple linear flows, and
  forgiving/reversible actions with clear error and confirmation states.
- **uz/ru parity:** both languages must render fully across every layout — verify at the
  longer of the two so labels and buttons never clip.
