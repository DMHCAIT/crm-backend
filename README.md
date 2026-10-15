# DMHCA CRM Backend

A comprehensive CRM backend API built with Node.js, Express, and integrated with Supabase, WhatsApp Business API, and Facebook API.

## Features

- **Lead Management**: Complete CRUD operations for leads with real-time updates
- **Student Management**: Manage student data and academic information
- **User Management**: Authentication and user role management
- **WhatsApp Integration**: Send messages and manage WhatsApp Business API
- **Facebook Integration**: Manage Facebook leads and communications
- **Analytics**: Comprehensive analytics and reporting
- **Document Management**: File upload and document handling
- **Payment Processing**: Payment tracking and management
- **Real-time Communications**: WebSocket support for real-time updates

## Tech Stack

- **Runtime**: Node.js 16+
- **Framework**: Express.js
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **File Storage**: Supabase Storage
- **Real-time**: Supabase Real-time subscriptions

## API Endpoints

### Deployment prerequisites

Before deploying this revision, run these scripts in the target Supabase SQL
editor (each is rerunnable and preserves existing leads):

1. `scheduled-calls-migration.sql`
2. `lead-duplicates-migration.sql`
3. `lead-overdue-migration.sql`

The overdue migration creates a service-role-only, security-invoker view.
Overdue means follow-up is in the past, status is neither Enrolled nor Not
Interested, and the lead has not been updated after its follow-up. Lists and
counts use this same view with reporting access filters, without a 5,000-row
cap or large ID-in-query URLs. Missing migrations cause visible request errors.
The view supports legacy text `followUp` columns as well as timestamp columns
by explicitly converting nonblank values to timestamps. Blank or null follow-ups
are excluded. Malformed nonblank dates raise an error rather than being silently
discarded; correct those dates before querying the overdue bucket. The migration
does not alter the column type or stored lead values.

Configure `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` and a strong `JWT_SECRET` on
the backend host. Use Node.js 22 LTS for both projects. Configure
`VITE_API_BASE_URL`, `VITE_API_BACKEND_URL`, `VITE_SUPABASE_URL` and
`VITE_SUPABASE_ANON_KEY` on the frontend host before building. Never expose a
service-role key through a `VITE_` variable. The frontend backend submodule
is a source reference, not a deployed API server: deploy the backend repository
separately, and configure the frontend to use its public URL.

Frontend clones can fetch the pinned backend using
`git submodule update --init --recursive`. Run all backend checks using `npm test`
(Node.js 18+; Node.js 22 LTS recommended). The cross-platform runner discovers
every `*.test.js`, `*.test.cjs`, and `*.test.mjs` file, including `api\__tests__`.
Legacy Jest/Vitest service and API tests now use Node's built-in test runner.
Redis, Supabase, SMTP, SendGrid, server listening, and dotenv are mocked at module
boundaries: tests never read `.env` or contact live services. Cache TTL tests use
a deterministic mock clock; calendar checks cover real query construction and
overlap semantics; health/auth checks assert current API contracts. Provider and
database errors follow the services' actual rejection contracts, not obsolete
`{ success: false }` expectations. Diagnostic scripts named `test-*.js` and
`test-integration.js` are manual live-service tools, not offline unit tests.
Run a focused check with `node --test __tests__\calendarService.test.js`.
Lead detail retrieval uses `GET /api/leads?id=<lead-id>&pageSize=1`; the ID
equality filter intersects the same role/reporting scope and other list filters.
An inaccessible or nonexistent ID returns an empty `leads` array, never another
lead from the caller's bucket. Analytics events are mounted at
`/api/analytics-events`, and legacy event tracking at `/api/analytics-tracking`;
enhanced analytics supports both `/api/analytics/*`
and `/api/enhanced-analytics/*`. Scheduled exports are mounted as an Express
router at `/api/scheduled-exports`, preserving its relative CRUD and run routes.
Deployment routing tests use an ephemeral loopback HTTP listener with mocked
database/email/cron boundaries, never the environment-loaded production server.
Run frontend lead regression tests using
`node --test src/__tests__/*.test.cjs`. `npm run build` produces frontend `dist`.
Verify `/health` and actual authenticated lead-list/create/import operations
after deployment; a health response alone does not validate database migrations.

### Automatic saving in lead details

