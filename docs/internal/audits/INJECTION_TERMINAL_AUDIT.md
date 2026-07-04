# Injection & Terminal-Execution Audit — Dealio

**Scope:** Read-only security audit of two risk classes across `backend/`, `bot/`, `web/`, and `app/`:
(1) injection (SQL/DB, path/SSRF, output/XSS, endpoint-validation coverage) and
(2) unauthorized command / terminal / code execution.
**Type:** Read-only inspection. **No code was modified, created, or deleted.** Every claim cites `file:line`. "NOT FOUND" after a thorough search is a valid, reassuring finding; where a claim could not be verified it is marked **UNVERIFIED**.
**Date:** 2026-07-04.
**Verified against:** commit `2070824` (working tree at HEAD; also includes untracked `web/app/robots.ts`, `web/app/sitemap.ts`, `web/lib/siteUrl.ts`, which were reviewed and carry no path/SSRF surface).
**Method:** Whole-repo `grep` sweeps for each sink class + full reads of every hit and every prime-suspect file. Findings were produced by seven parallel finder passes (one per part/surface), each independently re-checked by an adversarial verifier, plus a completeness-critic pass for sink classes outside the initial seven. The lead auditor independently re-read the crown-jewel sinks (the 3 raw queries, the getFile proxy, the ICS generator, the legal-token render path, and the live Telegram-HTML forward).

---

## Verdict banner

> **No BLOCKER-level findings.** No SQL injection, no command/terminal/code-execution sink, and no path-traversal or SSRF reachable from user input exists anywhere in the four surfaces.
>
> The single most severe finding is **MEDIUM**: customer-controlled free-text (names and inbox messages) is interpolated **un-escaped** into `parse_mode: 'HTML'` Telegram messages delivered to the **business owner**, enabling a phishing `<a href>` link injected into the owner's chat and silent notification loss when the text contains `<` / `&`. Telegram's HTML mode is a fixed whitelist of inline tags with **no script execution**, which caps the impact. All other findings are LOW robustness/defense-in-depth nits.

---

## PART A — SQL / database injection

**Status: CLEAR.** The SQL-injection posture is genuinely clean.

