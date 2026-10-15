# API contract

This contract describes every HTTP route the server registers today. Shapes match the handlers in `src/`. The base path is `/api/v1` except the health check. The process listens on `PORT` (default `5000`).

Two success envelopes are in use:

- Most routes: `{ "success": true, "message": "...", "data": {} }`
- Public jobs and the recruiter status update: `{ "status": "success", ... }`

Errors that pass through the error handler use `{ "success": false, "message": "..." }`. In `NODE_ENV=development` that body also includes `stack`.

## Conventions

### Authentication

Protected routes require:

```
Authorization: Bearer <token>
```

The token is the JWT returned by login. It expires according to `JWT_EXPIRES_IN` (default `7d`).


| Status | Body                                                                                   | When                      |
| ------ | -------------------------------------------------------------------------------------- | ------------------------- |
| 401    | `{ "success": false, "message": "Access denied. No token provided." }`                 | Missing bearer token      |
| 401    | `{ "success": false, "message": "Invalid session. User no longer exists." }`           | Token subject was deleted |
| 401    | `{ "success": false, "message": "Invalid or expired token." }`                         | Bad signature or expiry   |
| 403    | `{ "success": false, "message": "Access denied. Job seeker account required." }`       | `requireJobseeker` failed |
| 403    | `{ "success": false, "message": "Access denied. Recruiter account required." }`        | `requireRecruiter` failed |
| 403    | `{ "success": false, "message": "Access denied. Administrator privileges required." }` | `requireAdmin` failed     |


Roles are `jobseeker`, `recruiter`, and `admin`. Public registration cannot create an admin. Recruiter accounts start with `verificationStatus: "pending"`.

### Rate limits


| Limiter       | Window     | Max                                                            | Routes                                                                                      |
| ------------- | ---------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Login         | 15 minutes | 5 failed attempts. A response under status 400 is not counted. | `POST /api/v1/auth/login`                                                                   |
| Public        | 10 minutes | 100                                                            | Register, confirm email, resend confirmation, `GET /api/v1/jobs`, `GET /api/v1/jobs/:jobId` |
| Authenticated | 10 minutes | 100                                                            | Users, applications, recruiter routes, attachments, statistics                              |



| Status | Body                                                                                                    |
| ------ | ------------------------------------------------------------------------------------------------------- |
| 429    | `{ "success": false, "message": "Too many failed login attempts. Please try again after 15 minutes." }` |
| 429    | `{ "success": false, "message": "Too many requests. Please slow down." }`                               |


Responses include the standard `RateLimit-*` headers.

### Shared error body

```json
{
  "success": false,
  "message": "Human-readable reason"
}
```


| Status | Typical cause                                                                |
| ------ | ---------------------------------------------------------------------------- |
| 400    | Validation, bad id, bad query, duplicate key handled by the error middleware |
| 403    | Role or ownership rule                                                       |
| 404    | Missing resource, or a resource the caller must not learn exists             |
| 409    | Illegal stage change, or a duplicate interview round                         |
| 415    | Attachment type is not PDF, DOC, or DOCX                                     |
| 500    | Unhandled exception                                                          |
| 503    | Email could not be sent, or Cloudinary is not configured                     |


Duplicate-key errors that reach the error handler return 400: `Duplicate value entered for <field>. It must be unique.` A cast error returns 400: `Resource not found with id of <value>.`

### Stage rules


| From                       | Allowed next        | Who        |
| -------------------------- | ------------------- | ---------- |
| Applied                    | Interview, Rejected | Recruiter  |
| Applied                    | Withdrawn           | Job seeker |
| Interview                  | Offer, Rejected     | Recruiter  |
| Interview                  | Withdrawn           | Job seeker |
| Offer, Rejected, Withdrawn | none                | Terminal   |


A recruiter status call may request only `Interview`, `Offer`, or `Rejected`. Withdrawal is a separate job-seeker route.

## Route index