Opening a lead makes its supported detail fields immediately editable. Text
fields save on blur; dropdowns and date/time fields save on change. The detail
panel displays saving, unsaved, saved, or error status with Retry. Failed values
stay in the form. Closing the panel or opening a different lead first flushes
pending edits and stays on the current lead if saving fails. Browser reload/close
warns while edits are unsaved. Notes retain their separate existing workflow.
Writes are serialized per open lead and contain only changed editable fields,
not notes or a full stale lead snapshot. Legacy unchanged phone numbers remain
usable; changed numbers require +country code. Changing Country does not erase
the existing phone. The list's explicit inline edit/save behavior is unchanged.
Revenue fields in the detail panel are read-only because the existing lead API
discards those fields; they are not falsely reported as saved.

### Lead list page size and selection

Leads Management defaults to **50** leads per page and also offers **All**.
Choosing All loads every lead matching the current
stage, filters, and role access in 500-row API pages, including beyond the
database's default row limit. Select-all selects that complete loaded view.
Choosing 50, 100, or 200 restores normal pagination; select-all then selects only
the displayed page. Changing page, page size, or filters clears the selection.
Incomplete or changed multi-page results surface a retryable error rather than
allowing a partial all-leads selection. Filtered requests do not fall back to
an unfiltered endpoint if the main request fails.

### Required email and duplicate-safe lead entry

Apply `lead-duplicates-migration.sql` in the Supabase SQL editor **before**
deploying this backend and frontend. It preserves all existing records,
including existing duplicates, and adds normalized contact lookup indexes,
a database duplicate-prevention trigger, and the service-role-only
`crm_find_lead_contacts` lookup. If the earlier migration failed because of
existing duplicates, run this complete updated migration instead; no cleanup
or deletion is required. New leads cannot reuse any existing phone or email.
Existing leads can retain their unchanged contacts (including formatting-only
changes), but a changed contact cannot match another lead. Per-contact database
lock rows serialize concurrent writes, including direct inserts and imports.
Lock rows are private implementation details, not permanently reserved
contacts: a contact can be reused after no lead uses it. Keep the trigger
enabled. Any unique indexes from an earlier successful migration remain intact.

Email is required along with name and phone for authenticated single-lead
creation and CSV/Excel imports, for every role. The legacy API-key Google Sheets
capture retains optional email, but requires an international phone and rejects
duplicate contacts. Existing lead records are not retroactively required to
have email.

- Single-lead creation and CSV/Excel imports require an international phone
  starting with `+` and a country code, with 7 to 15 digits total (for example
  `+91 9876543210`). Spaces, parentheses and hyphens are allowed. National-only
  numbers and `00` prefixes must be converted to `+country code` before upload.
  No country code is guessed or automatically added. The updated migration
  enforces this on new rows and changed phone contacts; existing unchanged
  numbers remain editable. Rerun the complete migration to update the trigger.
- Email matches ignore surrounding whitespace and case.
- Phone matches ignore punctuation/spaces and treat `00` and `+` international
  prefixes equivalently. Country codes are retained: include the country code
  consistently; a national-only number is not guessed to belong to a country.
- Either contact is sufficient to reject a duplicate, across the entire CRM,
  not just the viewer's page, search results, or reporting bucket.
- `POST /api/leads/duplicate-check` accepts `{ email, phone }`. The form checks
  while typing and before saving. Accessible duplicates include the complete
  normalized lead and a **View lead** action. Out-of-bucket duplicates include
  only assignee, matching contact types, and `canView: false`; no lead ID,
  contact details, notes, or other private fields are returned.
- `POST /api/leads/import-preview` accepts `{ leads }`, returning accepted rows,
  duplicate rows (CRM or within-file), and invalid rows with original row
  numbers. It performs no writes.
- After reviewing a CSV/Excel file, select the assignee and status.
  `POST /api/leads/bulk-create` accepts `{ leads, assignedTo, status }`, repeats
  the global duplicate check, skips duplicates/invalid rows, and assigns every
  accepted row to that assignee/status. These selections override file columns.
  Assignment is limited to the user's reporting bucket; admins may select any
  existing username. Imports accept up to 10,000 rows and insert in batches of
  200. The final report distinguishes inserted, duplicate, and invalid/failed
  rows, including contacts inserted by another request after preview.
- Duplicate-check failures block creation/import rather than allowing unchecked
  leads. The UI offers retry. Duplicate inserts return HTTP 409.

Run duplicate regression tests with
`node --test __tests__\lead-duplicates.test.js`.
From the frontend folder, run
`node --test src\__tests__\lead-duplicates.test.cjs`.

### Team leader bulk transfers

