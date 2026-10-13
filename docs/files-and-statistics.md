# Files and statistics API

All endpoints require `Authorization: Bearer <token>`. Attachments are private
Cloudinary `raw` assets; Cloudinary storage identifiers are never returned by
the ordinary attachment endpoints.

## Configuration

Copy `.env.example` to `.env` and configure:

- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- `CLOUDINARY_UPLOAD_FOLDER` (default `job-tracker/attachments`)
- `MAX_ATTACHMENT_SIZE_MB` (default `10`)
- `SIGNED_LINK_TTL_SECONDS` (default `300`, request values are constrained to
  60–3600 seconds)

## Attachment endpoints

### Upload

`POST /api/v1/attachments`

Send `multipart/form-data` with:

- `file`: one PDF, DOC, DOCX, TXT, CSV, XLS, XLSX, JPG, JPEG, or PNG file
- `purpose`: optional; `resume`, `cover_letter`, `portfolio`,
  `verification_document`, or `other`

The upload is held briefly in memory, bounded by `MAX_ATTACHMENT_SIZE_MB`, and
then streamed to an authenticated Cloudinary raw asset.

### List and metadata

- `GET /api/v1/attachments?page=1&limit=20&purpose=resume`
- `GET /api/v1/attachments/:id`

Users only see their own attachments. An administrator can access attachment
metadata or links by known ID, but the list endpoint remains scoped to the
current user.

### Short-lived download link

`GET /api/v1/attachments/:id/link?ttl=300`

Returns a signed Cloudinary download URL and ISO expiration time. The optional
TTL is in seconds and is constrained to 60–3600.

### Delete

`DELETE /api/v1/attachments/:id`

Cloudinary deletion must succeed (or report already absent) before the database
record is removed.

## Statistics

`GET /api/v1/statistics/attachments`

Optional query parameters:

- `from`, `to`: ISO-8601 timestamps or `YYYY-MM-DD`
- `groupBy`: `day`, `week`, or `month` (default `day`)
- `scope=all`: global statistics; administrators only

The response contains totals for file count, bytes and average size, plus
breakdowns by purpose, MIME type, and time period. Without `scope=all`, results
are restricted to the authenticated user.

## Quality assurance

Run unit checks with `npm test`. Import the collection and environment in
`postman/`, set credentials and choose a local test file, then run the folder in
order. Upload captures `attachmentId`; delete clears it.
