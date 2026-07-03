'use client'
import { useState, useEffect } from 'react'
import AuthLayout from '@/components/AuthLayout'
import { useModeGuard } from '@/lib/businessContext'
import LoadingSpinner from '@/components/LoadingSpinner'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { SlideOver } from '@/components/ui/SlideOver'
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
  issueProposalLink,
} from '@/lib/api'
import { formatUZS, formatDate, currencyWord } from '@/lib/format'
import { useI18n } from '@/lib/i18n/i18nContext'
import { useToast } from '@/lib/toast'
import type { Project, ProjectMilestone, ProjectInvoice, Customer } from '@/types'

const LIMIT = 30

// Labels are resolved at render time via t('common.all') / t('status.' + value).
const STATUS_FILTERS = [
  'ALL',
  'PROPOSAL_SENT',
  'IN_PROGRESS',
  'REVIEW',
  'COMPLETED',
  'CANCELLED',
]

const STATUS_OPTIONS = [
  'PROPOSAL_SENT',
  'IN_PROGRESS',
  'REVIEW',
  'COMPLETED',
  'CANCELLED',
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

function completedMilestoneCount(milestones: ProjectMilestone[]): number {
  return milestones.filter(
    (m) => m.status === 'APPROVED' || m.status === 'PAYMENT_RECEIVED'
  ).length
}

const SELECT_CLASS =
  'w-full bg-surface border border-border rounded-md py-2.5 px-3.5 text-base text-text-1 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft transition-colors'

export default function ProjectsPage() {
  const guardReady = useModeGuard('FREELANCE')
  const { t } = useI18n()
  const { showToast } = useToast()
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
  const [createStartDate, setCreateStartDate] = useState('')
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
      .catch(() => setError('projects.failedLoad'))
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

  // Stores an i18n key; rendered through t() so it stays locale-reactive.
  function showSaved(messageKey: string) {
    setSavedMessage(messageKey)
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

  // Double-submit guards: track the id being processed so the specific button
  // disables + shows a spinner while its PATCH is in flight, preventing repeat
  // clicks from firing duplicate requests before the optimistic update lands.
  const [payingMilestoneId, setPayingMilestoneId] = useState<string | null>(null)
  const [payingInvoiceId, setPayingInvoiceId] = useState<string | null>(null)

  // Money moments: a failure must speak (error toast) and a success must be
  // acknowledged with the amount restated — never a silent state flip.
  async function handleMilestonePayment(milestone: ProjectMilestone) {
    if (!selectedProject || payingMilestoneId) return
    setPayingMilestoneId(milestone.id)
    try {
      await updateMilestoneStatus(selectedProject.id, milestone.id, 'PAYMENT_RECEIVED')
      updateProjectMilestone(selectedProject.id, milestone.id, 'PAYMENT_RECEIVED')
      showToast(t('payment.recordedToast', { amount: formatUZS(milestone.amount) }), 'success')
    } catch {
      showToast(t('payment.recordFailed'), 'error')
    } finally {
      setPayingMilestoneId(null)
    }
  }

  async function handleMarkInvoicePaid(invoice: ProjectInvoice) {
    if (!selectedProject || payingInvoiceId) return
    setPayingInvoiceId(invoice.id)
    try {
      await markInvoicePaid(selectedProject.id, invoice.id)
      updateProjectInvoice(selectedProject.id, invoice.id, 'PAID')
      showToast(t('payment.recordedToast', { amount: formatUZS(invoice.total) }), 'success')
    } catch {
      showToast(t('payment.recordFailed'), 'error')
    } finally {
      setPayingInvoiceId(null)
    }
  }

  async function copyProposalLink() {
    if (!selectedProject) return
    try {
      // The accept endpoint requires the single-use token issued here — a
      // bare /proposals/:id link renders but can never be accepted.
      const { token } = await issueProposalLink(selectedProject.id)
      const base = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') ?? ''
      await navigator.clipboard.writeText(
        `${base}/api/v1/proposals/${selectedProject.id}?t=${token}`,
      )
      setCopiedProposal(true)
      setTimeout(() => setCopiedProposal(false), 2000)
    } catch {
      showToast(t('common.errorGeneric'), 'error')
    }
  }

  const handleCreateProject = async () => {
    if (!createName.trim()) {
      setCreateError('projects.errNameRequired')
      return
    }
    if (createCustomerMode === 'select' && !createCustomerId) {
      setCreateError('projects.selectClient')
      return
    }
    if (createCustomerMode === 'manual' && !createManualCustomerName.trim()) {
      setCreateError('projects.errClientName')
      return
    }
    if (!createTotalPrice || Number(createTotalPrice) <= 0) {
      setCreateError('projects.errValidPrice')
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
        startDate: createStartDate || undefined,
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
      setCreateStartDate('')
      setCreateDeadline('')
      setCreateCustomerId('')
      setCreateManualCustomerName('')
      setCreateCustomerMode('select')
      setCreatePaymentTerms('')
      showSaved('projects.createdToast')
    } catch {
      setCreateError('projects.errCreateFailed')
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
      showSaved('projects.milestoneAddedToast')
    } catch {
      // show error inline
    } finally {
      setAddingMilestone(false)
    }
  }

  const handleSaveEditProject = async () => {
    if (!selectedProject) return
    if (!editProjectName.trim()) {
      setEditError('projects.errNameRequired')
      return
    }
    if (!editProjectTotalPrice || Number(editProjectTotalPrice) <= 0) {
      setEditError('projects.errValidPrice')
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
      showSaved('projects.updatedToast')
    } catch {
      setEditError('projects.errSaveFailed')
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

  if (!guardReady) return null

  return (
    <AuthLayout title={t('nav.projects')}>
      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-text-1">{t('nav.projects')}</h1>
          <p className="text-sm text-text-2 mt-1">
            {t('projects.totalProjects', { count: total })}
          </p>
        </div>
        <Button
          variant="primary"
          leftIcon="add"
          onClick={() => setShowCreateForm(true)}
        >
          {t('home.quickActionNewProject')}
        </Button>
      </div>

      {/* ── Status filters ──────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 mb-6">
        {STATUS_FILTERS.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              setStatusFilter(value)
              setPage(1)
            }}
            className={chip(statusFilter === value)}
          >
            {value === 'ALL' ? t('common.all') : t('status.' + value)}
          </button>
        ))}
      </div>

      {/* ── List ─────────────────────────────────────────────────── */}
      <div className="space-y-3">
        {loading ? (
          <LoadingSpinner />
        ) : error ? (
          <Card>
            <p className="text-base text-error-strong">
              {t(error)}
              <button
                className="ml-2 text-base font-semibold text-accent hover:text-accent-hover"
                onClick={() => {
                  setError(null)
                  fetchProjects()
                }}
              >
                {t('common.tryAgain')}
              </button>
            </p>
          </Card>
        ) : projects.length === 0 ? (
          <Card className="text-center py-12">
            <div className="mx-auto mb-4 w-16 h-16 rounded-lg bg-accent-soft flex items-center justify-center text-accent">
              <Icon name="projects" size={28} />
            </div>
            <p className="text-base text-text-2">{t('projects.empty')}</p>
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
                    <p className="text-base text-text-2 truncate">
                      {project.customer.name}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-text-2">
                    <p className="tabular-nums">
                      {t('projects.milestoneProgress', {
                        done: completedMilestoneCount(project.milestones),
                        total: project.milestones.length,
                      })}
                    </p>
                    {project.deadline && (
                      <p className="text-text-3">
                        {t('projects.dueDate', { date: formatDate(project.deadline) })}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <Badge status={project.status} type="project" />
                  <p className="text-base font-bold text-text-1 tabular-nums">
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
            {t('customers.showing', {
              from: (page - 1) * LIMIT + 1,
              to: Math.min(page * LIMIT, total),
              total,
            })}
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              {t('common.previous')}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={page * LIMIT >= total}
              onClick={() => setPage(page + 1)}
            >
              {t('common.next')}
            </Button>
          </div>
        </div>
      )}

      {/* ── Detail slide-over ───────────────────────────────────── */}
      {selectedProject && (
        <SlideOver
          open
          onClose={() => setSelectedProject(null)}
          title={selectedProject.name}
          closeLabel={t('common.close')}
          maxWidth="md:max-w-xl"
          headerRight={
            !showEditProject && (
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
                {t('common.edit')}
              </Button>
            )
          }
        >
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              <p className="text-sm text-text-2 truncate">
                {t('projects.clientLabel', { name: selectedProject.customer.name })}
              </p>
              {showEditProject ? (
                /* Edit project inline form */
                <div className="space-y-4">
                  <div>
                    <label className="block text-base font-medium text-text-2 mb-1.5">
                      {t('projects.nameLabel')} *
                    </label>
                    <Input
                      type="text"
                      value={editProjectName}
                      onChange={(e) => setEditProjectName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-base font-medium text-text-2 mb-1.5">
                      {t('projects.totalPriceLabel')} ({currencyWord()}) *
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
                    <label className="block text-base font-medium text-text-2 mb-1.5">
                      {t('projects.scopeOfWork')}
                    </label>
                    <Textarea
                      rows={4}
                      value={editProjectDescription}
                      onChange={(e) => setEditProjectDescription(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-base font-medium text-text-2 mb-1.5">
                      {t('projects.deadlineLabel')}
                    </label>
                    <Input
                      type="date"
                      value={editProjectDeadline}
                      onChange={(e) => setEditProjectDeadline(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-base font-medium text-text-2 mb-1.5">
                      {t('common.statusLabel')}
                    </label>
                    <select
                      value={editProjectStatus}
                      onChange={(e) => setEditProjectStatus(e.target.value)}
                      className={SELECT_CLASS}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>{t('status.' + s)}</option>
                      ))}
                    </select>
                  </div>

                  {editError && (
                    <div className="p-3 bg-error-soft border border-error-strong rounded-md">
                      <p className="text-base text-error-strong">{t(editError)}</p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      variant="primary"
                      fullWidth
                      loading={editSaving}
                      onClick={handleSaveEditProject}
                    >
                      {editSaving ? t('projects.saving') : t('common.saveChanges')}
                    </Button>
                    <Button
                      variant="secondary"
                      fullWidth
                      onClick={() => setShowEditProject(false)}
                    >
                      {t('common.cancel')}
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
                      <p className="text-xs text-text-2 mb-1">{t('projects.totalValue')}</p>
                      <p className="text-base font-bold text-text-1 tabular-nums">
                        {formatUZS(selectedProject.totalPrice)}
                      </p>
                    </div>
                    <div className="bg-surface-2 border border-border rounded-md p-3">
                      <p className="text-xs text-text-2 mb-1">{t('projects.deadlineLabel')}</p>
                      <p className="text-base font-bold text-text-1">
                        {selectedProject.deadline
                          ? formatDate(selectedProject.deadline)
                          : t('projects.notSet')}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Description */}
              {!showEditProject && selectedProject.description && (
                <div>
                  <p className="text-xs font-semibold text-text-2 uppercase tracking-wider mb-2">
                    {t('projects.scopeOfWork')}
                  </p>
                  <p className="text-base text-text-1">{selectedProject.description}</p>
                </div>
              )}

              {/* Milestones */}
              {!showEditProject && (
                <div>
                  <p className="text-xs font-semibold text-text-2 uppercase tracking-wider mb-3">
                    {t('projects.milestones')}
                  </p>
                  {selectedProject.milestones.length === 0 ? (
                    <p className="text-base text-text-3">{t('projects.noMilestones')}</p>
                  ) : (
                    selectedProject.milestones.map((milestone) => (
                      <div
                        key={milestone.id}
                        className="border border-border rounded-md p-4 mb-3 bg-surface"
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="min-w-0">
                            <p className="text-base font-semibold text-text-1 truncate">
                              {milestone.name}
                            </p>
                            {milestone.dueDate && (
                              <p className="text-xs text-text-3 mt-0.5">
                                {t('projects.dueDate', { date: formatDate(milestone.dueDate) })}
                              </p>
                            )}
                          </div>
                          <p className="text-base font-bold text-text-1 tabular-nums flex-shrink-0">
                            {formatUZS(milestone.amount)}
                          </p>
                        </div>
                        <div className="flex items-center justify-between mt-2 gap-2">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-pill text-xs font-semibold ${milestoneTone(milestone.status)}`}
                          >
                            {t('status.' + milestone.status)}
                          </span>
                          {milestone.status === 'APPROVED' && (
                            <Button
                              variant="primary"
                              size="sm"
                              loading={payingMilestoneId === milestone.id}
                              onClick={() => handleMilestonePayment(milestone)}
                            >
                              {t('projects.markPaymentReceived')}
                            </Button>
                          )}
                          {milestone.status === 'SUBMITTED_FOR_REVIEW' && (
                            <span className="text-xs text-text-3">
                              {t('projects.waitingForClient')}
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
                      {t('projects.addMilestone')}
                    </Button>
                  )}

                  {showAddMilestone && (
                    <div className="border border-border rounded-md p-4 mt-2 bg-surface-2">
                      <p className="text-lg font-semibold text-text-1 mb-3">
                        {t('projects.newMilestone')}
                      </p>
                      <div className="space-y-3">
                        <Input
                          type="text"
                          value={milestoneName}
                          onChange={(e) => setMilestoneName(e.target.value)}
                          placeholder={t('projects.milestoneNamePlaceholder')}
                        />
                        <Input
                          type="number"
                          value={milestoneAmount}
                          onChange={(e) => setMilestoneAmount(e.target.value)}
                          placeholder={`${t('projects.amountLabel')} (${currencyWord()})`}
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
                            {addingMilestone ? t('projects.adding') : t('common.add')}
                          </Button>
                          <Button
                            variant="secondary"
                            fullWidth
                            size="sm"
                            onClick={() => setShowAddMilestone(false)}
                          >
                            {t('common.cancel')}
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
                    {t('projects.invoices')}
                  </p>
                  {selectedProject.invoices.length === 0 ? (
                    <p className="text-base text-text-3">{t('projects.noInvoices')}</p>
                  ) : (
                    selectedProject.invoices.map((invoice) => (
                      <div
                        key={invoice.id}
                        className="flex items-center justify-between p-4 border border-border rounded-md mb-2 bg-surface"
                      >
                        <div className="min-w-0 mr-3">
                          <p className="text-base font-semibold text-text-1 truncate">
                            {invoice.invoiceNumber}
                          </p>
                          <p className="text-xs text-text-3 mt-0.5">
                            {invoice.dueDate
                              ? t('projects.dueDate', { date: formatDate(invoice.dueDate) })
                              : t('projects.noDueDate')}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <p className="text-base font-bold text-text-1 tabular-nums">
                            {formatUZS(invoice.total)}
                          </p>
                          {invoice.status === 'UNPAID' && (
                            <Button
                              variant="primary"
                              size="sm"
                              loading={payingInvoiceId === invoice.id}
                              onClick={() => handleMarkInvoicePaid(invoice)}
                            >
                              {t('projects.markPaid')}
                            </Button>
                          )}
                          {invoice.status === 'PAID' && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-pill text-xs font-semibold bg-success-soft text-success-strong">
                              {t('status.PAID')}
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
                    {copiedProposal ? t('projects.copied') : t('projects.copyProposalLink')}
                  </Button>
                </div>
              )}
            </div>
        </SlideOver>
      )}

      {/* ── Create project slide-over ───────────────────────────── */}
      <SlideOver
        open={showCreateForm}
        onClose={() => setShowCreateForm(false)}
        title={t('home.quickActionNewProject')}
        closeLabel={t('common.close')}
      >
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Project name */}
              <div>
                <label className="block text-base font-medium text-text-2 mb-1.5">
                  {t('projects.nameLabel')} *
                </label>
                <Input
                  type="text"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder={t('projects.namePlaceholder')}
                />
              </div>

              {/* Client */}
              <div>
                <label className="block text-base font-medium text-text-2 mb-1.5">
                  {t('projects.clientField')} *
                </label>

                <div className="flex gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setCreateCustomerMode('select')}
                    className={chip(createCustomerMode === 'select', true)}
                  >
                    {t('projects.selectExisting')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreateCustomerMode('manual')}
                    className={chip(createCustomerMode === 'manual', true)}
                  >
                    {t('projects.enterManually')}
                  </button>
                </div>

                {createCustomerMode === 'select' ? (
                  <select
                    value={createCustomerId}
                    onChange={(e) => setCreateCustomerId(e.target.value)}
                    className={SELECT_CLASS}
                  >
                    <option value="">{t('projects.selectClient')}</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                ) : (
                  <Input
                    type="text"
                    value={createManualCustomerName}
                    onChange={(e) => setCreateManualCustomerName(e.target.value)}
                    placeholder={t('projects.clientNamePlaceholder')}
                  />
                )}
              </div>

              {/* Total price */}
              <div>
                <label className="block text-base font-medium text-text-2 mb-1.5">
                  {t('projects.totalPriceLabel')} ({currencyWord()}) *
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
                <label className="block text-base font-medium text-text-2 mb-1.5">
                  {t('projects.scopeOfWork')}
                </label>
                <Textarea
                  rows={4}
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                  placeholder={t('projects.descriptionPlaceholder')}
                />
              </div>

              {/* Start date (optional) — mirrors the Flutter project form */}
              <div>
                <label className="block text-base font-medium text-text-2 mb-1.5">
                  {t('projects.startDate')}
                </label>
                <Input
                  type="date"
                  value={createStartDate}
                  onChange={(e) => setCreateStartDate(e.target.value)}
                />
              </div>

              {/* Deadline */}
              <div>
                <label className="block text-base font-medium text-text-2 mb-1.5">
                  {t('projects.deadlineLabel')}
                </label>
                <Input
                  type="date"
                  value={createDeadline}
                  onChange={(e) => setCreateDeadline(e.target.value)}
                />
              </div>

              {/* Payment terms */}
              <div>
                <label className="block text-base font-medium text-text-2 mb-1.5">
                  {t('projects.paymentTerms')}
                </label>
                <Input
                  type="text"
                  value={createPaymentTerms}
                  onChange={(e) => setCreatePaymentTerms(e.target.value)}
                  placeholder={t('projects.paymentTermsPlaceholder')}
                />
              </div>
            </div>

            <div className="p-6 border-t border-border flex-shrink-0 space-y-3">
              {createError && (
                <div className="p-3 bg-error-soft border border-error-strong rounded-md">
                  <p className="text-base text-error-strong">{t(createError)}</p>
                </div>
              )}
              <Button
                variant="primary"
                fullWidth
                loading={createSaving}
                onClick={handleCreateProject}
              >
                {createSaving ? t('projects.saving') : t('projects.createProject')}
              </Button>
              <Button
                variant="secondary"
                fullWidth
                onClick={() => setShowCreateForm(false)}
              >
                {t('common.cancel')}
              </Button>
            </div>
      </SlideOver>

      {/* Success toast */}
      {savedMessage && (
        <div className="fixed bottom-6 right-6 bg-text-1 text-surface px-4 py-3 rounded-md text-base font-medium shadow-md z-50 flex items-center gap-2">
          <span className="text-success-soft">
            <Icon name="paid" size={16} />
          </span>
          {t(savedMessage)}
        </div>
      )}
    </AuthLayout>
  )
}
