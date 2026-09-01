# Catalyst Data Store — table creation specification

Derived from the application source on 2026-09-01, not from assumption. Every column below is a
field the code actually reads or writes; nothing here is speculative. Verified against
`backend/functions/**` with `backend/functions` and `functions` confirmed identical.

Guarded by `scripts/datastore-schema-regression.sh` (14 checks) so the code and this document
cannot drift apart silently.

---

## Read this first — three things that will otherwise cost a day

**1. Nine tables, not six.** `dataStore.js` declares eleven names. Two of them — `Payments` and
`AuditLogs` — are never bound by `getTable()` anywhere in the codebase. **Do not create them.**
The nine that matter are below. The original blocker list named only six; `Counselors`, `Cases`
and `Bookings` were missing from it and are required by signup and booking.

**2. Never create `ROWID`, `CREATEDTIME` or `MODIFIEDTIME`.** Catalyst manages these itself. The
code strips them from every payload before writing. Creating them by hand will collide.

**3. Every timestamp column is `Text`, not `DateTime`.** The application writes ISO-8601
(`2026-09-01T17:05:30.299Z`). Catalyst's `DateTime` type expects `yyyy-MM-dd HH:mm:ss` and
**rejects the ISO form** — and that rejection surfaces only as a warning in the application log
while the write silently does not happen. `Text` is the correct choice here, deliberately.

---

## Column type key

`Text(n)` = varchar, max length n · `Int` · `BigInt` · `Boolean`

Columns marked **JSON** hold an object or array serialised to a JSON string. Catalyst has no JSON
column type; the application serialises on write and parses on read
(`JSON_COLUMNS` in `dataStore.js`). Give these generous lengths.

Mandatory means the code always writes a value. Everything else can be null.

---

## 1. `Leads`

| Column | Type | Mandatory | Notes |
|---|---|---|---|
| `leadId` | Text(40) | yes | **Unique.** `LEAD_RQ_<year>_<4 digits>` |
| `name` | Text(255) | yes | |
| `email` | Text(100) | yes | Validated ≤100 at the door. **Index this** — CRM dedupe is by email |
| `phone` | Text(30) | no | |
| `country` | Text(100) | no | |
| `university` | Text(255) | no | |
| `program` | Text(255) | no | |
| `studyInterest` | Text(255) | no | Defaults to `General Study Abroad` |
| `message` | Text(32000) | no | Matches the CRM Description clamp |
| `source` | Text(100) | yes | Defaults to `Website Inquiry Form` |
| `status` | Text(32) | yes | `NEW_LEAD` |
| `createdAt` | Text(32) | yes | ISO-8601 |
| `zohoCrmLeadId` | Text(64) | no | Written after CRM sync |
| `zohoCrmStatus` | Text(32) | no | Written after CRM sync |

**Consent columns — create these at the same time, before Phase 8 activation.** While the consent
gate is off they are never written; the moment it is switched on they are, and a missing column
becomes a silent write failure on the single most compliance-sensitive record you hold.

| Column | Type | Notes |
|---|---|---|
| `Consent_Given` | Boolean | |
| `Consent_Timestamp` | Text(32) | Server-generated, never client-supplied |
| `Consent_Policy_Version` | Text(40) | The 40-character ceiling comes from here |
| `Parent_Consent` | Boolean | |

## 2. `Users`

| Column | Type | Mandatory | Notes |
|---|---|---|---|
| `userId` | Text(40) | yes | **Unique** |
| `studentId` | Text(40) | yes | Links to `Students.studentId` |
| `email` | Text(100) | yes | **Unique. Index this** — every login looks up by email |
| `password` | Text(255) | yes | `scrypt$<32 hex>$<128 hex>` = 168 chars. Never plaintext |
| `role` | Text(16) | yes | `student` today; `staff` gates the Leads listing |
| `fullName` | Text(255) | yes | |
| `isEmailVerified` | Boolean | yes | |
| `verificationToken` | Text(64) | no | 48 hex chars |
| `resetToken` | Text(64) | no | 48 hex chars. **Credential — never log or export** |
| `resetTokenExpiry` | BigInt | no | Epoch milliseconds, not a date string |
| `createdAt` | Text(32) | yes | ISO-8601 |
| `lastLogin` | Text(32) | yes | ISO-8601 |
| `leadId` | Text(40) | no | Set after CRM sync |
| `crmModule` | Text(16) | no | `Leads` or `Contacts` |
| `invoices` | Text(4000) | no | **JSON** `{ service_code: invoiceId }` |

## 3. `Students`

| Column | Type | Mandatory | Notes |
|---|---|---|---|
| `studentId` | Text(40) | yes | **Unique. Index this** — ownership checks resolve by it |
| `userId` | Text(40) | yes | |
| `leadId` | Text(40) | no | |
| `caseId` | Text(40) | no | |
| `counselorId` | Text(40) | no | Null until a real counsellor exists |
| `fullName` | Text(255) | yes | |
| `email` | Text(100) | yes | **Index this** |
| `phone` | Text(30) | no | |
| `countryOfCitizenship` | Text(100) | no | |
| `currentLocation` | Text(100) | no | |
| `targetDegree` | Text(255) | no | |
| `targetMajor` | Text(255) | no | |
| `targetIntake` | Text(64) | no | |
| `journeyStage` | Text(64) | yes | |
| `journeyStepIndex` | Int | yes | |
| `totalJourneySteps` | Int | yes | |
| `targetCountries` | Text(2000) | yes | **JSON** array |
| `targetUniversities` | Text(4000) | yes | **JSON** array |
| `academicHistory` | Text(4000) | yes | **JSON** nested object |
| `nextAction` | Text(2000) | yes | **JSON** object |
| `zohoCrmSyncStatus` | Text(1000) | yes | **JSON** object |

