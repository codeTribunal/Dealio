// Temporary verification harness for Telegram OTP auth (Phase 1, backend).
// Drives the public auth endpoints + the platform-bot internal endpoints
// exactly as the real bot would, and checks DB state directly.
// Run with DATABASE_URL and BOT_MANAGER_SECRET in env. Deleted after use.
import { PrismaClient } from '@prisma/client';

const BASE = 'http://localhost:3000/api/v1';
const SECRET = process.env.BOT_MANAGER_SECRET;
const prisma = new PrismaClient();

let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`  PASS  ${name}${extra ? ' — ' + extra : ''}`); }
  else { fail++; console.log(`  FAIL  ${name}${extra ? ' — ' + extra : ''}`); }
};

async function post(path, body, headers = {}) {
  const res = await fetch(BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  let data = null; try { data = await res.json(); } catch {}
  return { status: res.status, data };
}
async function get(path) {
  const res = await fetch(BASE + path);
  let data = null; try { data = await res.json(); } catch {}
  return { status: res.status, data };
}
const internal = (path, body) => post(path, body, { 'x-bot-secret': SECRET });

// Simulate the full bot enrollment hand-off; returns { token, code, chatId }.
async function enroll(phone, chatId) {
  const start = await post('/auth/enroll/start', {});
  const token = start.data.token;
  await internal('/internal/platform/start', { token, chatId });
  const contact = await internal('/internal/platform/contact', {
    token, chatId, phone, contactUserId: chatId, fromId: chatId,
  });
  return { token, code: contact.data.code, chatId };
}

const PHONES = {
  main: '+998900000001', lock: '+998900000002', expire: '+998900000003',
  foreign: '+998900000005', unknown: '+998900000999', rate: '+998900000007',
};

async function cleanup() {
  const all = Object.values(PHONES);
  // Children first (consent references user).
  const users = await prisma.user.findMany({ where: { phone: { in: all } }, select: { id: true } });
  const ids = users.map(u => u.id);
  if (ids.length) await prisma.consentRecord.deleteMany({ where: { userId: { in: ids } } });
  await prisma.otpCode.deleteMany({ where: { phone: { in: all } } });
  await prisma.linkToken.deleteMany({ where: { phone: { in: all } } });
  await prisma.user.deleteMany({ where: { phone: { in: all } } });
  // Also clear link tokens with no phone created during this run is hard to target; leave them (they expire).
}

async function main() {
  console.log('\n=== Telegram OTP Auth — backend verification ===\n');
  await cleanup(); // start clean

  // ── (a) enroll/start → deep link, then simulated bot start + contact ──────
  console.log('(a) Enrollment start → bot start → contact → code');
  const start = await post('/auth/enroll/start', {});
  ok('enroll/start returns 200 + token + deep link',
     start.status === 200 && !!start.data.token && typeof start.data.botDeepLink === 'string',
     start.data.botDeepLink);
  const token = start.data.token;
  const chatId = '111000111';

  const statusBefore = await get(`/auth/enroll/status?token=${token}`);
  ok('status before start: chatStarted=false, phoneBound=false',
     statusBefore.data.chatStarted === false && statusBefore.data.phoneBound === false);

  const startBind = await internal('/internal/platform/start', { token, chatId });
  ok('platform/start binds chat (ok=true)', startBind.data.ok === true);

  const statusAfterStart = await get(`/auth/enroll/status?token=${token}`);
  ok('status after start: chatStarted=true, phoneBound=false',
     statusAfterStart.data.chatStarted === true && statusAfterStart.data.phoneBound === false);

  const contact = await internal('/internal/platform/contact', {
    token, chatId, phone: PHONES.main, contactUserId: chatId, fromId: chatId,
  });
  ok('platform/contact returns ok + 6-digit code',
     contact.data.ok === true && /^\d{6}$/.test(contact.data.code || ''),
     'code=' + contact.data.code);
  const code = contact.data.code;

  const statusAfterContact = await get(`/auth/enroll/status?token=${token}`);
  ok('status after contact: phoneBound=true', statusAfterContact.data.phoneBound === true);

  // ── (b) enroll/verify with code + both consents → JWT, user, consent ──────
  console.log('\n(b) Enrollment verify → JWT + user binding + consent record');
  const verify = await post('/auth/enroll/verify', {
    token, code, generalConsent: true, crossBorderConsent: true,
  });
  ok('enroll/verify returns 200 + jwt + user',
     verify.status === 200 && !!verify.data.token && verify.data.user?.phone === PHONES.main);
  ok('enroll/verify response includes business key (null for new user)',
     'business' in (verify.data || {}));

  const user = await prisma.user.findUnique({ where: { phone: PHONES.main } });
  ok('User.telegramChatId bound', user?.telegramChatId === chatId, user?.telegramChatId);
  ok('User.telegramVerifiedAt set', !!user?.telegramVerifiedAt);
  const consent = await prisma.consentRecord.findFirst({
    where: { userId: user.id, policyVersion: '1.0' },
  });
  ok('ConsentRecord written (v1.0, both true)',
     !!consent && consent.generalConsent === true && consent.crossBorderConsent === true);

  // Reused link token → rejected
  const reuse = await post('/auth/enroll/verify', {
    token, code, generalConsent: true, crossBorderConsent: true,
  });
  ok('reused link token rejected', reuse.status === 400, reuse.data?.error);
  const reuseContact = await internal('/internal/platform/contact', {
    token, chatId, phone: PHONES.main, contactUserId: chatId, fromId: chatId,
  });
  ok('platform/contact on consumed token → ok=false (consumed)',
     reuseContact.data.ok === false && reuseContact.data.reason === 'consumed');

  // ── (d) negative cases ────────────────────────────────────────────────────
  console.log('\n(d) Negative cases: wrong code, lockout, expiry, foreign contact');

  // Wrong code + lockout (6th attempt locked)
  const lk = await enroll(PHONES.lock, '222000222');
  let messages = [];
  for (let i = 1; i <= 5; i++) {
    const r = await post('/auth/enroll/verify', { token: lk.token, code: '000000', generalConsent: true, crossBorderConsent: true });
    messages.push(r.data?.error);
  }
  const sixth = await post('/auth/enroll/verify', { token: lk.token, code: lk.code, generalConsent: true, crossBorderConsent: true });
  ok('wrong code rejected (5x "Invalid code")', messages.every(m => /Invalid code/i.test(m)));
  ok('6th attempt locked even with CORRECT code', sixth.status === 401 && /too many attempts/i.test(sixth.data?.error || ''), sixth.data?.error);

  // Expired code
  const ex = await enroll(PHONES.expire, '333000333');
  await prisma.otpCode.updateMany({
    where: { phone: PHONES.expire, purpose: 'ENROLL', consumedAt: null },
    data: { expiresAt: new Date(Date.now() - 1000) },
  });
  const expVerify = await post('/auth/enroll/verify', { token: ex.token, code: ex.code, generalConsent: true, crossBorderConsent: true });
  ok('expired code rejected', expVerify.status === 401 && /expired/i.test(expVerify.data?.error || ''), expVerify.data?.error);

  // Foreign contact (user_id mismatch) → rejected, no code issued
  const fstart = await post('/auth/enroll/start', {});
  await internal('/internal/platform/start', { token: fstart.data.token, chatId: '444000444' });
  const foreign = await internal('/internal/platform/contact', {
    token: fstart.data.token, chatId: '444000444', phone: PHONES.foreign,
    contactUserId: '999999999', fromId: '444000444',
  });
  ok('foreign contact (user_id mismatch) rejected, no code',
     foreign.data.ok === false && foreign.data.reason === 'foreign_contact' && !foreign.data.code);

  // Consent required at enrollment
  const cstart = await enroll('+998900000008', '555000555');
  const noConsent = await post('/auth/enroll/verify', { token: cstart.token, code: cstart.code, generalConsent: false, crossBorderConsent: true });
  ok('enrollment without both consents rejected', noConsent.status === 400);
  await prisma.otpCode.deleteMany({ where: { phone: '+998900000008' } });
  await prisma.linkToken.deleteMany({ where: { phone: '+998900000008' } });

  // ── (c) login/request creates a LOGIN code for a bound user ───────────────
  console.log('\n(c) Login request (delivery itself is verified live with the bot token)');
  const loginReq = await post('/auth/login/request', { phone: PHONES.main });
  ok('login/request for known user → generic 200', loginReq.status === 200, JSON.stringify(loginReq.data));
  const loginCode = await prisma.otpCode.findFirst({
    where: { phone: PHONES.main, purpose: 'LOGIN', consumedAt: null }, orderBy: { createdAt: 'desc' },
  });
  ok('LOGIN OtpCode row created (hashed) for bound user',
     !!loginCode && !!loginCode.codeHash && loginCode.chatId === chatId);
  ok('LOGIN code stored hashed, not plaintext (64 hex chars)',
     !!loginCode && /^[a-f0-9]{64}$/.test(loginCode.codeHash));

  // login/verify with wrong code → rejected
  const badLogin = await post('/auth/login/verify', { phone: PHONES.main, code: '000000' });
  ok('login/verify wrong code rejected', badLogin.status === 401);
  // login/verify with no consent gate (user already consented) — simulate success via DB-known? We can't read plaintext.
  ok('login/verify does NOT 403 for consented user on a code attempt (consent gate passed)',
     badLogin.data?.error !== 'CONSENT_REQUIRED', badLogin.data?.error);

  // ── (e) enumeration: identical response for unknown phone ─────────────────
  console.log('\n(e) No enumeration on login/request');
  const known = await post('/auth/login/request', { phone: PHONES.main });
  const unknown = await post('/auth/login/request', { phone: PHONES.unknown });
  ok('known vs unknown phone → identical status + body',
     known.status === unknown.status && JSON.stringify(known.data) === JSON.stringify(unknown.data),
     JSON.stringify(unknown.data));
  const unknownUser = await prisma.user.findUnique({ where: { phone: PHONES.unknown } });
  ok('unknown phone created NO user', unknownUser === null);

  // ── rate limiting on login/request (max 5 / 10min per phone) ──────────────
  console.log('\n(rate) login/request rate limit per phone');
  let last;
  for (let i = 0; i < 6; i++) last = await post('/auth/login/request', { phone: PHONES.rate });
  ok('6th login/request for same phone → 429', last.status === 429, 'status=' + last.status);

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===\n`);

  await cleanup();
  await prisma.$disconnect();
  process.exit(fail === 0 ? 0 : 1);
}

main().catch(async (e) => { console.error('HARNESS ERROR', e); await prisma.$disconnect(); process.exit(2); });
