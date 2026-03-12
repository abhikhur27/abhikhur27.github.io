# Client Request Email Automation (Spark-Safe)

This module sends polished client update emails whenever a client request is updated, while keeping Firebase on Spark-friendly architecture:

- No Cloud Functions required.
- No paid Firebase extension required.
- Works by queueing updates in Firestore and sending from a scheduled GitHub Action worker.

## Flow

1. Your admin/client-request UI updates `clientRequests/{requestId}`.
2. In the same write batch, it creates `clientRequestUpdates/{updateId}` with `emailStatus: "queued"`.
3. GitHub Action runs every 5 minutes and sends queued updates through SMTP.
4. Queue records are marked as `sent` (or retried / failed with error details).

## Firestore collections

- `clientRequests`
- `clientRequestUpdates`

Required queue fields:

- `requestId`
- `clientEmail`
- `clientName`
- `projectName`
- `requestTitle`
- `previousStatus`
- `nextStatus`
- `updateMessage`
- `changedBy`
- `emailStatus` (`queued`, `sending`, `sent`, `failed`)
- `attempts`
- `createdAt`
- `updatedAt`

## Browser helper

Use the helper in your admin UI to make request updates and queue email in one commit:

```javascript
import { updateClientRequestAndQueueEmail } from './automation/client-request-email/web/update-client-request.js';

await updateClientRequestAndQueueEmail({
  db,
  requestId: 'req_1024',
  patch: { status: 'in_review', progressPercent: 70 },
  actorName: 'Abhimanyu',
  updateMessage: 'Integrated feedback and pushed a new build for QA.',
  notifyClient: true,
});
```

## Worker setup

```bash
cd automation/client-request-email
npm install
npm run check
```

Run manually:

```bash
node send-client-update-emails.mjs
```

Dry run:

```bash
DRY_RUN=true node send-client-update-emails.mjs
```

## Required environment variables

- `FIREBASE_SERVICE_ACCOUNT_B64` (recommended) or `FIREBASE_SERVICE_ACCOUNT` (raw JSON)
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `EMAIL_FROM`

Optional:

- `EMAIL_REPLY_TO`
- `EMAIL_QUEUE_COLLECTION` (default `clientRequestUpdates`)
- `CLIENT_REQUEST_COLLECTION` (default `clientRequests`)
- `EMAIL_BATCH_SIZE` (default `30`)
- `MAX_EMAIL_ATTEMPTS` (default `4`)
- `DRY_RUN` (`true` or `false`)

## GitHub Action secrets

Add these repository secrets in GitHub:

- `FIREBASE_SERVICE_ACCOUNT_B64`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `EMAIL_FROM`
- `EMAIL_REPLY_TO` (optional)

Then enable `.github/workflows/client-request-email-dispatch.yml`.

## Notes

- `send-client-update-emails.mjs` claims queued rows with a transaction to prevent duplicate sends.
- Failed sends are retried until `MAX_EMAIL_ATTEMPTS` is reached.
- This architecture keeps GitHub Pages static and Firebase cost-safe.