In the frontend Leads screen, team leaders can select multiple leads and click
**Transfer**, then choose themselves or a member of their reporting hierarchy.
There is no application-level limit on the number of selected leads.

The frontend sends `POST /api/leads` with `operation: "bulk_update"`,
`operationType: "transfer"`, `leadIds`, and `updateData.assignedTo` (a username).
The backend validates both the destination and all selected leads against the
team leader's recursive `reports_to` hierarchy before writing. Transfers support
an optional stage change in the same update. The transfer dialog
shows each selected lead's current stage and lets you choose **Lead Stage After
Transfer**. **Keep current stage (no change)** is the default and preserves each
lead's own stage, even for mixed-stage selections. Choosing a stage applies it
to all selected leads and includes `updateData.status` in the transfer request.
Closing or successfully completing the dialog resets this choice.

Transfers are processed in batches of 200. If a batch fails or ownership changes concurrently,
the API returns an explicit error; earlier batches may already have transferred,
so refresh the list before retrying. Existing manager/admin bulk actions are
unchanged.

Run the isolated transfer and reporting regression tests with
`node --test __tests__\team-leader-transfer.test.js __tests__\reporting-hierarchy.test.js`
(Node.js 18+).
From the frontend folder, run transfer payload tests with
`node --test src\__tests__\lead-transfer.test.cjs`.

### Core APIs
- `/api/health` - Health check endpoint
- `/api/leads` - Lead management
- `/api/students` - Student management
- `/api/users` - User management
- `/api/analytics` - Analytics and reporting
- `/api/dashboard` - Dashboard data
- `/api/documents` - Document management
- `/api/payments` - Payment processing
- `/api/communications` - Communication hub
- `/api/integrations` - External integrations

### Reporting team visibility

The Leads screen summary cards and status/date filter badges use
`GET /api/leads/stats` for exact database counts across the full accessible
lead bucket, independent of the current page, page size, search, or selected
filters. Counselors count their assigned leads; team leaders and managers count
their own leads and recursive reporting teams; admins and super admins count
all leads. The table still shows the current filtered, paginated result.

`stats.followup` counts the **Follow Up** status (unlike the legacy
`stats.followUps`, which counts leads with a follow-up date). Updated Today
counts database updates, not browser-local activity, and cannot be reset
locally. Date counts share the list endpoint's India-calendar boundaries and
rolling seven-day week filters. The Recently Imported badge matches the
existing server filter (updates within the last seven days); it does not
introduce a new import-source definition. Count query failures return an error
instead of misleading zero/page counts. The frontend displays a retry message.
Counts refresh after lead changes and periodically.

Run bucket-count regressions with
`node --test __tests__\lead-bucket-stats.test.js`.
From the frontend folder, run counter/query regressions with
`node --test src\__tests__\lead-bucket-stats.test.cjs`.

Manager, senior-manager, and team-leader lead lists and statistics include their
own leads and every descendant in the `users.reports_to` hierarchy. A senior
manager can therefore see reporting managers, their team leaders, and those
team leaders' members. Unrelated teams are excluded; admins retain full access.
The assignable-user/workload cards use the same hierarchy and display the
member's supervisor.

`GET /api/users/:id/subordinates` returns recursive reporting members.
`GET /api/users/:id/leads?includeTeam=true` includes the selected user's entire
reporting team; `includeTeam=false` returns that user's own leads. Both endpoints
require authentication and restrict non-admin viewers to their reporting team.
User and drill-down lead queries are paginated internally so the database's
default row limit does not hide members or leads.

Set each user's **Reports To** field correctly in user management; sharing a
role alone does not make users members of the same team.

### Scheduled call reminders

Run [scheduled-calls-migration.sql](./scheduled-calls-migration.sql) in the
Supabase SQL Editor before using this feature. It adds nullable
`scheduledCallAt` and `scheduledCallDismissedAt` timestamp-with-time-zone
columns and an index; existing follow-up dates are unchanged.

In lead details, choose **Schedule a Call** and click **Save Changes**.
The field is also available when creating or editing a lead in the list.
Times are entered/displayed in the browser's local timezone and stored as UTC.
New call times must be in the future; clearing the field cancels the schedule.

While the CRM is open, due calls appear in a persistent popup panel on every
dashboard role, but only for leads assigned to the signed-in user. Supervisors,
admins, and super admins do not receive other users' call popups, even if they
can view or edit those leads. Opening a lead, clicking outside, pressing Escape, or waiting
does not dismiss it. Clicking **X** saves dismissal in the database and
survives refresh/login. Updating the lead (including adding a note) at or after
the call time also clears the reminder. Changes before the call time do not
cancel it. Setting a different future call time enables a new reminder.
Dismissal does not modify the lead's `updatedAt` or clear follow-up reminders.

