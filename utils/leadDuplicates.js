const { getAccessibleUsernames, getOwnUsername } = require('./reportingHierarchy');

const LEAD_STATUSES = new Set([
  'new', 'contacted', 'qualified', 'converted', 'lost',
  'Fresh', 'Hot', 'Warm', 'Follow Up', 'Enrolled', 'Will Enroll Later',
  'Not Answering', 'Not Interested', 'Junk'
]);

const normalizeEmail = value => typeof value === 'string' ? value.trim().toLowerCase() : '';
const normalizePhone = value => typeof value === 'string' ? value.replace(/[^0-9]/g, '').replace(/^00/, '') : '';

const isInternationalPhone = value => typeof value === 'string' &&
  /^\+[1-9][\d\s()-]{6,28}$/.test(value.trim()) &&
  normalizePhone(value).length >= 7 && normalizePhone(value).length <= 15;

function validateLeadContact(lead) {
  if (!lead || typeof lead !== 'object' || Array.isArray(lead)) return 'Invalid lead row';
  if (typeof (lead.fullName || lead.name) !== 'string' || !(lead.fullName || lead.name).trim()) return 'Full name is required';
  if (!normalizeEmail(lead.email)) return 'Email is required';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email.trim())) return 'Invalid email format';
  if (!isInternationalPhone(lead.phone)) return 'Phone must include +country code and 7 to 15 digits (for example +91 9876543210)';
  return null;
}

async function findContactMatches(supabase, contacts) {
  const emails = [...new Set(contacts.map(lead => normalizeEmail(lead.email)).filter(Boolean))];
  const phones = [...new Set(contacts.map(lead => normalizePhone(lead.phone)).filter(Boolean))];
  const matches = new Map();
  for (let start = 0; start < Math.max(emails.length, phones.length); start += 200) {
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await supabase.rpc('crm_find_lead_contacts', {
        emails: emails.slice(start, start + 200),
        phones: phones.slice(start, start + 200)
      }).range(offset, offset + 499);
      if (error) throw new Error(`Duplicate check failed. Apply lead-duplicates-migration.sql and retry: ${error.message}`);
      if (!Array.isArray(data)) throw new Error('Duplicate check returned no data');
      for (const match of data) matches.set(match.id, match);
      if (data.length < 500) break;
    }
  }
  return [...matches.values()];
}

function matchingContacts(lead, matches) {
  const email = normalizeEmail(lead.email);
  const phone = normalizePhone(lead.phone);
  return matches.filter(match =>
    (email && normalizeEmail(match.email) === email) ||
    (phone && normalizePhone(match.phone) === phone));
}

async function describeDuplicates(supabase, user, contact, matches, normalizeLead) {
  const accessible = await getAccessibleUsernames(supabase, user);
  const descriptions = [];
  for (const match of matchingContacts(contact, matches)) {
    const matchedBy = [];
    if (normalizeEmail(contact.email) && normalizeEmail(match.email) === normalizeEmail(contact.email)) matchedBy.push('email');
    if (normalizePhone(contact.phone) && normalizePhone(match.phone) === normalizePhone(contact.phone)) matchedBy.push('phone');
    const canView = accessible === null || accessible.includes(match.assignedTo);
    const description = { assignedTo: match.assignedTo || null, matchedBy, canView: false };
    if (canView) {
      let query = supabase.from('leads').select('*').eq('id', match.id);
      if (accessible !== null) query = query.in('assignedTo', accessible);
      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      // Ownership may have changed after the lookup. Never return stale full details.
      if (data) {
        description.canView = true;
        description.lead = normalizeLead(data);
      }
    }
    descriptions.push(description);
  }
  return descriptions;
}

async function resolveLeadAssignee(supabase, user, requested) {
  const own = await getOwnUsername(supabase, user);
  const assignedTo = typeof requested === 'string' && requested.trim() ? requested.trim() : own;
  const accessible = await getAccessibleUsernames(supabase, user);
  if (accessible !== null && !accessible.includes(assignedTo)) {
    const error = new Error('You can only assign leads to yourself or your reporting team');
    error.statusCode = 403;
    throw error;
  }
  if (accessible === null) {
    const { data, error } = await supabase.from('users').select('username').eq('username', assignedTo).maybeSingle();
    if (error) throw error;
    if (!data) {
      const invalid = new Error('Select a valid assignee');
      invalid.statusCode = 400;
      throw invalid;
    }
  }
  return assignedTo;
}

async function reviewImport(supabase, leads) {
  const matches = await findContactMatches(supabase, leads.filter(lead => lead && typeof lead === 'object'));
  const existingEmails = new Set(matches.map(match => normalizeEmail(match.email)).filter(Boolean));
  const existingPhones = new Set(matches.map(match => normalizePhone(match.phone)).filter(Boolean));
  const seenEmails = new Set();
  const seenPhones = new Set();
  const accepted = [];
  const duplicates = [];
  const invalid = [];
  for (let index = 0; index < leads.length; index++) {
    const lead = leads[index];
    const rowNumber = Number.isInteger(lead?.rowNumber) ? lead.rowNumber : index + 2;
    const error = validateLeadContact(lead);
    if (error) {
      invalid.push({ rowNumber, error });
      continue;
    }
    const email = normalizeEmail(lead.email);
    const phone = normalizePhone(lead.phone);
    const existing = existingEmails.has(email) || existingPhones.has(phone);
    const inFile = seenEmails.has(email) || seenPhones.has(phone);
    if (existing || inFile) {
      duplicates.push({ rowNumber, reason: existing ? 'Already in CRM' : 'Repeated in file' });
      continue;
    }
    seenEmails.add(email);
    seenPhones.add(phone);
    accepted.push({ ...lead, email: lead.email.trim(), phone: lead.phone.trim(), rowNumber });
  }
  return { accepted, duplicates, invalid, total: leads.length };
}

module.exports = {
  LEAD_STATUSES, normalizeEmail, normalizePhone, isInternationalPhone, validateLeadContact,
  findContactMatches, matchingContacts, describeDuplicates, resolveLeadAssignee, reviewImport
};
