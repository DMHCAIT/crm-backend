function normalizeCallTime(value) {
  if (value === null || value === '') return null;
  if (typeof value !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) ||
      !Number.isFinite(Date.parse(value))) {
    throw new Error('Scheduled call requires a valid date and time with a timezone');
  }
  const calendarDate = value.slice(0, 10);
  if (new Date(`${calendarDate}T00:00:00Z`).toISOString().slice(0, 10) !== calendarDate) {
    throw new Error('Scheduled call requires a valid date and time with a timezone');
  }
  return new Date(value).toISOString();
}

function isActiveCall(lead) {
  if (!lead.scheduledCallAt || lead.scheduledCallDismissedAt) return false;
  const due = Date.parse(lead.scheduledCallAt);
  const updated = lead.updatedAt ? Date.parse(lead.updatedAt) : 0;
  return Number.isFinite(due) && !(updated >= due);
}

module.exports = { normalizeCallTime, isActiveCall };
