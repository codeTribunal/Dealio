import '../../l10n/app_localizations.dart';

/// Maps backend status/enum codes to localized display labels.
/// Unknown codes fall back to the raw code so nothing ever renders blank.

String orderStatusLabel(AppLocalizations l, String status) {
  switch (status) {
    case 'NEW':
      return l.orderStatusNew;
    case 'PREPARING':
      return l.orderStatusPreparing;
    case 'READY':
      return l.orderStatusReady;
    case 'DELIVERED':
      return l.orderStatusDelivered;
    case 'CANCELLED':
      return l.orderStatusCancelled;
    default:
      return status;
  }
}

String paymentStatusLabel(AppLocalizations l, String status) {
  switch (status) {
    case 'PENDING':
      return l.paymentStatusPending;
    case 'PAYMENT_RECEIVED':
      return l.paymentStatusPaymentReceived;
    case 'CONFIRMED':
      return l.paymentStatusConfirmed;
    default:
      return status;
  }
}

String appointmentStatusLabel(AppLocalizations l, String status) {
  switch (status) {
    case 'REQUESTED':
      return l.appointmentStatusRequested;
    case 'CONFIRMED':
      return l.appointmentStatusConfirmed;
    case 'COMPLETED':
      return l.appointmentStatusCompleted;
    case 'CANCELLED':
      return l.appointmentStatusCancelled;
    case 'NO_SHOW':
      return l.appointmentStatusNoShow;
    default:
      return status;
  }
}

String projectStatusLabel(AppLocalizations l, String status) {
  switch (status) {
    case 'PROPOSAL_SENT':
      return l.projectStatusProposalSent;
    case 'IN_PROGRESS':
      return l.projectStatusInProgress;
    case 'REVIEW':
      return l.projectStatusReview;
    case 'COMPLETED':
      return l.projectStatusCompleted;
    case 'CANCELLED':
      return l.projectStatusCancelled;
    default:
      return status;
  }
}

String milestoneStatusLabel(AppLocalizations l, String status) {
  switch (status) {
    case 'PENDING':
      return l.milestoneStatusPending;
    case 'SUBMITTED_FOR_REVIEW':
      return l.milestoneStatusSubmittedForReview;
    case 'APPROVED':
      return l.milestoneStatusApproved;
    case 'PAYMENT_RECEIVED':
      return l.milestoneStatusPaymentReceived;
    default:
      return status;
  }
}

String invoiceStatusLabel(AppLocalizations l, String status) {
  switch (status) {
    case 'UNPAID':
      return l.invoiceStatusUnpaid;
    case 'PAID':
      return l.invoiceStatusPaid;
    default:
      return status;
  }
}

String stockLabel(AppLocalizations l, {required bool unlimited, int? stockQty}) {
  if (unlimited) return l.stockUnlimited;
  if (stockQty == null) return l.stockNoInfo;
  if (stockQty == 0) return l.stockOut;
  return l.stockIn(stockQty);
}

String deliveryMethodLabel(AppLocalizations l, String method) {
  switch (method) {
    case 'PICKUP':
      return l.deliveryMethodPickup;
    case 'DELIVERY':
      return l.deliveryMethodDelivery;
    default:
      return method;
  }
}
