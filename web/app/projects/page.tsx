'use client'
import { useState, useEffect } from 'react'
import { Briefcase, X, Link2, Plus } from 'lucide-react'
import AuthLayout from '@/components/AuthLayout'
import LoadingSpinner from '@/components/LoadingSpinner'
import ActivityBadge from '@/components/ActivityBadge'
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
import { formatUZS, formatDate, getInitials } from '@/lib/format'
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

  return (
    <AuthLayout title="Projects">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-sm text-gray-500 mt-1">{total} total projects</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New project
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
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
              onClick={() => openProject(project)}
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
          <div className="relative z-50 w-full md:max-w-xl bg-white shadow-2xl flex flex-col h-full overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
              <div>
                <p className="text-lg font-bold text-gray-900">
                  {selectedProject.name}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Client: {selectedProject.customer.name}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {!showEditProject && (
                  <button
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
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Edit
                  </button>
                )}
                <button
                  onClick={() => setSelectedProject(null)}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              {showEditProject ? (
                /* Edit project inline form */
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Project name *
                    </label>
                    <input
                      type="text"
                      value={editProjectName}
                      onChange={(e) => setEditProjectName(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Total price (UZS) *
                    </label>
                    <input
                      type="number"
                      value={editProjectTotalPrice}
                      onChange={(e) => setEditProjectTotalPrice(e.target.value)}
                      min="0"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Scope of work
                    </label>
                    <textarea
                      rows={4}
                      value={editProjectDescription}
                      onChange={(e) => setEditProjectDescription(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-900 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Deadline
                    </label>
                    <input
                      type="date"
                      value={editProjectDeadline}
                      onChange={(e) => setEditProjectDeadline(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Status
                    </label>
                    <select
                      value={editProjectStatus}
                      onChange={(e) => setEditProjectStatus(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>

                  {editError && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                      <p className="text-sm text-red-700">{editError}</p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveEditProject}
                      disabled={editSaving}
                      className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      {editSaving ? 'Saving...' : 'Save changes'}
                    </button>
                    <button
                      onClick={() => setShowEditProject(false)}
                      className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                /* Status & Overview */
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
              )}

              {/* Description */}
              {!showEditProject && selectedProject.description && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                    Scope of work
                  </p>
                  <p className="text-sm text-gray-700">{selectedProject.description}</p>
                </div>
              )}

              {/* Milestones */}
              {!showEditProject && (
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

                  {!showAddMilestone && (
                    <button
                      onClick={() => setShowAddMilestone(true)}
                      className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium mt-2"
                    >
                      <Plus className="w-3 h-3" />
                      Add milestone
                    </button>
                  )}

                  {showAddMilestone && (
                    <div className="border border-gray-200 rounded-xl p-4 mt-2 bg-gray-50">
                      <p className="text-sm font-semibold text-gray-900 mb-3">
                        New milestone
                      </p>
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={milestoneName}
                          onChange={(e) => setMilestoneName(e.target.value)}
                          placeholder="Milestone name"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <input
                          type="number"
                          value={milestoneAmount}
                          onChange={(e) => setMilestoneAmount(e.target.value)}
                          placeholder="Amount (UZS)"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <input
                          type="date"
                          value={milestoneDueDate}
                          onChange={(e) => setMilestoneDueDate(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={handleAddMilestone}
                            disabled={!milestoneName || !milestoneAmount ||
                              addingMilestone}
                            className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
                          >
                            {addingMilestone ? 'Adding...' : 'Add'}
                          </button>
                          <button
                            onClick={() => setShowAddMilestone(false)}
                            className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Invoices */}
              {!showEditProject && (
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
              )}

              {/* Proposal link */}
              {!showEditProject && selectedProject.status === 'PROPOSAL_SENT' && (
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

      {/* Create project panel */}
      {showCreateForm && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div
            className="absolute inset-0 bg-black/20"
            onClick={() => setShowCreateForm(false)}
          />
          <div className="relative z-50 w-full max-w-lg bg-white shadow-2xl flex flex-col h-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
              <p className="text-lg font-bold text-gray-900">New project</p>
              <button onClick={() => setShowCreateForm(false)}>
                <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Field 1 — Project name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Project name *
                </label>
                <input
                  type="text"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="e.g. Logo design, Website redesign"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Field 2 — Client */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Client *
                </label>

                {/* Mode toggle */}
                <div className="flex gap-2 mb-2">
                  <button
                    onClick={() => setCreateCustomerMode('select')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      createCustomerMode === 'select'
                        ? 'bg-gray-900 text-white'
                        : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Select existing
                  </button>
                  <button
                    onClick={() => setCreateCustomerMode('manual')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      createCustomerMode === 'manual'
                        ? 'bg-gray-900 text-white'
                        : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Enter manually
                  </button>
                </div>

                {createCustomerMode === 'select' ? (
                  <select
                    value={createCustomerId}
                    onChange={(e) => setCreateCustomerId(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">Select a client</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={createManualCustomerName}
                    onChange={(e) => setCreateManualCustomerName(e.target.value)}
                    placeholder="Client name"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                )}
              </div>

              {/* Field 3 — Total price */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Total price (UZS) *
                </label>
                <input
                  type="number"
                  value={createTotalPrice}
                  onChange={(e) => setCreateTotalPrice(e.target.value)}
                  min="0"
                  placeholder="500000"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Field 4 — Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Scope of work
                </label>
                <textarea
                  rows={4}
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                  placeholder="Describe what is included in this project..."
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-900 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Field 5 — Deadline */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Deadline
                </label>
                <input
                  type="date"
                  value={createDeadline}
                  onChange={(e) => setCreateDeadline(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Field 6 — Payment terms */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Payment terms
                </label>
                <input
                  type="text"
                  value={createPaymentTerms}
                  onChange={(e) => setCreatePaymentTerms(e.target.value)}
                  placeholder="e.g. 50% upfront, 50% on delivery"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex-shrink-0 space-y-3">
              {createError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-sm text-red-700">{createError}</p>
                </div>
              )}
              <button
                onClick={handleCreateProject}
                disabled={createSaving}
                className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {createSaving ? 'Saving...' : 'Create project'}
              </button>
              <button
                onClick={() => setShowCreateForm(false)}
                className="w-full py-3 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success toast */}
      {savedMessage && (
        <div className="fixed bottom-6 right-6 bg-gray-900 text-white px-4 py-3 rounded-xl text-sm font-medium shadow-lg z-50 flex items-center gap-2">
          {savedMessage}
        </div>
      )}
    </AuthLayout>
  )
}