| Method | Path                                                                    | Auth                                     |
| ------ | ----------------------------------------------------------------------- | ---------------------------------------- |
| GET    | `/health`                                                               | Public                                   |
| POST   | `/api/v1/auth/register`                                                 | Public                                   |
| GET    | `/api/v1/auth/confirm-email`                                            | Public                                   |
| POST   | `/api/v1/auth/resend-confirmation`                                      | Public                                   |
| POST   | `/api/v1/auth/login`                                                    | Public                                   |
| GET    | `/api/v1/users/me`                                                      | Any logged-in user                       |
| PATCH  | `/api/v1/users/me`                                                      | Any logged-in user                       |
| GET    | `/api/v1/jobs`                                                          | Public                                   |
| GET    | `/api/v1/jobs/:jobId`                                                   | Public                                   |
| POST   | `/api/v1/jobs/:jobId/apply`                                             | Job seeker                               |
| GET    | `/api/v1/applications`                                                  | Job seeker                               |
| GET    | `/api/v1/applications/:applicationId`                                   | Job seeker                               |
| PATCH  | `/api/v1/applications/:applicationId/withdraw`                          | Job seeker                               |
| PATCH  | `/api/v1/recruiter/applications/:applicationId/status`                  | Verified recruiter                       |
| POST   | `/api/v1/recruiter/applications/:applicationId/interviews`              | Recruiter                                |
| PATCH  | `/api/v1/recruiter/applications/:applicationId/interviews/:interviewId` | Recruiter                                |
| PATCH  | `/api/v1/recruiter/applications/:applicationId/deadline`                | Recruiter                                |
| POST   | `/api/v1/attachments`                                                   | Job seeker                               |
| GET    | `/api/v1/attachments`                                                   | Any logged-in user                       |
| GET    | `/api/v1/attachments/:id`                                               | Owner or admin                           |
| GET    | `/api/v1/attachments/:id/link`                                          | Owner or admin                           |
| DELETE | `/api/v1/attachments/:id`                                               | Owner or admin                           |
| GET    | `/api/v1/statistics`                                                    | Job seeker                               |
| GET    | `/api/v1/statistics/attachments`                                        | Any logged-in user; `scope=all` is admin |
| GET    | `/api/v1/notifications`                                                 | Any logged-in user                       |
| PATCH  | `/api/v1/notifications/:notificationId/read`                            | Owner of the notice                      |




## Health



### GET `/health`

No request body.

`200`

```json
{
  "success": true,
  "message": "Server is running"
}
```



## Auth



### POST `/api/v1/auth/register`

`Content-Type: application/json`

```json
{
  "name": "Ada Okafor",
  "email": "ada@example.com",
  "password": "at-least-8",
  "role": "jobseeker",
  "companyName": "Required only when role is recruiter"
}
```

`role` is optional and defaults to `jobseeker`. Allowed values are `jobseeker` and `recruiter`.

`201`

```json
{
  "success": true,
  "message": "Registration successful. Check your email to confirm your account before logging in.",
  "data": {
    "_id": "66f0...",
    "name": "Ada Okafor",
    "email": "ada@example.com",
    "role": "jobseeker"
  }
}
```


| Status | Message                                                                                                  |
| ------ | -------------------------------------------------------------------------------------------------------- |
| 400    | `Name, email, and password are required.`                                                                |
| 400    | `Please provide a valid email address.`                                                                  |
| 400    | `Password must be at least 8 characters long.`                                                           |
| 400    | `Role must be jobseeker or recruiter.`                                                                   |
| 400    | `Company name is required for recruiter accounts.`                                                       |
| 409    | `An account with this email already exists.`                                                             |
| 503    | `Your account was created, but we could not send the confirmation email. Please try resending it later.` |


The confirmation link in the email is `GET /api/v1/auth/confirm-email?token=...` and expires in 24 hours. Only a SHA-256 hash of the token is stored.

### GET `/api/v1/auth/confirm-email`

Query: `token` (required, max 512 characters).

`200`

```json
{
  "success": true,
  "message": "Email confirmed successfully. You can now log in."
}
```


| Status | Message                                                                |
| ------ | ---------------------------------------------------------------------- |
| 400    | `A valid confirmation token is required.`                              |
| 400    | `This confirmation link is invalid or has expired. Request a new one.` |


The token is single-use.

### POST `/api/v1/auth/resend-confirmation`

```json
{ "email": "ada@example.com" }
```

`200` for an unknown email, a confirmed account, and a successful resend. The body does not say which case it was.

```json
{
  "success": true,
  "message": "If an unconfirmed account exists for that email, a confirmation message will be sent."
}
```


| Status | Message                                                             |
| ------ | ------------------------------------------------------------------- |
| 400    | `Email is required.`                                                |
| 503    | `We could not send the confirmation email. Please try again later.` |




### POST `/api/v1/auth/login`

```json
{
  "email": "ada@example.com",
  "password": "at-least-8"
}
```

