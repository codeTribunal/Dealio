'use client'
import { useEffect, useState } from 'react'
import { FileText, ExternalLink, CheckCircle2, AlertTriangle } from 'lucide-react'
import axios from 'axios'
import AdminLayout from '@/components/admin/AdminLayout'
import {
  getAdminRole,
  getLegalDocs,
  publishLegalVersion,
  type LegalDoc,
  type LegalDocType,
} from '@/lib/adminApi'
import { computeLegalHash, legalExcerpts, serializeLegalContent } from '@/lib/legalHash'

/**
 * Legal documents — the in-force VERSION of the privacy policy and public offer.
 *
 * The document TEXT is edited in the codebase (web/lib/legalConfig.ts) and
 * deployed separately. Publishing here bumps the in-force version AND stamps a
 * sha256 of the in-code text onto the row (computed server-side over the
 * serialization this page sends — see lib/legalHash.ts). A new PRIVACY version
 * forces all owners and customers to re-consent at their next interaction.
 * SUPER_ADMIN only (the backend also enforces this on publish).
 *
 * The drift indicator compares the CURRENT in-code text's hash against the
 * stamped one, answering at a glance: "has the wording changed since the
 * in-force version was published — do I owe a publish?"
 */

const DOC_ORDER: LegalDocType[] = ['PRIVACY', 'OFFER']

const DOC_META: Record<LegalDocType, { label: string; href: string }> = {
  PRIVACY: { label: 'Privacy policy', href: '/privacy' },
  OFFER: { label: 'Public offer', href: '/offer' },
}

function reconsentWarning(docType: LegalDocType): string {
  return docType === 'PRIVACY'
    ? 'This will require all owners and customers to re-consent at their next interaction. This cannot be undone.'
    : 'This will update the in-force offer version on record. This cannot be undone.'
}

/** Green "matches" / amber "publish pending" badge under each document card. */
function DriftBadge({ doc, codeHash }: { doc: LegalDoc | undefined; codeHash: string | undefined }) {
  // No published row yet, or hash not computed yet — nothing meaningful to say.
  if (!doc || !codeHash) return null
  const matches = doc.contentHash === codeHash
  if (matches) {
    return (
      <p className="inline-flex items-center gap-1.5 text-xs text-emerald-400 mt-2">
        <CheckCircle2 size={13} className="flex-shrink-0" />
        Wording matches the published version
      </p>
    )
  }
  return (
    <p className="inline-flex items-center gap-1.5 text-xs text-amber-400 mt-2">
      <AlertTriangle size={13} className="flex-shrink-0" />
      {doc.contentHash
        ? 'Wording changed since last publish — publish pending'
        : 'Published before hash tracking — publish pending to stamp the wording'}
    </p>
  )
}

