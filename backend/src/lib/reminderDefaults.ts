export interface ReminderSettings {
  appointmentEnabled: boolean;
  appointmentHoursBefore: number;
  appointmentSecondEnabled: boolean;
  appointmentSecondHoursBefore: number;
  deliveryEnabled: boolean;
  deliveryHoursBefore: number;
  deadlineEnabled: boolean;
  deadlineHoursBefore: number;
}

export const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  appointmentEnabled: true,
  appointmentHoursBefore: 24,
  appointmentSecondEnabled: true,
  appointmentSecondHoursBefore: 1,
  deliveryEnabled: true,
  deliveryHoursBefore: 24,
  deadlineEnabled: true,
  deadlineHoursBefore: 48,
};

export function mergeReminderSettings(stored: unknown): ReminderSettings {
  if (!stored || typeof stored !== 'object') {
    return { ...DEFAULT_REMINDER_SETTINGS };
  }
  return {
    ...DEFAULT_REMINDER_SETTINGS,
    ...(stored as Partial<ReminderSettings>),
  };
}
