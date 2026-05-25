import {
  formatOrderStatus,
  formatPaymentStatus,
  formatAppointmentStatus,
  formatProjectStatus,
} from '@/lib/format'

interface ActivityBadgeProps {
  status: string
  type: 'order' | 'payment' | 'appointment' | 'project'
}

const orderColors: Record<string, string> = {
  NEW: 'bg-blue-50 text-blue-700',
  PREPARING: 'bg-yellow-50 text-yellow-700',
  READY: 'bg-green-50 text-green-700',
  DELIVERED: 'bg-gray-50 text-gray-700',
  CANCELLED: 'bg-red-50 text-red-700',
}

const paymentColors: Record<string, string> = {
  PENDING: 'bg-orange-50 text-orange-700',
  PAYMENT_RECEIVED: 'bg-yellow-50 text-yellow-700',
  CONFIRMED: 'bg-green-50 text-green-700',
}

const appointmentColors: Record<string, string> = {
  REQUESTED: 'bg-blue-50 text-blue-700',
  CONFIRMED: 'bg-green-50 text-green-700',
  COMPLETED: 'bg-gray-50 text-gray-700',
  CANCELLED: 'bg-red-50 text-red-700',
  NO_SHOW: 'bg-red-50 text-red-700',
}

const projectColors: Record<string, string> = {
  PROPOSAL_SENT: 'bg-purple-50 text-purple-700',
  IN_PROGRESS: 'bg-blue-50 text-blue-700',
  REVIEW: 'bg-yellow-50 text-yellow-700',
  COMPLETED: 'bg-green-50 text-green-700',
  CANCELLED: 'bg-red-50 text-red-700',
}

export default function ActivityBadge({ status, type }: ActivityBadgeProps) {
  let colorClass = 'bg-gray-50 text-gray-700'
  let label = status

  if (type === 'order') {
    colorClass = orderColors[status] || colorClass
    label = formatOrderStatus(status)
  } else if (type === 'payment') {
    colorClass = paymentColors[status] || colorClass
    label = formatPaymentStatus(status)
  } else if (type === 'appointment') {
    colorClass = appointmentColors[status] || colorClass
    label = formatAppointmentStatus(status)
  } else if (type === 'project') {
    colorClass = projectColors[status] || colorClass
    label = formatProjectStatus(status)
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}
    >
      {label}
    </span>
  )
}