export default function AdminLegalPage() {
  const [docs, setDocs] = useState<Partial<Record<LegalDocType, LegalDoc>>>({})
  const [codeHashes, setCodeHashes] = useState<Partial<Record<LegalDocType, string>>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [publishFor, setPublishFor] = useState<LegalDocType | null>(null)
  const [newVersion, setNewVersion] = useState('')
  const [publishing, setPublishing] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)

  const isSuperAdmin = getAdminRole() === 'SUPER_ADMIN'

  async function load() {
    setLoading(true)
    setError(null)
    try {
      setDocs(await getLegalDocs())
    } catch {
      setError('Could not load legal documents.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // Hash the CURRENT in-code text per document (Web Crypto, async) — drives
    // both the drift indicator and the "will be stamped" hash in the modal.
    let cancelled = false
    Promise.all(
      DOC_ORDER.map(async (docType) => [docType, await computeLegalHash(docType)] as const),
    )
      .then((entries) => {
        if (!cancelled) setCodeHashes(Object.fromEntries(entries))
      })
      .catch(() => {
        /* non-secure context or unexpected failure — indicator simply hidden */
      })
    return () => {
      cancelled = true
    }
  }, [])

  function openPublish(docType: LegalDocType) {
    setPublishFor(docType)
    setNewVersion('')
    setModalError(null)
  }

  function closeModal() {
    if (publishing) return
    setPublishFor(null)
  }

  async function confirmPublish() {
    if (!publishFor) return
    const version = newVersion.trim()
    if (!version) return
    setPublishing(true)
    setModalError(null)
    try {
      await publishLegalVersion(publishFor, version, serializeLegalContent(publishFor))
      await load()
      setPublishFor(null)
    } catch (e) {
      const msg =
        (axios.isAxiosError(e) && (e.response?.data as { error?: string })?.error) ||
        'Could not publish. Super Admin access is required.'
      setModalError(msg)
    } finally {
      setPublishing(false)
    }
  }

  const current = publishFor ? docs[publishFor]?.version ?? null : null
  const trimmed = newVersion.trim()
  const canPublish = !!trimmed && trimmed !== current && !publishing
  const modalExcerpts = publishFor ? legalExcerpts(publishFor) : []
  const modalHash = publishFor ? codeHashes[publishFor] : undefined

  return (
    <AdminLayout title="Legal documents">
      <div className="max-w-3xl">
        <p className="text-base text-gray-400 mb-5">
          The document text is edited in the codebase (legalConfig.ts) and deployed
          separately. Publishing a new version here bumps the in-force version and,
          for the privacy policy, triggers re-consent. It does not change the wording.
        </p>

        {loading ? (
          <p className="text-base text-gray-500">Loading...</p>
        ) : error ? (
          <p className="text-base text-red-400">{error}</p>
        ) : (
          <div className="space-y-4">
            {DOC_ORDER.map((docType) => {
              const doc = docs[docType]
              const meta = DOC_META[docType]
              return (
                <div
                  key={docType}
                  className="bg-gray-900 rounded-2xl border border-gray-800 p-5"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-blue-900/50 text-blue-300 flex items-center justify-center flex-shrink-0">
                      <FileText size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-lg font-semibold text-white">{meta.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        In-force version:{' '}
                        <span className="text-gray-300">{doc?.version ?? 'not set'}</span>
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Published:{' '}
                        <span className="text-gray-300">
                          {doc?.publishedAt
                            ? new Date(doc.publishedAt).toLocaleString()
                            : 'never'}
                        </span>
                      </p>
                      <DriftBadge doc={doc} codeHash={codeHashes[docType]} />
                      <br />
                      <a
                        href={meta.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 mt-2"
                      >
                        View live page <ExternalLink size={12} />
                      </a>
                    </div>

                    {isSuperAdmin ? (
                      <button
                        type="button"
                        onClick={() => openPublish(docType)}
                        className="px-3.5 py-2 bg-blue-600 text-white rounded-xl text-base font-semibold hover:bg-blue-700 transition-colors flex-shrink-0"
                      >
                        Publish new version
                      </button>
                    ) : (
                      <span className="text-xs px-2.5 py-1 rounded-full bg-gray-800 text-gray-400 flex-shrink-0">
                        Read-only
                      </span>
                    )}
                  </div>
                </div>
              )
            })}

            {!isSuperAdmin && (
              <p className="text-xs text-gray-600">
                Only a Super Admin can publish a new version.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Publish confirmation modal — shows exactly what will be stamped:
          version, a per-language excerpt of the in-code text, and its hash. */}
      {publishFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-white mb-2">
              Publish {DOC_META[publishFor].label.toLowerCase()} version
            </h3>
            <p className="text-base text-gray-400 mb-1">
              Current version: <span className="text-gray-200">{current ?? 'not set'}</span>
            </p>
            <p className="text-base text-amber-300 mb-4">{reconsentWarning(publishFor)}</p>

            <label className="block text-xs text-gray-400 mb-1">New version</label>
            <input
              type="text"
              value={newVersion}
              onChange={(e) => setNewVersion(e.target.value)}
              placeholder="e.g. 2026-08-01"
              className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-base text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {trimmed && trimmed === current && (
              <p className="text-xs text-red-400 mt-2">
                New version must differ from the current version.
              </p>
            )}

            {/* What will be stamped */}
            <div className="mt-4 rounded-xl border border-gray-800 bg-gray-950/60 p-3 space-y-2">
              <p className="text-xs font-semibold text-gray-300">
                Wording being stamped{trimmed ? ` as version ${trimmed}` : ''}
              </p>
              {modalExcerpts.map(({ lang, excerpt }) => (
                <div key={lang}>
                  <p className="text-[10px] uppercase tracking-wide text-gray-500">{lang}</p>
                  <p className="text-xs text-gray-400">{excerpt}</p>
                </div>
              ))}
              <div>
                <p className="text-[10px] uppercase tracking-wide text-gray-500">
                  Content hash (sha256)
                </p>
                <p className="text-xs text-gray-400 font-mono break-all">
                  {modalHash ?? 'computing…'}
                </p>
              </div>
            </div>

            {modalError && <p className="text-xs text-red-400 mt-2">{modalError}</p>}

            <div className="flex gap-3 mt-5">
              <button
                type="button"
                onClick={closeModal}
                disabled={publishing}
                className="px-4 py-2 bg-gray-700 text-white rounded-xl text-base disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmPublish}
                disabled={!canPublish}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-base font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {publishing
                  ? 'Publishing...'
                  : publishFor === 'PRIVACY'
                    ? 'Publish and trigger re-consent'
                    : 'Publish'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