### A.1 Complete inventory of raw query APIs
A whole-repo grep for `$queryRaw` / `$queryRawUnsafe` / `$executeRaw` / `$executeRawUnsafe` (and `Prisma.raw` / `Prisma.sql` / `sql.raw` / `.raw(`) returns **exactly three call sites, all `$queryRaw` tagged templates, all in one file** — [backend/src/routes/admin.ts:175](backend/src/routes/admin.ts#L175), [:189](backend/src/routes/admin.ts#L189), [:439](backend/src/routes/admin.ts#L439). **Zero** uses of any `*Unsafe` variant or `$executeRaw*` anywhere.

### A.2 Per-query classification
| Query | Kind | Interpolation | Verdict |
|---|---|---|---|
| [admin.ts:175](backend/src/routes/admin.ts#L175) (activation-funnel count) | Tagged template `$queryRaw` | Only `${cutoff}` at [:178](backend/src/routes/admin.ts#L178), twice, in **value position** with `::timestamptz` cast → a bound parameter | Safe |
| [admin.ts:189](backend/src/routes/admin.ts#L189) (median days-to-first-sale) | Tagged template `$queryRaw` | Only `${cutoff}` at [:203](backend/src/routes/admin.ts#L203), value position, `::timestamptz` bound param | Safe |
| [admin.ts:439](backend/src/routes/admin.ts#L439) (30-day momentum series) | Tagged template `$queryRaw` | **None** — every date bound is a SQL literal (`CURRENT_DATE - INTERVAL '29 days'`) | Injection-impossible |

All table/column names in the three queries are **hardcoded string literals** — there is no identifier-position interpolation (the one class tagged templates do *not* parameterize).

### A.3 Provenance of the only interpolated value
`cutoff` is typed `Date | null` ([admin.ts:144](backend/src/routes/admin.ts#L144)) and is only ever called with **server-computed** values — `sevenDaysAgo`, `thirtyDaysAgo`, or `null` ([admin.ts:394-396](backend/src/routes/admin.ts#L394)), derived from `now` at [admin.ts:332-333](backend/src/routes/admin.ts#L332). **No request body/params/query feeds it.** Even if it were user-supplied, the tagged template binds it as a parameterized `Date`, not a string.

### A.4 Rest of data access & non-Prisma DB access
All other DB access (324 `prisma.<model>.<method>` calls across 25 route files) goes through Prisma's parameterized query builder (`findMany`/`findFirst`/`create`/`update`/`updateMany`/`groupBy`/`count`/`aggregate`). A grep for non-Prisma drivers (`pg`, `postgres`, `knex`, `sequelize`, `mysql`, `typeorm`, `new Client(`, `new Pool(`) returns **no matches** — backend depends only on `prisma` + `@prisma/client`. The **bot has no database layer at all** (no Prisma/SQL in `bot/src`; it reads/writes solely via the backend HTTP API). Web has no DB deps. → **NOT FOUND: no DB access outside Prisma.**

---

## PART B — Command / terminal / code execution

**Status: CLEAR (NOT FOUND).** No command-, terminal-, or dynamic-code-execution sink exists on any surface.

### B.1 Shell / process / dynamic-eval sinks
Greps across `*.{ts,tsx,js,mjs,cjs,jsx}`, `*.dart`, and native `*.kt`/`*.java` for the full sink set returned **no matches** in first-party source:

| Pattern class | Patterns | Result |
|---|---|---|
| Node shell/process | `child_process`, `exec(`, `execSync`, `execFile`, `spawn(`, `spawnSync`, `fork(` | NOT FOUND |
| Dynamic eval | `eval(`, `new Function(`, `vm.runInContext/runInNewContext/compileFunction/Script`, `require('vm')`, string-form `setTimeout`/`setInterval`, non-literal `require()`/`import()` | NOT FOUND |
| Flutter/Dart | `Process.run/start/runSync`, `Runtime.exec`, `Isolate.spawn`, `dart:io`, `dart:isolate`, `dart:mirrors` | NOT FOUND |
| Native Android | `Runtime.getRuntime`, `.exec(`, `ProcessBuilder`, `System.load`, `DexClassLoader` (only `MainActivity.kt` + generated `GeneratedPluginRegistrant.java` exist) | NOT FOUND |

Because no such sink exists, **no user-influenced input can reach one** — there is no request→shell path to evaluate.

### B.2 File-system operations & path traversal
- **No user-influenced filesystem path anywhere in the backend.** The only `fs` usage in `backend/src` is a test reading a static `.env` path ([backend/test/erase-scrub.test.ts:42](backend/test/erase-scrub.test.ts#L42)). There is no `@fastify/static`, no `sendFile`, no `createReadStream`, and no `/download`/`/export` file route.
- **getFile proxy (prime suspect) — SAFE.** `GET /orders/:id/payment-proof` ([backend/src/routes/orders.ts:170](backend/src/routes/orders.ts#L170)) builds a Telegram URL from the stored `paymentProofFileId`. The file_id is wrapped in `encodeURIComponent` ([orders.ts:186](backend/src/routes/orders.ts#L186)) so `&`/`?`/`/`/`#` cannot inject params or alter the path; the host is the **hardcoded literal** `api.telegram.org`; the interpolated bot token is decrypted from a value that was accepted only after passing the anchored `BOT_TOKEN_REGEX = /^\d+:[A-Za-z0-9_-]{35,}$/` ([business.ts:181](backend/src/routes/business.ts#L181)), which forbids `@ . / :` — so it cannot repoint the host either. The order is tenant-scoped via `findFirst where { id, businessId }` ([orders.ts:175](backend/src/routes/orders.ts#L175)). No SSRF, no param injection, no traversal.
- **LOW — second Telegram fetch interpolates an un-encoded `file_path`.** [orders.ts:193](backend/src/routes/orders.ts#L193) interpolates `gf.result.file_path` without encoding, but that value comes from **Telegram's own getFile JSON response** (not the client) against the same fixed host. Not client-exploitable; flagged only as a trust-boundary note. **UNVERIFIED**: relies on trusting that `api.telegram.org` returns a well-formed `file_path`.
- **`request.params as { id }` → Prisma `where` is not a path.** Values like `const { id } = request.params as { id: string }` reach Prisma as **parameterized `where` values** ([orders.ts:153-176](backend/src/routes/orders.ts#L153)), not filesystem paths or raw SQL. `../` or SQL metacharacters simply fail to match a row (404).
- **Flutter / web** perform no local file I/O reachable from remote input (no `dart:io File/Directory`, no `createReadStream`/`sendFile` in `web/`). The Flutter payment-proof image loads via the authenticated network proxy, not a local path.

### B.3 Outbound fetch (SSRF) & shell-out dependencies
Every outbound `fetch`/`axios` target is a **fixed literal host** (`api.telegram.org`, FCM URL) or an **env var** (`BOT_SERVICE_URL`) — no `fetch(userInput)` and no `new URL(userInput)` exists ([business.ts:204](backend/src/routes/business.ts#L204), [customers.ts:390](backend/src/routes/customers.ts#L390), [onboarding.ts:32](backend/src/routes/onboarding.ts#L32)). No dependency in any `package.json` shells out on input (`execa`/`shelljs`/`node-cmd`/`puppeteer`/`sharp`/`wkhtmltopdf` etc. are absent; `cross-spawn` and `@playwright/test` appear only as **transitive build/test tooling** in `web/package-lock.json`, never imported by app code).

> **Repo-hygiene note (not a sink):** a git-tracked compiled Python artifact `__pycache__/_pngtool.cpython-313.pyc` exists at repo root with **no matching `.py` source** and no runtime path from any Node/Dart surface. It is never imported or shipped. Informational only.

---

## PART C — Input-validation coverage

**Status: CLEAR for request bodies; LOW robustness gaps on query/params.** The "zod on every endpoint" convention **holds for every body-accepting endpoint** (owner, admin, and bot-internal). The gaps are read-side query/param casts that reach Prisma only as parameterized values — never a file path or raw SQL.

### C.1 Body validation — 100% coverage
Across the owner/public routes (98 endpoints enumerated) and the admin+bot routes (70 endpoints enumerated), **every** endpoint that accepts a request body validates it with a `zod` `safeParse` before use, with `z.enum` whitelists on all status/role/plan/deliveryMethod/paymentType fields. Representative evidence: [products.ts:37](backend/src/routes/products.ts#L37), [orders.ts:102](backend/src/routes/orders.ts#L102), [customers.ts:139](backend/src/routes/customers.ts#L139), [appointments.ts:88](backend/src/routes/appointments.ts#L88), [projects.ts:92](backend/src/routes/projects.ts#L92), [onboarding.ts:88](backend/src/routes/onboarding.ts#L88), [proposals.ts:67](backend/src/routes/proposals.ts#L67), [bot.ts:1168-1174](backend/src/routes/bot.ts#L1168), [admin.ts:73-111](backend/src/routes/admin.ts#L73), [adminData.ts:73-101](backend/src/routes/adminData.ts#L73). The bot order path additionally **re-derives item prices from the DB** and ignores the client-submitted price ([bot.ts:377-383](backend/src/routes/bot.ts#L377)), and guards stock with a conditional decrement. → **No unvalidated body field is ever written to the DB.**

### C.2 Query / path params without zod (all LOW)
~60 owner endpoints read path params via raw `request.params as {...}` casts, and 7 read query via `request.query as Record<string,string>` casts, without a zod schema. **Every one is used only as a parameterized Prisma `where` value or a capability token** (tenant-scoped by `businessId` from the JWT, never from the request). Concrete robustness nits:

| Gap | Evidence | Why LOW |
|---|---|---|
| `query.status` written raw into a Prisma enum filter (GET /orders, /appointments, /projects) | [orders.ts:60](backend/src/routes/orders.ts#L60), [appointments.ts:62](backend/src/routes/appointments.ts#L62), [projects.ts:67](backend/src/routes/projects.ts#L67) | Parameterized; an invalid enum makes Prisma throw → **HTTP 500** (no custom error handler), not injection |
| Date query params → `new Date()` unvalidated (availability, blocked-slots, bot due-reminders) | [appointments.ts:317](backend/src/routes/appointments.ts#L317), [blocked-slots.ts:33](backend/src/routes/blocked-slots.ts#L33), [bot.ts:925](backend/src/routes/bot.ts#L925) | Invalid Date in a `gte`/`lt` filter → 500; read-only |
| Admin pagination: `Number()` NaN / fractional `page` → non-integer Prisma `skip`/`take` → 500 | [admin.ts:577-579](backend/src/routes/admin.ts#L577), [adminData.ts:40-44](backend/src/routes/adminData.ts#L40) | Admin-gated, read-only |
| Loosely-typed JSON accepted without size/key bounds (`z.record`) | [bot.ts:86](backend/src/routes/bot.ts#L86), [adminData.ts:78](backend/src/routes/adminData.ts#L78) | Stored as JSON via parameterized path; no injection |

`GET /customers` and `GET /reminders` apply **manual** guards (`parseInt`+clamp, `=== 'true'`) that are effectively equivalent validation ([customers.ts:59-67](backend/src/routes/customers.ts#L59), [reminders.ts:19](backend/src/routes/reminders.ts#L19)). `GET /analytics` and `GET /home` (the "zero-zod" grep leads) read **no request input at all** — the business is derived from the JWT — so the absence of zod is correct, not a gap ([analytics.ts:7](backend/src/routes/analytics.ts#L7), [home.ts:14](backend/src/routes/home.ts#L14)).

### C.3 Raw request data into a query or file path
**NOT FOUND.** No endpoint concatenates raw request input into a filesystem path or a raw SQL string. The only external-URL construction (the getFile proxy) is built from a DB value (`paymentProofFileId`), not the request, and is `encodeURIComponent`-wrapped (see B.2).

### C.4 Bot-internal auth (context, not validation)
All `bot.ts` and `internal.ts` handlers call a **constant-time** shared-secret check (`verifyBotSecret`/`verifyBotManagerSecret`, `timingSafeEqual` with length guard and empty-secret rejection) as their first line ([bot.ts:17-26](backend/src/routes/bot.ts#L17), [internal.ts:9-18](backend/src/routes/internal.ts#L9)); all admin routes are behind `requireAdmin`/`requireSuperAdmin`.

---

## PART D — XSS / output injection

### D.1 web/ — CLEAR (React default escaping intact)
All three `dangerouslySetInnerHTML` uses inject **static compile-time constants** with no user/DB/URL data:
- Theme/lang/favicon inline scripts ([web/app/layout.tsx:59-61](web/app/layout.tsx#L59)) are literal string constants that read cookies at runtime but validate them against fixed regexes (`light|dark`, `en|uz|ru`) and never interpolate the cookie value into markup.
- The SVG icon component indexes a frozen `as const` map by a typed `IconName` key ([web/components/icons/Icon.tsx:80](web/components/icons/Icon.tsx#L80)).

A grep for other raw-DOM sinks (`innerHTML`, `document.write`, `new Function`, `eval`, `insertAdjacentHTML`, `srcDoc`, `createElement`, `setAttribute`) and for HTML-rendering libraries (`react-markdown`, `marked`, `DOMPurify`, `sanitize-html`) returns **no matches**. Dynamic `href`/`src` values are fixed-prefix relative paths, a browser-minted `blob:` object URL (the authenticated payment-proof image), or `encodeURIComponent`-wrapped URLs — none can carry a `javascript:`/`data:` scheme from user input.

### D.2 Legal pages — CLEAR ({{token}} renders as escaped text)
The public offer/privacy pages render document bodies from a **static code file** ([web/lib/legalConfig.ts](web/lib/legalConfig.ts)), **not** the DB (the `LegalDocument` row stores only version/hash/publishedAt). `applyTokens` is a pure `String.replace` that substitutes only string/number scalars ([web/lib/resolveLang.ts:56-67](web/lib/resolveLang.ts#L56)), and its output is placed in **JSX child position** — `<p>{applyTokens(paragraph, legalConfig)}</p>` ([web/app/offer/page.tsx:76](web/app/offer/page.tsx#L76), [web/app/privacy/page.tsx:79](web/app/privacy/page.tsx#L79)) — where React auto-escapes it. Even if a config value contained markup, it would render as text. No `dangerouslySetInnerHTML` on these pages.

### D.3 bot / backend / app — the one substantive cluster
**Backend renders NO HTML** (proposals/invoices return JSON — [proposals.ts:36/88/113](backend/src/routes/proposals.ts#L36); the only HTML-token grep hit is the sanitizer regex in `inputSanitizer.ts`). **FCM push is plain text** ([backend/src/lib/push.ts:26-32](backend/src/lib/push.ts#L26)). **Flutter has no `flutter_html`/WebView** — `url_launcher` opens only owner-owned URLs with `LaunchMode.externalApplication`. Those are all CLEAR.

The real issue is **Telegram HTML output injection**. `sendTelegramMessage` **hardcodes `parse_mode: 'HTML'`** ([backend/src/lib/telegram.ts:14](backend/src/lib/telegram.ts#L14)), and `escapeHtml` **does not exist anywhere in `backend/src`** (grep: no matches). Several owner-facing messages interpolate customer-controlled free-text raw:

| # | Finding | Evidence | Severity |
|---|---|---|---|
| D-1 | **Customer inbox message → owner's Telegram, un-escaped.** Both `customer.name` and the customer's `text` (validated only as `string.min(1).max(4096)`) are interpolated into `💬 ${customer.name}: ${text}` and sent to the owner's chat in HTML mode. A `<a href>` injects a clickable phishing link into the owner's Telegram; a stray `<` makes Telegram reject the send (400 can't-parse-entities) — the `.catch` swallows it, so the owner **silently never sees the message.** | [bot.ts:1198-1204](backend/src/routes/bot.ts#L1198) + [telegram.ts:14](backend/src/lib/telegram.ts#L14) | **MEDIUM** |
| D-2 | **Freelance owner notifications** (milestone approved / proposal accepted) wrap `customer.name` in `<b>` un-escaped. Same phishing/notification-drop via a customer-set name. | [bot.ts:1075](backend/src/routes/bot.ts#L1075), [bot.ts:1152](backend/src/routes/bot.ts#L1152) | **MEDIUM** |
| D-3 | **Owner-reminder job** builds `📅 {title}\n\n{body}` where `body` interpolates `customer.name` (and service/project/milestone names) un-escaped, sent to the owner in HTML. | [backend/src/jobs/ownerReminders.ts:66-70](backend/src/jobs/ownerReminders.ts#L66), bodies at [:163/:193/:228/:290](backend/src/jobs/ownerReminders.ts#L163) | **MEDIUM** |
| D-4 | **booking.ts self-view inconsistency** — echoes the customer's typed name/phone into HTML without `escapeHtml`, whereas the equivalent `checkout.ts` paths *do* escape. Renders back to the customer themselves (self-injection) + send-failure robustness. | [bot/src/scenes/booking.ts:286/308/335](bot/src/scenes/booking.ts#L286) | **LOW** |
| D-5 | **Owner-controlled names into customer-facing HTML** (product/service/staff/project/milestone/business names) are un-escaped. Owner-trust data, so the security angle is limited; primarily a **delivery-reliability bug** — a name containing `<` or `&` (e.g. `Size <L>`, `Ben & Jerry`) makes Telegram reject the send and the customer gets no catalog/reminder/confirmation. | [bot/src/scenes/catalog.ts:144](bot/src/scenes/catalog.ts#L144), [project.ts:31](bot/src/scenes/project.ts#L31), [reminders.ts:77-89](bot/src/jobs/reminders.ts#L77), [projects.ts:294](backend/src/routes/projects.ts#L294) | **LOW** |

**Bounding facts:** Telegram HTML mode is a **fixed whitelist of inline tags with no `<script>`/JS execution**, so the worst realistic impact is a phishing link in the owner's chat and lost notifications — not code execution. The correct escaping pattern already exists and is applied on the checkout/consent paths ([bot/src/lib/format.ts:7](bot/src/lib/format.ts#L7), [consent.ts:54](bot/src/lib/consent.ts#L54), [checkout.ts:299](bot/src/scenes/checkout.ts#L299)); the findings above are **omissions** relative to that baseline. Auth/enrollment codes interpolate only system-generated numerics (CLEAR). *(No fix is proposed here — this is a read-only audit.)*

> **Correction to note:** an inbox-forward variant in the bot itself ([bot/src/index.ts:242](bot/src/index.ts#L242)) is **dead code** — the backend `/bot/message` handler returns only `{ ok: true }` and never populates the `ownerNotification` field the bot checks. The **live** carrier of D-1 is the backend forward at [bot.ts:1202](backend/src/routes/bot.ts#L1202).

### D.4 ICS calendar feed (output injection outside the HTML scope) — LOW
The public `GET /calendar/:token.ics` feed builds `VEVENT` `SUMMARY`/`DESCRIPTION` from customer-controlled names/notes/addresses ([backend/src/routes/calendar.ts:58-68](backend/src/routes/calendar.ts#L58)). `generateICS` **escapes** `\`, `;`, `,`, and `\n` via `escapeICSText` ([backend/src/lib/icsGenerator.ts:18-25](backend/src/lib/icsGenerator.ts#L18)), so CRLF property injection (a customer injecting a fake `VEVENT`) is **blocked**. **LOW gap:** a lone `\r` is not escaped — but because `\n` *is* escaped, a raw `\r` cannot form a CRLF line terminator, so property injection is not achievable in RFC 5545 parsers. Non-exploitable; hardening note only.

---

## PART E — Summary table

| Obligation | Risk area | Status | Severity | Evidence |
|---|---|---|---|---|
| Raw queries parameterized, no user input | SQL injection | Safe — 3 tagged-template `$queryRaw`, only server-computed `${cutoff}` bound param | **CLEAR** | [admin.ts:175](backend/src/routes/admin.ts#L175)/[189](backend/src/routes/admin.ts#L189)/[439](backend/src/routes/admin.ts#L439) |
| Rest of DB access via ORM builder; no non-Prisma DB | SQL injection | 324 parameterized calls; no `pg`/`knex`/etc.; bot has no DB | **CLEAR** | grep NOT FOUND |
| No request→shell path | Command execution | No `child_process`/`exec`/`eval`/`vm`/`Process.run`/`ProcessBuilder` on any surface | **CLEAR** | grep NOT FOUND |
| No shell-out dependency on input | Command execution | No `execa`/`shelljs`; `cross-spawn`/`playwright` transitive-only | **CLEAR** | `web/package-lock.json` (build tooling) |
| No user-controlled filesystem path | Path traversal | No route-reachable `fs`/`sendFile`/`@fastify/static`; params→Prisma value, not path | **CLEAR** | [orders.ts:153-176](backend/src/routes/orders.ts#L153) |
| getFile proxy no SSRF/param-injection | Path traversal / SSRF | `encodeURIComponent(file_id)` + fixed host + regex-gated token, tenant-scoped | **CLEAR** | [orders.ts:170-204](backend/src/routes/orders.ts#L170) |
| Telegram file_path interpolation | Path traversal / SSRF | Un-encoded but Telegram-sourced against fixed host; not client-controllable | **LOW** | [orders.ts:193](backend/src/routes/orders.ts#L193) |
| No user-controlled outbound URL | SSRF | All fetches use fixed hosts or env vars | **CLEAR** | [business.ts:204](backend/src/routes/business.ts#L204) |
| zod on every request body | Endpoint validation | 100% body coverage (owner + admin + bot) with enum whitelists | **CLEAR** | [bot.ts:1168](backend/src/routes/bot.ts#L1168), [adminData.ts:73](backend/src/routes/adminData.ts#L73) |
| Query/param validation | Endpoint validation | Read-side casts reach Prisma as parameterized values; invalid input → 500, not injection | **LOW** | [orders.ts:60](backend/src/routes/orders.ts#L60), [admin.ts:577](backend/src/routes/admin.ts#L577) |
| web raw-HTML sinks static only | XSS (web) | 3 `dangerouslySetInnerHTML` all static constants; React escaping intact | **CLEAR** | [layout.tsx:59](web/app/layout.tsx#L59), [Icon.tsx:80](web/components/icons/Icon.tsx#L80) |
| Legal `{{token}}` renders as text | XSS (web) | Static config, `applyTokens`→escaped JSX children | **CLEAR** | [offer/page.tsx:76](web/app/offer/page.tsx#L76) |
| Telegram HTML escapes user data | XSS / output injection | Customer name+message un-escaped → owner chat (phishing link + notification DoS) | **MEDIUM** | [bot.ts:1202](backend/src/routes/bot.ts#L1202), [telegram.ts:14](backend/src/lib/telegram.ts#L14) |
| Owner/reminder notifications escape names | XSS / output injection | `customer.name` un-escaped in HTML owner notices | **MEDIUM** | [bot.ts:1075](backend/src/routes/bot.ts#L1075), [ownerReminders.ts:66](backend/src/jobs/ownerReminders.ts#L66) |
| ICS feed output escaping | Output injection | Escapes `\ ; , \n` (CRLF injection blocked); lone `\r` un-escaped, non-exploitable | **LOW** | [icsGenerator.ts:18](backend/src/lib/icsGenerator.ts#L18) |
| Backend HTML rendering | XSS | None — proposals/invoices return JSON | **CLEAR** | [proposals.ts:36](backend/src/routes/proposals.ts#L36) |
| FCM push / Flutter output | XSS | Plain-text push; no Flutter HTML/WebView | **CLEAR** | [push.ts:26](backend/src/lib/push.ts#L26) |
| Redis key/command injection | Injection (critic) | Session key `${businessId}:${chat.id}` numeric; parameterized adapter | **CLEAR** | [bot/src/index.ts:139](bot/src/index.ts#L139) |
| Open redirect | Redirect (critic) | Middleware rewrites pathname on own host only | **CLEAR** | [web/middleware.ts:43-45](web/middleware.ts#L43) |
| HTTP header / CRLF injection | Header injection (critic) | No user free-text in `reply.header`; static or Telegram-sourced | **CLEAR** | [security.ts:7-11](backend/src/middleware/security.ts#L7) |
| Prototype pollution | Mass-assignment (critic) | Spreads over zod-validated data; no deep merge / bracket-assign | **CLEAR** | [business.ts:563-569](backend/src/routes/business.ts#L563) |
| ReDoS | Regex (critic) | No `new RegExp(` anywhere; static linear patterns | **CLEAR** | grep NOT FOUND |
| botToken create/update format check | Validation (critic) | Stored `z.string().optional()` with no regex — never fetched from these handlers | **LOW** | [business.ts:109/155](backend/src/routes/business.ts#L109) |

### Most severe finding

**No BLOCKER-level findings.** No SQL injection, no command/terminal/code-execution sink, and no user-reachable path-traversal or SSRF exists across `backend/`, `bot/`, `web/`, or `app/`.

The single most severe finding is **MEDIUM — Telegram HTML output injection** ([backend/src/routes/bot.ts:1202](backend/src/routes/bot.ts#L1202) via [backend/src/lib/telegram.ts:14](backend/src/lib/telegram.ts#L14)): customer-controlled names and inbox messages are interpolated **un-escaped** into `parse_mode: 'HTML'` messages delivered to the business owner, permitting a phishing `<a href>` link in the owner's chat and silent loss of order/message notifications when the text contains `<` or `&`. Telegram's HTML mode executes no scripts, which caps the impact below HIGH. `escapeHtml` already exists in the bot and is applied on the checkout/consent paths; the flagged owner-notification paths and the entire backend omit it.

---

## Appendix — coverage, patterns searched, and UNVERIFIED items

**Sink patterns swept (all case-sensitive unless noted):** `$queryRaw(Unsafe)?`/`$executeRaw(Unsafe)?`/`Prisma.raw`/`sql.raw`; `pg`/`postgres`/`knex`/`sequelize`/`mysql`/`typeorm`/`new Client(`/`new Pool(`; `child_process`/`exec(`/`execSync`/`execFile`/`spawn(`/`spawnSync`/`fork(`; `eval(`/`new Function(`/`vm.*`/`require('vm')`; string-form `setTimeout`/`setInterval`; `Process.(run|start)`/`Runtime.exec`/`Isolate.spawn`/`dart:io`/`dart:mirrors`; native `Runtime.getRuntime`/`ProcessBuilder`/`System.load`/`DexClassLoader`; `fs.`/`readFile`/`writeFile`/`createReadStream`/`sendFile`/`@fastify/static`/`path.join`/`path.resolve`; `fetch(`/`axios`/`new URL(`; `dangerouslySetInnerHTML`/`innerHTML`/`document.write`/`insertAdjacentHTML`/`srcDoc`/`createElement`/`setAttribute`; `parse_mode`/`ParseMode`/`Markdown`/`HTML`; `reply.header`/`setHeader`/`redirect`/`Location`/`Content-Disposition`; `new RegExp(`; prototype-pollution vectors (`JSON.parse`/deep-merge/`Object.assign`/spread/`for..in`); Redis key building; `flutter_html`/`WebView`/`url_launcher`.

**UNVERIFIED / trust-boundary items (could not be verified from the repo; not concluded safe):**
- [orders.ts:193](backend/src/routes/orders.ts#L193) trusts that `api.telegram.org`'s getFile response returns a well-formed, non-traversal `file_path` (un-encoded interpolation against a fixed host).
- The exact HTTP status of the malformed-query-param cases (Part C) depends on Fastify's default handling of `PrismaClientValidationError`; no custom `setErrorHandler` is registered, so an unhandled **500** is assumed but not exercised at runtime.
- `computeAvailableSlots` runtime behavior on an unparseable `dateStr` was not opened.
- Whether a global `preValidation`/`onRequest` hook (`inputSanitizer`) additionally coerces/rejects query params before handlers run was not traced.
- `node_modules` internals were not audited for embedded shell-out; third-party packages are trusted per manifest and are not invoked with request/message input by app code.
- The Express bot-manager control server's authZ (`BOT_MANAGER_SECRET`) is an authorization concern outside this injection/exec audit's scope (reviewed for injection: none — bodies are JSON `businessId` used in parameterized backend calls).

*Read-only audit. No source was modified. No secrets are printed in this report.*