`GET /api/leads/call-reminders` returns active future and overdue calls assigned
to the signed-in user's database username, with internal pagination. The frontend arms a
timer for the next call, refreshes every 30 seconds, and catches up after the
tab becomes visible. `POST /api/leads` with `operation: "dismiss_call"`,
`leadId`, and `scheduledCallAt` dismisses only the matching accessible schedule,
so a stale popup cannot dismiss a newly rescheduled call. Only the assigned user
can dismiss the popup. Follow-up dates appear only in the notification bell
and overdue filter, not automatic or desktop popups. These call notifications
require the CRM tab to be open; they are not background/OS notifications.

Run call-reminder regression tests with
`node --test __tests__\scheduled-calls.test.js`.
From the frontend folder, run timing/timezone regressions with
`node --test src\__tests__\scheduled-calls.test.cjs`.

### Integration APIs
- `/api/whatsapp` - WhatsApp Business API integration
- `/api/facebook` - Facebook API integration

## Environment Variables

### Local frontend and backend

Run the backend on port `3001` with `NODE_ENV=development` in its `.env`.
In the separate frontend `.env.local`, set both `VITE_API_BASE_URL` and
`VITE_API_BACKEND_URL` to `http://localhost:3001`. Run the frontend with
`npm run dev` on port `5173`; do not use `5173` as the backend port.
Restart the backend after changing its `.env` and restart the frontend after
changing Vite configuration. The browser connection badge should identify the
local/development backend, not production. Production builds continue using
the frontend's explicit `--mode production` build script.

### Email and scheduled exports

Scheduled exports use the same `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` as
the other backend APIs; the legacy `SUPABASE_KEY` is also accepted for exports.

Regular email and scheduled-export delivery share the email service. For SMTP,
set `EMAIL_PROVIDER=smtp`, `SMTP_USER`, and `SMTP_PASS` in the backend `.env`.
`SMTP_PASSWORD` is accepted as a legacy alias for `SMTP_PASS`. Configure
`SMTP_HOST`, `SMTP_PORT` (default `587`), `SMTP_SECURE` (`true` for implicit TLS,
such as port `465`), and `EMAIL_FROM` for your provider. For SendGrid, set
`EMAIL_PROVIDER=sendgrid`, `SENDGRID_API_KEY`, and a verified `EMAIL_FROM`.
Never place these credentials in frontend `VITE_` variables.

Without SMTP credentials, the backend still starts and logs that email is
unavailable, but attempts to send email reject with an explicit configuration
error. These email settings are separate from `/api/auth/login`; login request
log lines alone do not indicate whether authentication succeeded.

Create a `.env` file with the following variables:

```env
# Server Configuration
PORT=3001
NODE_ENV=production

# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_key
SUPABASE_ANON_KEY=your_supabase_anon_key

# WhatsApp Business API
WHATSAPP_TOKEN=your_whatsapp_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_VERIFY_TOKEN=your_verify_token

# Facebook API
FACEBOOK_ACCESS_TOKEN=your_facebook_access_token
FACEBOOK_PAGE_ID=your_facebook_page_id

# Frontend URLs (for CORS)
FRONTEND_URL=https://your-frontend-domain.com
```

## Installation

1. Clone the repository
```bash
git clone https://github.com/DMHCAIT/crm-backend.git
cd crm-backend
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp .env.example .env
# Edit .env with your actual values
```

4. Start the server
```bash
# Development
npm run dev

# Production
npm start
```

## Deployment

### Railway Deployment

This project is configured for Railway deployment with `railway.json`:

1. Connect your GitHub repository to Railway
2. Set up environment variables in Railway dashboard
3. Deploy automatically on push to main branch

### Manual Deployment

1. Build and start:
```bash
npm install
npm start
```

## API Documentation

### Health Check
```
GET /api/health
```

### Lead Management
```
GET /api/leads - Get all leads
POST /api/leads - Create new lead
PUT /api/leads/:id - Update lead
DELETE /api/leads/:id - Delete lead
```

### Student Management
```
GET /api/students - Get all students
POST /api/students - Create new student
PUT /api/students/:id - Update student
DELETE /api/students/:id - Delete student
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For support, email support@dmhca.com or create an issue in the GitHub repository.