## 4. `Documents`

| Column | Type | Mandatory | Notes |
|---|---|---|---|
| `documentId` | Text(40) | yes | **Unique** |
| `studentId` | Text(40) | yes | **Index this** |
| `documentType` | Text(40) | yes | One of the ten categories in `documents/index.js` |
| `title` | Text(255) | yes | |
| `fileName` | Text(255) | yes | |
| `fileSize` | Text(32) | no | Stored as a display string, not a number |
| `mimeType` | Text(128) | no | |
| `uploadedAt` | Text(32) | yes | ISO-8601 |
| `reviewStatus` | Text(32) | yes | `UNDER_REVIEW` on creation |
| `reviewerNotes` | Text(4000) | no | |
| `zohoWorkDriveFileId` | Text(64) | no | Null means **the file itself is not stored** |

## 5. `Notifications`

| Column | Type | Mandatory | Notes |
|---|---|---|---|
| `notificationId` | Text(40) | yes | **Unique** |
| `studentId` | Text(40) | yes | **Index this** |
| `type` | Text(40) | yes | |
| `title` | Text(255) | yes | |
| `message` | Text(2000) | yes | |
| `read` | Boolean | yes | |
| `createdAt` | Text(32) | yes | ISO-8601 |
| `actionUrl` | Text(255) | no | Internal path only — guarded client-side by `internalPath()` |

## 6. `IntegrationEvents`

| Column | Type | Mandatory | Notes |
|---|---|---|---|
| `event` | Text(64) | yes | |
| `timestamp` | Text(32) | no | ISO-8601 |
| `receivedAt` | Text(32) | no | ISO-8601 |
| `direction` | Text(16) | no | inbound / outbound |
| `payload` | Text(32000) | no | **JSON** |
| `data` | Text(32000) | no | **JSON** |
| `userId` | Text(40) | no | |
| `service` | Text(64) | no | |
| `invoiceId` | Text(64) | no | |

## 7. `Cases`

| Column | Type | Mandatory | Notes |
|---|---|---|---|
| `caseId` | Text(40) | yes | **Unique** |
| `studentId` | Text(40) | yes | **Index this** |
| `counselorId` | Text(40) | no | |
| `stage` | Text(64) | yes | Counsellor/CRM-driven — never self-reportable by a student |
| `status` | Text(32) | yes | |
| `startDate` | Text(32) | yes | ISO-8601 |
| `targetIntake` | Text(64) | no | |
| `milestones` | Text(8000) | yes | **JSON** array |

## 8. `Bookings`

| Column | Type | Mandatory | Notes |
|---|---|---|---|
| `bookingId` | Text(40) | yes | **Unique** |
| `studentId` | Text(40) | yes | **Index this** |
| `counselorId` | Text(40) | no | |
| `counselorName` | Text(255) | no | Falls back to `Admissions Counselor` |
| `date` | Text(32) | yes | |
| `timeSlot` | Text(32) | yes | |
| `consultationType` | Text(128) | no | |
| `meetingType` | Text(32) | no | |
| `meetingUrl` | Text(512) | no | Null until a real link exists — never a placeholder |
| `notes` | Text(4000) | no | |
| `status` | Text(32) | yes | |
| `zohoBookingsId` | Text(64) | no | |

## 9. `Counselors`

Seeded **empty on purpose** — a fabricated counsellor was removed from this table. Create the
table so real people can be added; do not populate it with anyone who does not exist.

| Column | Type | Mandatory | Notes |
|---|---|---|---|
| `counselorId` | Text(40) | yes | **Unique** |
| `name` | Text(255) | yes | |
| `email` | Text(100) | yes | |
| `phone` | Text(30) | no | |
| `title` | Text(255) | no | |

---

## Founder checklist

- [ ] Create the **nine** tables above. Do **not** create `Payments` or `AuditLogs`.
- [ ] Do **not** create `ROWID`, `CREATEDTIME`, `MODIFIEDTIME` on any table.
- [ ] Every timestamp column is **Text**, never DateTime.
- [ ] Create the four `Consent_*` columns on `Leads` now, even though the gate is off.
- [ ] Add the unique constraints and indexes marked above.
- [ ] Leave `Counselors` empty.
- [ ] Then run `GET /api/health` and confirm every table reports `PERSISTENT`, not
      `IN_MEMORY_FALLBACK`. That endpoint reports the real probe result and will not flatter you.
- [ ] Then submit one test lead and confirm it is still readable after an instance restart.

Until the first box is ticked, `POST /api/leads` returns **503 SUBMISSION_NOT_STORED** by design —
see the durability gate in `backend/functions/leads/index.js`.
