// Deterministic serialization + sha256 of the in-code legal document text
// (legalConfig.ts). This is the SINGLE definition of the content that gets
// stamped at publish time and compared for the drift indicator:
//
//   serializeLegalContent(docType)
//     -> JSON.stringify([docType, [[lang, [heading, ...paragraphs][]]...]])
//        with language keys SORTED (en, ru, uz) and section/paragraph order
//        preserved as written. JSON escaping doubles as the fixed delimiter,
//        so no text can collide across field boundaries.
//
// The raw {{token}} placeholders are hashed as written — the shared
// legalConfig values (contact email, dates, ...) are deliberately EXCLUDED so
// that config-value edits (which don't change the legal wording) never flag
// drift, and so the effectiveDate/documentVersion bump of a publish doesn't
// immediately invalidate its own hash.
//
// The backend cannot import this file (the text lives only in the web
// codebase), so the publish flow sends the serialized string to
// POST /admin/legal-docs/:docType/publish and the SERVER computes sha256 over
// it — the stored hash provably matches the submitted payload. The drift
// indicator recomputes the hash here (Web Crypto) and compares.

import { privacyPolicy, publicOffer, type LangBodies, type Section } from './legalConfig'
import type { LegalDocType } from './adminApi'

function bodiesFor(docType: LegalDocType): LangBodies {
  return docType === 'PRIVACY' ? privacyPolicy : publicOffer
}

export function serializeLegalContent(docType: LegalDocType): string {
  const bodies = bodiesFor(docType)
  const langs = (Object.keys(bodies) as (keyof LangBodies)[]).sort()
  const payload = langs.map((lang) => [
    lang,
    bodies[lang].map((s: Section) => [s.heading, ...s.paragraphs]),
  ])
  return JSON.stringify([docType, payload])
}

/** sha256 hex via Web Crypto (secure context: https / localhost). */
export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/** Hash of the CURRENT in-code text for a document — what a publish would stamp. */
export function computeLegalHash(docType: LegalDocType): Promise<string> {
  return sha256Hex(serializeLegalContent(docType))
}

/**
 * Readable per-language excerpts (first `maxChars` chars of the flattened
 * heading/paragraph text) — shown in the publish modal so the editor sees
 * WHAT wording is being stamped, not just an opaque hash.
 */
export function legalExcerpts(
  docType: LegalDocType,
  maxChars = 200,
): { lang: string; excerpt: string }[] {
  const bodies = bodiesFor(docType)
  const langs = (Object.keys(bodies) as (keyof LangBodies)[]).sort()
  return langs.map((lang) => {
    const flat = bodies[lang]
      .map((s: Section) => [s.heading, ...s.paragraphs].join(' '))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()
    return {
      lang: lang.toUpperCase(),
      excerpt: flat.length > maxChars ? `${flat.slice(0, maxChars)}…` : flat,
    }
  })
}
