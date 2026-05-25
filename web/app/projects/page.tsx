'use client'
import { useState, useEffect } from 'react'
import { Briefcase, X, Link2 } from 'lucide-react'
import AuthLayout from '@/components/AuthLayout'
import LoadingSpinner from '@/components/LoadingSpinner'
import ActivityBadge from '@/components/ActivityBadge'
import {
  getProjects,
  updateMilestoneStatus,
  markInvoicePaid,
} from '@/lib/api'
import { formatUZS, formatDate, getInitials } from '@/lib/format'
import type { Project, ProjectMilestone, ProjectInvoice } from '@/types'

const LIMIT = 30

const STATUS_FILTERS = [
  { label: 'All', value: 'ALL' },
  { label: 'Proposal', value: 'PROPOSAL_SENT' },
  { label: 'In progress', value: 'IN_PROGRESS' },
  { label: 'Review', value: 'REVIEW' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Cancelled', value: 'CANCELLED' },
]

function getMilestoneStatusColor(status: string): string {
  const map: Record<string, string> = {
    PENDING: 'bg-gray-100 text-gray-700',
    SUBMITTED_FOR_REVIEW: 'bg-yellow-50 text-yellow-700',
    APPROVED: 'bg-green-50 text-green-700',
    PAYMENT_RECEIVED: 'bg-blue-50 text-blue-700',
  }
  return map[status] || 'bg-gray-100 text-gray-700'
}

function getMilestoneStatusLabel(status: string): string {
  const map: Record<string, string> = {
    PENDING: 'Pending',
    SUBMITTED_FOR_REVIEW: 'In review',
    APPROVED: 'Approved',
    PAYMENT_RECEIVED: 'Paid',
  }
  return map[status] || status
}

function completedMilestoneCount(milestones: ProjectMilestone[]): number {
  return milestones.filter(
    (m) => m.status === 'APPROVED' || m.status === 'PAYMENT_RECEIVED'
  ).length
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [page, setPage] = useState(1)
  const [copiedProposal, setCopiedProposal] = useState(false)

  function fetchProjects() {
    setLoading(true)
    setError(null)
    getProjects({
      status: statusFilter === 'ALL' ? undefined : statusFilter,
      page,
      limit: LIMIT,
    })
      .then((data) => {
        setProjects(Array.isArray(data.projects) ? data.projects : [])
        setTotal(data.total ?? 0)
      })
      .catch(() => setError('Failed to load projects'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchProjects()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, page])

  function updateProjectMilestone(
    projectId: string,
    milestoneId: string,
    newStatus: string
  ) {
    const patchMilestone = (p: Project): Project => ({
      ...p,
      milestones: p.milestones.map((m) =>
        m.id === milestoneId ? { ...m, status: newStatus } : m
      ),
    })
    setProjects((prev) =>
      prev.map((p) => (p.id === projectId ? patchMilestone(p) : p))
    )
    setSelectedProject((prev) =>
      prev && prev.id === projectId ? patchMilestone(prev) : prev
    )
  }

  function updateProjectInvoice(
    projectId: string,
    invoiceId: string,
    newStatus: string
  ) {
    const patchInvoice = (p: Project): Project => ({
      ...p,
      invoices: p.invoices.map((i) =>
        i.id === invoiceId ? { ...i, status: newStatus } : i
      ),
    })
    setProjects((prev) =>
      prev.map((p) => (p.id === projectId ? patchInvoice(p) : p))
    )
    setSelectedProject((prev) =>
      prev && prev.id === projectId ? patchInvoice(prev) : prev
    )
  }

  async function handleMilestonePayment(milestone: ProjectMilestone) {
    if (!selectedProject) return
    await updateMilestoneStatus(selectedProject.id, milestone.id, 'PAYMENT_RECEIVED')
    updateProjectMilestone(selectedProject.id, milestone.id, 'PAYMENT_RECEIVED')
  }

  async function handleMarkInvoicePaid(invoice: ProjectInvoice) {
    if (!selectedProject) return
    await markInvoicePaid(selectedProject.id, invoice.id)
    updateProjectInvoice(selectedProject.id, invoice.id, 'PAID')
  }

  function copyProposalLink() {
    if (!selectedProject) return
    const base = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') ?? ''
    navigator.clipboard.writeText(`${base}/api/v1/proposals/${selectedProject.id}`)
    setCopiedProposal(true)
    setTimeout(() => setCopiedProposal(false), 2000)
  }

  return (
    <AuthLayout title="Projects">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-sm text-gray-500 mt-1">{total} total projects</p>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        {STATUS_FILTERS.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => {
              setStatusFilter(value)
              setPage(1)
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === value
                ? 'bg-gray-900 text-white'
                : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {loading ? (
          <LoadingSpinner />
        ) : error ? (
          <div className="p-6">
            <p className="text-sm text-red-600">
              {error}
              <button
                className="text-sm text-blue-600 ml-2"
                onClick={() => {
                  setError(null)
                  fetchProjects()
                }}
              >
                Try again
              </button>
            </p>
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-16">
            <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-sm">No projects found</p>
          </div>
        ) : (
          projects.map((project) => (
            <div
              key={project.id}
              onClick={() => setSelectedProject(project)}
              className="bg-white rounded-2xl border border-gray-200 p-6 cursor-pointer hover:border-gray-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0 mr-4">
                  <p className="text-base font-bold text-gray-900 mb-1">
                    {project.name}
                  </p>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold flex items-center justify-center flex-shrink-0">
                      {getInitials(project.customer.name)}
                    </div>
                    <p className="text-sm text-gray-600">{project.customer.name}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <p className="text-xs text-gray-500">
                        {completedMilestoneCount(project.milestones)}/
                        {project.milestones.length} milestones
                      </p>
                    </div>
                    {project.deadline && (
                      <p className="text-xs text-gray-400">
                        Due {formatDate(project.deadline)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <ActivityBadge status={project.status} type="project" />
                  <p className="text-sm font-bold text-gray-900">
                    {formatUZS(project.totalPrice)}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {total > LIMIT && (
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 mt-4">
          <p className="text-sm text-gray-600">
            Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total}
          </p>
          <div className="flex gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              disabled={page * LIMIT >= total}
              onClick={() => setPage(page + 1)}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {selectedProject && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="flex-1 bg-black/30"
            onClick={() => setSelectedProject(null)}
          />
          <div className="w-full max-w-xl bg-white h-full flex flex-col shadow-xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
              <div>
                <p className="text-lg font-bold text-gray-900">
                  {selectedProject.name}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Client: {selectedProject.customer.name}
                </p>
              </div>
              <button
                onClick={() => setSelectedProject(null)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* Status & Overview */}
              <div>
                <div className="flex gap-2 mb-2">
                  <ActivityBadge status={selectedProject.status} type="project" />
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500 mb-1">Total value</p>
                    <p className="text-base font-bold text-gray-900">
                      {formatUZS(selectedProject.totalPrice)}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500 mb-1">Deadline</p>
                    <p className="text-base font-bold text-gray-900">
                      {selectedProject.deadline
                        ? formatDate(selectedProject.deadline)
                        : 'Not set'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Description */}
              {selectedProject.description && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                    Scope of work
                  </p>
                  <p className="text-sm text-gray-700">{selectedProject.description}</p>
                </div>
              )}

              {/* Milestones */}
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
                  Milestones
                </p>
                {selectedProject.milestones.length === 0 ? (
                  <p className="text-sm text-gray-400">No milestones added</p>
                ) : (
                  selectedProject.milestones.map((milestone) => (
                    <div
                      key={milestone.id}
                      className="border border-gray-100 rounded-xl p-4 mb-3"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {milestone.name}
                          </p>
                          {milestone.dueDate && (
                            <p className="text-xs text-gray-400 mt-0.5">
                              Due {formatDate(milestone.dueDate)}
                            </p>
                          )}
                        </div>
                        <p className="text-sm font-bold text-gray-900">
                          {formatUZS(milestone.amount)}
                        </p>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getMilestoneStatusColor(milestone.status)}`}
                        >
                          {getMilestoneStatusLabel(milestone.status)}
                        </span>
                        {milestone.status === 'APPROVED' && (
                          <button
                            onClick={() => handleMilestonePayment(milestone)}
                            className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
                          >
                            Mark payment received
                          </button>
                        )}
                        {milestone.status === 'SUBMITTED_FOR_REVIEW' && (
                          <span className="text-xs text-gray-400">
                            Waiting for client
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Invoices */}
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
                  Invoices
                </p>
                {selectedProject.invoices.length === 0 ? (
                  <p className="text-sm text-gray-400">No invoices generated</p>
                ) : (
                  selectedProject.invoices.map((invoice) => (
                    <div
                      key={invoice.id}
                      className="flex items-center justify-between p-4 border border-gray-100 rounded-xl mb-2"
                    >
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {invoice.invoiceNumber}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {invoice.dueDate
                            ? `Due ${formatDate(invoice.dueDate)}`
                            : 'No due date'}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="text-sm font-bold text-gray-900">
                          {formatUZS(invoice.total)}
                        </p>
                        {invoice.status === 'UNPAID' && (
                          <button
                            onClick={() => handleMarkInvoicePaid(invoice)}
                            className="text-xs px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors"
                          >
                            Mark paid
                          </button>
                        )}
                        {invoice.status === 'PAID' && (
                          <span className="text-xs font-medium text-green-600">
                            Paid
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Proposal link */}
              {selectedProject.status === 'PROPOSAL_SENT' && (
                <div className="pt-4 border-t border-gray-100">
                  <button
                    onClick={copyProposalLink}
                    className="w-full flex items-center justify-center gap-2 py-3 border-2 border-blue-200 text-blue-600 rounded-xl text-sm font-semibold hover:bg-blue-50 transition-colors"
                  >
                    <Link2 className="w-4 h-4" />
                    {copiedProposal ? 'Copied!' : 'Copy proposal link'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AuthLayout>
  )
}
