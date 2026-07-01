'use client'
import { useEffect, useState } from 'react'
import { FileText, ExternalLink } from 'lucide-react'
import axios from 'axios'
import AdminLayout from '@/components/admin/AdminLayout'
import {
  getAdminRole,
  getLegalDocs,
  publishLegalVersion,
  type LegalDoc,
  type LegalDocType,
} from '@/lib/adminApi'

/**
 * Legal documents — the in-force VERSION of the privacy policy and public offer.
 *
 * The document TEXT is edited in the codebase (web/lib/legalConfig.ts) and
 * deployed separately. Publishing here only bumps the in-force version: a new
 * PRIVACY version forces all owners and customers to re-consent at their next
 * interaction. SUPER_ADMIN only (the backend also enforces this on publish).
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

export default function AdminLegalPage() {
  const [docs, setDocs] = useState<Partial<Record<LegalDocType, LegalDoc>>>({})
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
      await publishLegalVersion(publishFor, version)
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

  return (
    <AdminLayout title="Legal documents">
      <div className="max-w-3xl">
        <p className="text-sm text-gray-400 mb-5">
          The document text is edited in the codebase (legalConfig.ts) and deployed
          separately. Publishing a new version here bumps the in-force version and,
          for the privacy policy, triggers re-consent. It does not change the wording.
        </p>

        {loading ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : error ? (
          <p className="text-sm text-red-400">{error}</p>
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
                      <p className="text-sm font-semibold text-white">{meta.label}</p>
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
                        className="px-3.5 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors flex-shrink-0"
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

      {/* Publish confirmation modal */}
      {publishFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 w-full max-w-md">
            <h3 className="text-base font-bold text-white mb-2">
              Publish {DOC_META[publishFor].label.toLowerCase()} version
            </h3>
            <p className="text-sm text-gray-400 mb-1">
              Current version: <span className="text-gray-200">{current ?? 'not set'}</span>
            </p>
            <p className="text-sm text-amber-300 mb-4">{reconsentWarning(publishFor)}</p>

            <label className="block text-xs text-gray-400 mb-1">New version</label>
            <input
              type="text"
              value={newVersion}
              onChange={(e) => setNewVersion(e.target.value)}
              placeholder="e.g. 2026-08-01"
              className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {trimmed && trimmed === current && (
              <p className="text-xs text-red-400 mt-2">
                New version must differ from the current version.
              </p>
            )}
            {modalError && <p className="text-xs text-red-400 mt-2">{modalError}</p>}

            <div className="flex gap-3 mt-5">
              <button
                type="button"
                onClick={closeModal}
                disabled={publishing}
                className="px-4 py-2 bg-gray-700 text-white rounded-xl text-sm disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmPublish}
                disabled={!canPublish}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {publishing ? 'Publishing...' : 'Confirm publish'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