`200`

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "_id": "66f0...",
    "name": "Ada Okafor",
    "email": "ada@example.com",
    "role": "jobseeker",
    "token": "<jwt>"
  }
}
```

`companyName` is included for recruiters. `verificationStatus` is included when the user has one (`pending`, `verified`, or `rejected`). Password and confirmation-token fields are never returned.


| Status | Message                                                |
| ------ | ------------------------------------------------------ |
| 400    | `Please provide email and password`                    |
| 401    | `Invalid emails or password`                           |
| 403    | `Please confirm your email address before logging in.` |




## Profile

The user document includes `_id`, `name`, `email`, `role`, `companyName` (recruiters), `isEmailConfirmed`, `verificationStatus`, `verifiedBy`, `verifiedAt`, `rejectedAt`, `rejectionReason`, `createdAt`, and `updatedAt`. Password is omitted.

### GET `/api/v1/users/me`

No body.

`200`

```json
{
  "success": true,
  "message": "User data fetched successfully",
  "data": {}
}
```



### PATCH `/api/v1/users/me`

```json
{
  "name": "New name",
  "companyName": "Only applied for recruiters"
}
```

Any other field is ignored. An empty object still returns 200 and leaves the profile unchanged.

`200`

```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {}
}
```



## Jobs

Public job objects omit `recruiter` and `__v`. A posting is visible only when `status` is `Open` and `closingDate` is not in the past. Closed or expired jobs answer as not found.

Job fields: `_id`, `title`, `companyName`, `field`, `description`, `requirements` (one or more strings), `location`, `salaryMin`, `salaryMax`, `salaryCurrency` (default `Naira`), `salaryPeriod` (`per month` or `per year`), `closingDate`, `status` (`Open` or `Closed`), `createdAt`, `updatedAt`. `salaryMax` must be greater than or equal to `salaryMin`.

### GET `/api/v1/jobs`

Query:


| Name     | Rule                                                                                                                              |
| -------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `page`   | Positive integer. Default `1`.                                                                                                    |
| `limit`  | Positive integer. Default `10`. Maximum `50`.                                                                                     |
| `field`  | Case-insensitive exact match.                                                                                                     |
| `search` | Case-insensitive substring, first 100 characters, matched against title, company, field, description, location, and requirements. |


`200`

```json
{
  "status": "success",
  "results": 1,
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  },
  "data": {
    "jobs": []
  }
}
```



### GET `/api/v1/jobs/:jobId`

`200`

```json
{
  "status": "success",
  "data": { "job": {} }
}
```


| Status | Message           |
| ------ | ----------------- |
| 400    | `Invalid job id.` |
| 404    | `Job not found.`  |




## Applications

Application fields: `_id`, `owner`, `job`, `recruiter`, `companyName`, `jobTitle`, `currentStage`, `deadline`, `createdAt`, `updatedAt`. `currentStage` is one of `Applied`, `Interview`, `Offer`, `Rejected`, `Withdrawn`.

### POST `/api/v1/jobs/:jobId/apply`

No body. The caller must be a job seeker. The handler copies `recruiter`, `companyName`, and `jobTitle` from the posting and sets `currentStage` to `Applied`. It also writes the first status-history row and a `new_application` notice for the recruiter.

`201`

```json
{
  "success": true,
  "message": "Application submitted successfully",
  "data": {}
}
```


| Status | Message                                               |
| ------ | ----------------------------------------------------- |
| 400    | `Invalid job id`                                      |
| 404    | `Job posting not found`                               |
| 400    | `This job posting is closed or past its closing date` |
| 400    | `You have already applied for this job`               |




### GET `/api/v1/applications`

Returns only the caller's applications. `job` is populated with `title`, `salaryMin`, `salaryMax`, `salaryCurrency`, `location`, and `status`.

Query:


| Name         | Rule                                                                                   |
| ------------ | -------------------------------------------------------------------------------------- |
| `stage`      | One of the five stages.                                                                |
| `company`    | Case-insensitive substring of `companyName`.                                           |
| `date`       | One calendar day, `YYYY-MM-DD` or a date-time.                                         |
| `from`, `to` | Range. A date-only `to` includes the rest of that UTC day. Ignored when `date` is set. |
| `sort`       | `newest` (default), `oldest`, or `company`.                                            |


`200`

```json
{
  "success": true,
  "count": 0,
  "data": []
}
```


| Status | Message                                                                |
| ------ | ---------------------------------------------------------------------- |
| 400    | `stage must be one of: Applied, Interview, Offer, Rejected, Withdrawn` |
| 400    | `<field> must be a valid date`                                         |
| 400    | `from must be earlier than or equal to to`                             |
| 400    | `sort must be one of: newest, oldest, company`                         |




### GET `/api/v1/applications/:applicationId`

The caller must own the application. The response adds:

- `recruiter`: `{ name, companyName }`
- `job`: the full job document
- `timeline`: status-history rows, oldest first, with `changedBy.name`
- `interviews`: rounds ascending, with `setBy.name` and `setBy.companyName`
- `reminders`: the caller's reminders for this application, by `nextSendTime`

`200`

```json
{
  "success": true,
  "message": "Application details fetched successfully.",
  "data": {
    "timeline": [],
    "interviews": [],
    "reminders": []
  }
}
```


| Status | Message                   |
| ------ | ------------------------- |
| 400    | `Invalid application ID.` |
| 404    | `Application not found.`  |




### PATCH `/api/v1/applications/:applicationId/withdraw`

No body. Allowed only from `Applied` or `Interview`. On success the stage becomes `Withdrawn`, a history row is written, and every active reminder for the application is turned off.

`200`

```json
{
  "success": true,
  "message": "Application withdrawn successfully",
  "data": {}
}
```


| Status | Message                                                                 |
| ------ | ----------------------------------------------------------------------- |
| 404    | `Application not found`                                                 |
| 409    | `Application is already <stage>; no further stage changes are allowed.` |
| 409    | `Cannot move an application from <from> to Withdrawn.`                  |
| 403    | `Only a jobseeker can move an application from <from> to Withdrawn.`    |




## Recruiter pipeline

The status route requires a recruiter whose `verificationStatus` is `verified`. The interview and deadline routes require the recruiter role and ownership of the application. A missing application is 404 for both, including when it belongs to another recruiter.

### PATCH `/api/v1/recruiter/applications/:applicationId/status`

```json
{
  "stage": "Interview",
  "interview": {
    "dateTime": "2026-11-03T15:00:00.000Z",
    "timeZone": "Africa/Lagos",
    "type": "video",
    "locationOrLink": "https://meet.example.com/room"
  }
}
```

`interview` is required only when `stage` is `Interview`. That call creates round 1 inside the same database transaction as the stage change and the history row. `dateTime` must be in the future. `type` is `phone`, `video`, or `in-person`. `locationOrLink` is required and at most 500 characters.

After commit, `Rejected` cancels active reminders. A new interview schedules interview reminders. `Interview`, `Offer`, and `Rejected` also create an in-app notice for the job seeker and attempt an email. A failure in that follow-up does not roll back the stage change.

`200`

```json
{
  "status": "success",
  "data": {
    "application": {},
    "history": {
      "application": "66f0...",
      "oldStage": "Applied",
      "newStage": "Interview",
      "changedBy": "66f0...",
      "changedAt": "2026-10-15T12:00:00.000Z"
    },
    "interview": null
  }
}
```

`interview` is the created round-1 document, or `null` when the new stage is not Interview.


| Status | Message                                                                 |
| ------ | ----------------------------------------------------------------------- |
| 400    | `Invalid application id.`                                               |
| 400    | `stage must be one of: Interview, Offer, Rejected.`                     |
| 400    | `Interview details are required when moving to Interview.`              |
| 400    | `interview.dateTime must be a valid date and time.`                     |
| 400    | `interview.dateTime must be in the future.`                             |
| 400    | `interview.timeZone must be a valid IANA time zone, e.g. Africa/Lagos.` |
| 400    | `interview.type must be one of: phone, video, in-person.`               |
| 400    | `interview.locationOrLink is required (max 500 characters).`            |
| 403    | `Only verified recruiters can change application stages.`               |
| 404    | `Application not found.`                                                |
| 409    | `Application was changed by another request. Please retry.`             |
| 409    | `Cannot move an application from <from> to <to>.`                       |
| 409    | `Application is already <stage>; no further stage changes are allowed.` |




### POST `/api/v1/recruiter/applications/:applicationId/interviews`

Schedules round 2 or later. Round 1 is created by the status route.

```json
{
  "roundNumber": 2,
  "dateTime": "2026-11-04T15:00:00Z",
  "timeZone": "Africa/Lagos",
  "type": "video",
  "locationOrLink": "https://meet.example.com/room"
}
```

`dateTime` must be an ISO date-time with a `Z` or numeric UTC offset. `timeZone` is optional and defaults to `Africa/Lagos`. It must be a valid IANA zone when supplied. A successful create also schedules interview reminders for the job seeker.

`201`

```json
{
  "success": true,
  "message": "Interview scheduled successfully.",
  "data": {
    "roundNumber": 2,
    "timeZone": "Africa/Lagos",
    "status": "Scheduled"
  }
}
```

Interview fields: `_id`, `application`, `roundNumber`, `dateTime`, `timeZone`, `type`, `locationOrLink`, `setBy`, `status` (`Scheduled`, `Rescheduled`, `Cancelled`), `createdAt`, `updatedAt`.


| Status | Message                                                   |
| ------ | --------------------------------------------------------- |
| 400    | `A JSON object request body is required.`                 |
| 400    | `roundNumber must be an integer of 2 or greater.`         |
| 400    | `dateTime must be an ISO date-time with a UTC offset.`    |
| 400    | `dateTime must be a valid date-time.`                     |
| 400    | `A valid IANA timeZone is required.`                      |
| 400    | `type must be phone, video, or in-person.`                |
| 400    | `locationOrLink is required.`                             |
| 400    | `Invalid application ID.`                                 |
| 404    | `Application not found.`                                  |
| 409    | `Interview round <n> already exists.`                     |
| 409    | `An interview already exists for that application round.` |




### PATCH `/api/v1/recruiter/applications/:applicationId/interviews/:interviewId`

Send one or more of `dateTime`, `timeZone`, `type`, `locationOrLink`, and `status`. Any other key is rejected. Changing `dateTime` without `status` sets `status` to `Rescheduled`.

```json
{
  "dateTime": "2026-11-05T15:00:00Z",
  "status": "Cancelled"
}
```

`200`

```json
{
  "success": true,
  "message": "Interview updated successfully.",
  "data": {}
}
```


| Status | Message                                                                                 |
| ------ | --------------------------------------------------------------------------------------- |
| 400    | `Provide valid interview updates: dateTime, timeZone, type, locationOrLink, or status.` |
| 400    | `status must be Scheduled, Rescheduled, or Cancelled.`                                  |
| 400    | `Invalid interview ID.`                                                                 |
| 404    | `Interview not found.`                                                                  |


The same date, time zone, type, and location validation as create applies to fields that are present.

### PATCH `/api/v1/recruiter/applications/:applicationId/deadline`

```json
{ "deadline": "2026-12-01" }
```

`deadline` must parse as a date. A date-only value is stored as midnight UTC. On success a single 24-hour-before reminder is scheduled when that moment is still in the future. Older deadline reminders for the application are deactivated first.

`200`

```json
{
  "success": true,
  "message": "Application deadline updated successfully.",
  "data": { "deadline": "2026-12-01T00:00:00.000Z" }
}
```


| Status | Message                                  |
| ------ | ---------------------------------------- |
| 400    | `Deadline field is required.`            |
| 400    | `deadline must be a valid date.`         |
| 404    | `Application not found or unauthorized.` |




## Attachments

Files are PDF, DOC, or DOCX. The MIME type and the extension must match. The default size limit is 5 MB (`MAX_ATTACHMENT_SIZE_MB`). One file is accepted, in the multipart field named `file`. Storage identifiers `publicId` and `assetId` are not returned.

Attachment fields in responses: `_id`, `owner`, `originalName`, `resourceType` (`raw`), `deliveryType` (`authenticated`), `format`, `mimeType`, `bytes`, `purpose`, `createdAt`, `updatedAt`.

`purpose` is `resume`, `cover_letter`, `portfolio`, `verification_document`, or `other` (default).

### POST `/api/v1/attachments`

`Content-Type: multipart/form-data`


| Field     | Rule                               |
| --------- | ---------------------------------- |
| `file`    | Required. One PDF, DOC, or DOCX.   |
| `purpose` | Optional. One of the values above. |


`201`

```json
{
  "success": true,
  "message": "Attachment uploaded successfully",
  "data": {}
}
```


| Status | Message                                                                                 |
| ------ | --------------------------------------------------------------------------------------- |
| 400    | `A file is required in the file form-data field`                                        |
| 400    | `purpose must be one of: resume, cover_letter, portfolio, verification_document, other` |
| 400    | `File exceeds the 5 MB limit`                                                           |
| 400    | `Use a single file in the file form-data field`                                         |
| 415    | `Unsupported file. Allowed formats: PDF, DOC, DOCX.`                                    |
| 503    | `Cloudinary is not configured. Set: <missing keys>`                                     |




### GET `/api/v1/attachments`

The list is always the current user's files, including for an admin.

Query: `page` (default 1), `limit` (default 20, max 100), `purpose` (optional).

`200`

```json
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 0,
    "pages": 0
  }
}
```

An unknown `purpose` returns 400 with the same purpose message as upload.

### GET `/api/v1/attachments/:id`

Owner or admin.

`200`

```json
{ "success": true, "data": {} }
```


| Status | Message                                     |
| ------ | ------------------------------------------- |
| 404    | `Attachment not found`                      |
| 403    | `You do not have access to this attachment` |




### GET `/api/v1/attachments/:id/link`

Query: `ttl` in seconds. Default is `SIGNED_LINK_TTL_SECONDS` (300). The applied value is clamped to 60–3600.

`200`

```json
{
  "success": true,
  "data": {
    "url": "https://...",
    "expiresAt": "2026-10-15T12:05:00.000Z",
    "ttlSeconds": 300
  }
}
```

The same 403 and 404 as metadata apply.

### DELETE `/api/v1/attachments/:id`

Cloudinary is deleted first. `ok` and `not found` both allow the database row to be removed.

`200`

```json
{
  "success": true,
  "message": "Attachment deleted successfully"
}
```



## Statistics

Shared query parameters: `from`, `to`, and `groupBy`. `groupBy` is `day` (default), `week`, or `month`. `from` and `to` are ISO-8601 timestamps or `YYYY-MM-DD`. A date-only `to` includes through `23:59:59.999Z`.


| Status | Message                                    |
| ------ | ------------------------------------------ |
| 400    | `groupBy must be one of: day, week, month` |
| 400    | `from must be a valid ISO-8601 date`       |
| 400    | `to must be a valid ISO-8601 date`         |
| 400    | `from must be earlier than or equal to to` |




### GET `/api/v1/statistics`

Job seeker only. Counts that caller's applications.

`200`

```json
{
  "success": true,
  "data": {
    "summary": {
      "totalApplications": 0,
      "activeApplications": 0,
      "interviews": 0,
      "offers": 0,
      "rejected": 0,
      "withdrawn": 0,
      "offerRate": 0
    },
    "byStage": [{ "stage": "Applied", "count": 0 }],
    "overTime": [{ "period": "2026-10-15T00:00:00.000Z", "count": 0 }]
  },
  "filters": {
    "groupBy": "day",
    "from": null,
    "to": null
  }
}
```

`activeApplications` counts `Applied` and `Interview`. `offerRate` is offers divided by total applications, as a percentage rounded to two decimals, or `0` when there are no applications.

### GET `/api/v1/statistics/attachments`

Any logged-in user receives their own files. Query `scope=all` requires an admin and counts every attachment. Any other `scope` value is rejected. Omitted `scope` means `mine`.

`200`

```json
{
  "success": true,
  "data": {
    "summary": {
      "totalFiles": 0,
      "totalBytes": 0,
      "averageBytes": 0
    },
    "byPurpose": [{ "purpose": "resume", "count": 0, "bytes": 0 }],
    "byMimeType": [{ "mimeType": "application/pdf", "count": 0, "bytes": 0 }],
    "overTime": [{ "period": "2026-10-15T00:00:00.000Z", "count": 0, "bytes": 0 }]
  },
  "filters": {
    "scope": "mine",
    "groupBy": "day",
    "from": null,
    "to": null
  }
}
```


| Status | Message                                             |
| ------ | --------------------------------------------------- |
| 400    | `scope must be one of: mine, all`                   |
| 403    | `Access denied. Administrator privileges required.` |




## Notifications

A notice belongs to `recipient`. Types are `new_application`, `interview_set`, `interview_changed`, `stage_changed`, `deadline_set`, and `reminder`. Fields: `_id`, `recipient`, `application` (populated on the list with `jobTitle`, `companyName`, `currentStage`), `type`, `message`, `isRead`, `createdAt`.

### GET `/api/v1/notifications`

No query parameters. Newest first. Only the caller's notices.

`200`

```json
{
  "success": true,
  "count": 0,
  "data": []
}
```



### PATCH `/api/v1/notifications/:notificationId/read`

No body. Sets `isRead` to `true`.

`200`

```json
{
  "success": true,
  "message": "Notification marked as read",
  "data": {}
}
```

`404`

```json
{
  "success": false,
  "message": "Notification not found or access denied"
}
```

