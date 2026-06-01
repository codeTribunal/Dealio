'use client'
import { useState, useEffect } from 'react'
import AuthLayout from '@/components/AuthLayout'
import LoadingSpinner from '@/components/LoadingSpinner'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { Icon } from '@/components/icons/Icon'
import {
  getProjects,
  getCustomers,
  createCustomer,
  createProject,
  updateProject,
  addMilestone,
  updateMilestoneStatus,
  markInvoicePaid,
} from '@/lib/api'
import { formatUZS, formatDate } from '@/lib/format'
import type { Project, ProjectMilestone, ProjectInvoice, Customer } from '@/types'

const LIMIT = 30

const STATUS_FILTERS = [
  { label: 'All', value: 'ALL' },
  { label: 'Proposal', value: 'PROPOSAL_SENT' },
  { label: 'In progress', value: 'IN_PROGRESS' },
  { label: 'Review', value: 'REVIEW' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Cancelled', value: 'CANCELLED' },
]

const STATUS_OPTIONS = [
  { label: 'Proposal sent', value: 'PROPOSAL_SENT' },
  { label: 'In progress', value: 'IN_PROGRESS' },
  { label: 'In review', value: 'REVIEW' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Cancelled', value: 'CANCELLED' },
]

// Milestone status tone — token-driven inline pill (Badge primitive doesn't
// cover milestone codes, so we render a small span with the same shape).
function milestoneTone(status: string): string {
  switch (status) {
    case 'PENDING':
      return 'bg-surface-2 text-text-2 border border-border'
    case 'SUBMITTED_FOR_REVIEW':
      return 'bg-warning-soft text-warning-strong'
    case 'APPROVED':
      return 'bg-success-soft text-success-strong'
    case 'PAYMENT_RECEIVED':
      return 'bg-accent-soft text-accent'
    default:
      return 'bg-surface-2 text-text-2 border border-border'
  }
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

const SELECT_CLASS =
  'w-full bg-surface border border-border rounded-md py-2.5 px-3.5 text-sm text-text-1 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft transition-colors'

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [page, setPage] = useState(1)
  const [copiedProposal, setCopiedProposal] = useState(false)
  const [savedMessage, setSavedMessage] = useState<string | null>(null)

  const [showCreateForm, setShowCreateForm] = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])

  // Create form state
  const [createName, setCreateName] = useState('')
  const [createDescription, setCreateDescription] = useState('')
  const [createTotalPrice, setCreateTotalPrice] = useState('')
  const [createDeadline, setCreateDeadline] = useState('')
  const [createCustomerId, setCreateCustomerId] = useState('')
  const [createCustomerMode, setCreateCustomerMode] =
    useState<'select' | 'manual'>('select')
  const [createManualCustomerName, setCreateManualCustomerName] = useState('')
  const [createPaymentTerms, setCreatePaymentTerms] = useState('')
  const [createSaving, setCreateSaving] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  // Add milestone state
  const [showAddMilestone, setShowAddMilestone] = useState(false)
  const [milestoneName, setMilestoneName] = useState('')
  const [milestoneAmount, setMilestoneAmount] = useState('')
  const [milestoneDueDate, setMilestoneDueDate] = useState('')
  const [addingMilestone, setAddingMilestone] = useState(false)

  // Edit project state
  const [showEditProject, setShowEditProject] = useState(false)
  const [editProjectName, setEditProjectName] = useState('')
  const [editProjectDescription, setEditProjectDescription] = useState('')
  const [editProjectTotalPrice, setEditProjectTotalPrice] = useState('')
  const [editProjectDeadline, setEditProjectDeadline] = useState('')
  const [editProjectStatus, setEditProjectStatus] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

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

  useEffect(() => {
    getCustomers({ limit: 100 })
      .then((data) => setCustomers(data.customers))
      .catch(() => {})
  }, [])

  function showSaved(message: string) {
    setSavedMessage(message)
    setTimeout(() => setSavedMessage(null), 3000)
  }

  function openProject(project: Project) {
    setSelectedProject(project)
    setShowEditProject(false)
    setShowAddMilestone(false)
    setEditError(null)
  }

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

  const handleCreateProject = async () => {
    if (!createName.trim()) {
      setCreateError('Project name is required')
      return
    }
    if (createCustomerMode === 'select' && !createCustomerId) {
      setCreateError('Select a client')
      return
    }
    if (createCustomerMode === 'manual' && !createManualCustomerName.trim()) {
      setCreateError('Enter a client name')
      return
    }
    if (!createTotalPrice || Number(createTotalPrice) <= 0) {
      setCreateError('Enter a valid price')
      return
    }
    setCreateSaving(true)
    setCreateError(null)
    try {
      let customerId = createCustomerId
      if (createCustomerMode === 'manual') {
        const newCustomer = await createCustomer({
          name: createManualCustomerName.trim(),
        })
        customerId = newCustomer.id
      }
      const created = await createProject({
        name: createName.trim(),
        description: createDescription.trim() || undefined,
        totalPrice: Number(createTotalPrice),
        deadline: createDeadline || undefined,
        customerId,
        paymentTerms: createPaymentTerms.trim() || undefined,
      })
      setProjects(prev => [created, ...prev])
      setTotal(prev => prev + 1)
      setShowCreateForm(false)
      setCreateName('')
      setCreateDescription('')
      setCreateTotalPrice('')
      setCreateDeadline('')
      setCreateCustomerId('')
      setCreateManualCustomerName('')
      setCreateCustomerMode('select')
      setCreatePaymentTerms('')
      showSaved('Project created')
    } catch {
      setCreateError('Failed to create project. Please try again.')
    } finally {
      setCreateSaving(false)
    }
  }

  const handleAddMilestone = async () => {
    if (!selectedProject || !milestoneName || !milestoneAmount) return
    setAddingMilestone(true)
    try {
      const newMilestone = await addMilestone(selectedProject.id, {
        name: milestoneName,
        amount: Number(milestoneAmount),
        dueDate: milestoneDueDate || undefined
      })
      setSelectedProject(prev => prev ? {
        ...prev,
        milestones: [...prev.milestones, newMilestone]
      } : null)
      setProjects(prev => prev.map(p =>
        p.id === selectedProject.id ? {
          ...p,
          milestones: [...p.milestones, newMilestone]
        } : p
      ))
      setMilestoneName('')
      setMilestoneAmount('')
      setMilestoneDueDate('')
      setShowAddMilestone(false)
      showSaved('Milestone added')
    } catch {
      // show error inline
    } finally {
      setAddingMilestone(false)
    }
  }

  const handleSaveEditProject = async () => {
    if (!selectedProject) return
    if (!editProjectName.trim()) {
      setEditError('Project name is required')
      return
    }
    if (!editProjectTotalPrice || Number(editProjectTotalPrice) <= 0) {
      setEditError('Enter a valid price')
      return
    }
    setEditSaving(true)
    setEditError(null)
    try {
      const updated = await updateProject(selectedProject.id, {
        name: editProjectName.trim(),
        description: editProjectDescription.trim() || undefined,
        totalPrice: Number(editProjectTotalPrice),
        deadline: editProjectDeadline || undefined,
        status: editProjectStatus,
      })
      setProjects(prev => prev.map(p =>
        p.id === selectedProject.id ? { ...p, ...updated } : p))
      setSelectedProject(prev => prev ? { ...prev, ...updated } : null)
      setShowEditProject(false)
      showSaved('Project updated')
    } catch {
      setEditError('Failed to save. Please try again.')
    } finally {
      setEditSaving(false)
    }
  }

  // Shared style helpers
  const chip = (active: boolean, sm = false) =>
    `${sm ? 'px-3 py-1.5 text-xs' : 'px-3 py-1.5 text-sm'} rounded-md font-semibold transition-colors ${
      active
        ? 'bg-accent-soft text-accent'
        : 'bg-surface border border-border text-text-2 hover:bg-surface-2'
    }`

  return (
    <AuthLayout title="Projects">
      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-text-1">Projects</h1>
          <p className="text-sm text-text-2 mt-1">{total} total projects</p>
        </div>
        <Button
          variant="primary"
          leftIcon="add"
          onClick={() => setShowCreateForm(true)}
        >
          New project
        </Button>
      </div>

      {/* ── Status filters ──────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 mb-6">
        {STATUS_FILTERS.map(({ label, value }) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              setStatusFilter(value)
              setPage(1)
            }}
            className={chip(statusFilter === value)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── List ─────────────────────────────────────────────────── */}
      <div className="space-y-3">
        {loading ? (
          <LoadingSpinner />
        ) : error ? (
          <Card>
            <p className="text-sm text-error-strong">
              {error}
              <button
                className="ml-2 text-sm font-semibold text-accent hover:text-accent-hover"
                onClick={() => {
                  setError(null)
                  fetchProjects()
                }}
              >
                Try again
              </button>
            </p>
          </Card>
        ) : projects.length === 0 ? (
          <Card className="text-center py-12">
            <div className="mx-auto mb-4 w-16 h-16 rounded-lg bg-accent-soft flex items-center justify-center text-accent">
              <Icon name="projects" size={28} />
            </div>
            <p className="text-sm text-text-2">No projects found</p>
          </Card>
        ) : (
          projects.map((project) => (
            <Card
              key={project.id}
              padded={false}
              onClick={() => openProject(project)}
              className="p-6 cursor-pointer hover:border-border-strong hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-base font-bold text-text-1 mb-1 truncate">
                    {project.name}
                  </p>
                  <div className="flex items-center gap-2 mb-3">
                    <Avatar name={project.customer.name} size="sm" />
                    <p className="text-sm text-text-2 truncate">
                      {project.customer.name}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-text-2">
                    <p className="tabular-nums">
                      {completedMilestoneCount(project.milestones)}/
                      {project.milestones.length} milestones
                    </p>
                    {project.deadline && (
                      <p className="text-text-3">
                        Due {formatDate(project.deadline)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <Badge status={project.status} type="project" />
                  <p className="text-sm font-bold text-text-1 tabular-nums">
                    {formatUZS(project.totalPrice)}
                  </p>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* ── Pagination ──────────────────────────────────────────── */}
      {total > LIMIT && (
        <div className="flex items-center justify-between px-1 py-4 mt-4">
          <p className="text-sm text-text-2">
            Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total}
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={page * LIMIT >= total}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* ── Detail slide-over ───────────────────────────────────── */}
      {selectedProject && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="flex-1 bg-text-1/30"
            onClick={() => setSelectedProject(null)}
          />
          <div className="relative z-50 w-full md:max-w-xl bg-surface border-l border-border shadow-lg flex flex-col h-full overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-border flex-shrink-0">
              <div className="min-w-0 mr-3">
                <p className="text-lg font-bold text-text-1 truncate">
                  {selectedProject.name}
                </p>
                <p className="text-sm text-text-2 mt-1 truncate">
                  Client: {selectedProject.customer.name}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {!showEditProject && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditProjectName(selectedProject.name)
                      setEditProjectDescription(selectedProject.description || '')
                      setEditProjectTotalPrice(String(selectedProject.totalPrice))
                      setEditProjectDeadline(
                        selectedProject.deadline
                          ? selectedProject.deadline.split('T')[0]
                          : ''
                      )
                      setEditProjectStatus(selectedProject.status)
                      setEditError(null)
                      setShowEditProject(true)
                    }}
                  >
                    Edit
                  </Button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedProject(null)}
                  aria-label="Close"
                  className="text-text-3 hover:text-text-1 transition-colors"
                >
                  <Icon name="close" size={20} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              {showEditProject ? (
                /* Edit project inline form */
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-text-2 mb-1.5">
                      Project name *
                    </label>
                    <Input
                      type="text"
                      value={editProjectName}
                      onChange={(e) => setEditProjectName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-2 mb-1.5">
                      Total price (UZS) *
                    </label>
                    <Input
                      type="number"
                      value={editProjectTotalPrice}
                      onChange={(e) => setEditProjectTotalPrice(e.target.value)}
                      min="0"
                      className="tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-2 mb-1.5">
                      Scope of work
                    </label>
                    <Textarea
                      rows={4}
                      value={editProjectDescription}
                      onChange={(e) => setEditProjectDescription(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-2 mb-1.5">
                      Deadline
                    </label>
                    <Input
                      type="date"
                      value={editProjectDeadline}
                      onChange={(e) => setEditProjectDeadline(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-2 mb-1.5">
                      Status
                    </label>
                    <select
                      value={editProjectStatus}
                      onChange={(e) => setEditProjectStatus(e.target.value)}
                      className={SELECT_CLASS}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>

                  {editError && (
                    <div className="p-3 bg-error-soft border border-error-strong rounded-md">
                      <p className="text-sm text-error-strong">{editError}</p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      variant="primary"
                      fullWidth
                      loading={editSaving}
                      onClick={handleSaveEditProject}
                    >
                      {editSaving ? 'Saving...' : 'Save changes'}
                    </Button>
                    <Button
                      variant="secondary"
                      fullWidth
                      onClick={() => setShowEditProject(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                /* Status & Overview */
                <div>
                  <div className="flex gap-2 mb-4">
                    <Badge status={selectedProject.status} type="project" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-surface-2 border border-border rounded-md p-3">
                      <p className="text-xs text-text-2 mb-1">Total value</p>
                      <p className="text-base font-bold text-text-1 tabular-nums">
                        {formatUZS(selectedProject.totalPrice)}
                      </p>
                    </div>
                    <div className="bg-surface-2 border border-border rounded-md p-3">
                      <p className="text-xs text-text-2 mb-1">Deadline</p>
                      <p className="text-base font-bold text-text-1">
                        {selectedProject.deadline
                          ? formatDate(selectedProject.deadline)
                          : 'Not set'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Description */}
              {!showEditProject && selectedProject.description && (
                <div>
                  <p className="text-xs font-semibold text-text-2 uppercase tracking-wider mb-2">
                    Scope of work
                  </p>
                  <p className="text-sm text-text-1">{selectedProject.description}</p>
                </div>
              )}

              {/* Milestones */}
              {!showEditProject && (
                <div>
                  <p className="text-xs font-semibold text-text-2 uppercase tracking-wider mb-3">
                    Milestones
                  </p>
                  {selectedProject.milestones.length === 0 ? (
                    <p className="text-sm text-text-3">No milestones added</p>
                  ) : (
                    selectedProject.milestones.map((milestone) => (
                      <div
                        key={milestone.id}
                        className="border border-border rounded-md p-4 mb-3 bg-surface"
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-text-1 truncate">
                              {milestone.name}
                            </p>
                            {milestone.dueDate && (
                              <p className="text-xs text-text-3 mt-0.5">
                                Due {formatDate(milestone.dueDate)}
                              </p>
                            )}
                          </div>
                          <p className="text-sm font-bold text-text-1 tabular-nums flex-shrink-0">
                            {formatUZS(milestone.amount)}
                          </p>
                        </div>
                        <div className="flex items-center justify-between mt-2 gap-2">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-pill text-xs font-semibold ${milestoneTone(milestone.status)}`}
                          >
                            {getMilestoneStatusLabel(milestone.status)}
                          </span>
                          {milestone.status === 'APPROVED' && (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleMilestonePayment(milestone)}
                            >
                              Mark payment received
                            </Button>
                          )}
                          {milestone.status === 'SUBMITTED_FOR_REVIEW' && (
                            <span className="text-xs text-text-3">
                              Waiting for client
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}

                  {!showAddMilestone && (
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon="add"
                      onClick={() => setShowAddMilestone(true)}
                      className="mt-2"
                    >
                      Add milestone
                    </Button>
                  )}

                  {showAddMilestone && (
                    <div className="border border-border rounded-md p-4 mt-2 bg-surface-2">
                      <p className="text-sm font-semibold text-text-1 mb-3">
                        New milestone
                      </p>
                      <div className="space-y-3">
                        <Input
                          type="text"
                          value={milestoneName}
                          onChange={(e) => setMilestoneName(e.target.value)}
                          placeholder="Milestone name"
                        />
                        <Input
                          type="number"
                          value={milestoneAmount}
                          onChange={(e) => setMilestoneAmount(e.target.value)}
                          placeholder="Amount (UZS)"
                          className="tabular-nums"
                        />
                        <Input
                          type="date"
                          value={milestoneDueDate}
                          onChange={(e) => setMilestoneDueDate(e.target.value)}
                        />
                        <div className="flex gap-2">
                          <Button
                            variant="primary"
                            fullWidth
                            size="sm"
                            disabled={!milestoneName || !milestoneAmount}
                            loading={addingMilestone}
                            onClick={handleAddMilestone}
                          >
                            {addingMilestone ? 'Adding...' : 'Add'}
                          </Button>
                          <Button
                            variant="secondary"
                            fullWidth
                            size="sm"
                            onClick={() => setShowAddMilestone(false)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Invoices */}
              {!showEditProject && (
                <div>
                  <p className="text-xs font-semibold text-text-2 uppercase tracking-wider mb-3">
                    Invoices
                  </p>
                  {selectedProject.invoices.length === 0 ? (
                    <p className="text-sm text-text-3">No invoices generated</p>
                  ) : (
                    selectedProject.invoices.map((invoice) => (
                      <div
                        key={invoice.id}
                        className="flex items-center justify-between p-4 border border-border rounded-md mb-2 bg-surface"
                      >
                        <div className="min-w-0 mr-3">
                          <p className="text-sm font-semibold text-text-1 truncate">
                            {invoice.invoiceNumber}
                          </p>
                          <p className="text-xs text-text-3 mt-0.5">
                            {invoice.dueDate
                              ? `Due ${formatDate(invoice.dueDate)}`
                              : 'No due date'}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <p className="text-sm font-bold text-text-1 tabular-nums">
                            {formatUZS(invoice.total)}
                          </p>
                          {invoice.status === 'UNPAID' && (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleMarkInvoicePaid(invoice)}
                            >
                              Mark paid
                            </Button>
                          )}
                          {invoice.status === 'PAID' && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-pill text-xs font-semibold bg-success-soft text-success-strong">
                              Paid
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Proposal link */}
              {!showEditProject && selectedProject.status === 'PROPOSAL_SENT' && (
                <div className="pt-4 border-t border-border">
                  <Button
                    variant="secondary"
                    fullWidth
                    onClick={copyProposalLink}
                  >
                    {copiedProposal ? 'Copied!' : 'Copy proposal link'}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Create project slide-over ───────────────────────────── */}
      {showCreateForm && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div
            className="absolute inset-0 bg-text-1/30"
            onClick={() => setShowCreateForm(false)}
          />
          <div className="relative z-50 w-full max-w-lg bg-surface border-l border-border shadow-lg flex flex-col h-full">
            <div className="flex items-center justify-between p-6 border-b border-border flex-shrink-0">
              <p className="text-lg font-bold text-text-1">New project</p>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                aria-label="Close"
                className="text-text-3 hover:text-text-1 transition-colors"
              >
                <Icon name="close" size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Project name */}
              <div>
                <label className="block text-sm font-medium text-text-2 mb-1.5">
                  Project name *
                </label>
                <Input
                  type="text"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="e.g. Logo design, Website redesign"
                />
              </div>

              {/* Client */}
              <div>
                <label className="block text-sm font-medium text-text-2 mb-1.5">
                  Client *
                </label>

                <div className="flex gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setCreateCustomerMode('select')}
                    className={chip(createCustomerMode === 'select', true)}
                  >
                    Select existing
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreateCustomerMode('manual')}
                    className={chip(createCustomerMode === 'manual', true)}
                  >
                    Enter manually
                  </button>
                </div>

                {createCustomerMode === 'select' ? (
                  <select
                    value={createCustomerId}
                    onChange={(e) => setCreateCustomerId(e.target.value)}
                    className={SELECT_CLASS}
                  >
                    <option value="">Select a client</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                ) : (
                  <Input
                    type="text"
                    value={createManualCustomerName}
                    onChange={(e) => setCreateManualCustomerName(e.target.value)}
                    placeholder="Client name"
                  />
                )}
              </div>

              {/* Total price */}
              <div>
                <label className="block text-sm font-medium text-text-2 mb-1.5">
                  Total price (UZS) *
                </label>
                <Input
                  type="number"
                  value={createTotalPrice}
                  onChange={(e) => setCreateTotalPrice(e.target.value)}
                  min="0"
                  placeholder="500000"
                  className="tabular-nums"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-text-2 mb-1.5">
                  Scope of work
                </label>
                <Textarea
                  rows={4}
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                  placeholder="Describe what is included in this project..."
                />
              </div>

              {/* Deadline */}
              <div>
                <label className="block text-sm font-medium text-text-2 mb-1.5">
                  Deadline
                </label>
                <Input
                  type="date"
                  value={createDeadline}
                  onChange={(e) => setCreateDeadline(e.target.value)}
                />
              </div>

              {/* Payment terms */}
              <div>
                <label className="block text-sm font-medium text-text-2 mb-1.5">
                  Payment terms
                </label>
                <Input
                  type="text"
                  value={createPaymentTerms}
                  onChange={(e) => setCreatePaymentTerms(e.target.value)}
                  placeholder="e.g. 50% upfront, 50% on delivery"
                />
              </div>
            </div>

            <div className="p-6 border-t border-border flex-shrink-0 space-y-3">
              {createError && (
                <div className="p-3 bg-error-soft border border-error-strong rounded-md">
                  <p className="text-sm text-error-strong">{createError}</p>
                </div>
              )}
              <Button
                variant="primary"
                fullWidth
                loading={createSaving}
                onClick={handleCreateProject}
              >
                {createSaving ? 'Saving...' : 'Create project'}
              </Button>
              <Button
                variant="secondary"
                fullWidth
                onClick={() => setShowCreateForm(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Success toast */}
      {savedMessage && (
        <div className="fixed bottom-6 right-6 bg-text-1 text-surface px-4 py-3 rounded-md text-sm font-medium shadow-md z-50 flex items-center gap-2">
          <span className="text-success-soft">
            <Icon name="paid" size={16} />
          </span>
          {savedMessage}
        </div>
      )}
    </AuthLayout>
  )
}
