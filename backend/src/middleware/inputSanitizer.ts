import { FastifyRequest, FastifyReply } from 'fastify';

// No /g flag — these are used with .test() which doesn't need global matching,
// and module-level regex objects with /g retain lastIndex state between calls.
const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/i,
  /(--|\/\*|\*\/)/,
];

const XSS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/i,
  /javascript:/i,
  /on\w+\s*=/i,
];

function checkString(value: string): boolean {
  for (const pattern of [...SQL_INJECTION_PATTERNS, ...XSS_PATTERNS]) {
    if (pattern.test(value)) return true;
  }
  return false;
}

// parentKey lets us skip fields that have a known-safe, Zod-validated format.
function deepCheck(obj: unknown, parentKey?: string): boolean {
  // Bot tokens (digits:base64url) are validated by Zod regex — skip them here.
  // The base64url alphabet includes '=' padding which can trigger the XSS
  // on\w+\s*= pattern, and the colon is mistakenly associated with SQL syntax.
  if (parentKey === 'botToken') return false;

  if (typeof obj === 'string') return checkString(obj);
  if (typeof obj === 'object' && obj !== null) {
    return Object.entries(obj as Record<string, unknown>).some(([key, value]) =>
      deepCheck(value, key),
    );
  }
  return false;
}

export async function detectMaliciousInput(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  if (request.body && deepCheck(request.body)) {
    request.log.warn(
      { ip: request.ip, url: request.url, body: request.body },
      'Suspicious input detected',
    );
    return reply.status(400).send({ error: 'Invalid input detected' });
  }
}
