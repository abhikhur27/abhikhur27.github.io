import admin from 'firebase-admin';
import nodemailer from 'nodemailer';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { buildClientUpdateEmail } from './lib/email-template.mjs';

const QUEUE_COLLECTION = process.env.EMAIL_QUEUE_COLLECTION || 'clientRequestUpdates';
const REQUEST_COLLECTION = process.env.CLIENT_REQUEST_COLLECTION || 'clientRequests';
const MAX_BATCH = Number(process.env.EMAIL_BATCH_SIZE || 30);
const MAX_ATTEMPTS = Number(process.env.MAX_EMAIL_ATTEMPTS || 4);
const DRY_RUN = String(process.env.DRY_RUN || '').toLowerCase() === 'true';

function getServiceAccount() {
  const fromJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  const fromB64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64;

  if (fromJson) {
    return JSON.parse(fromJson);
  }

  if (fromB64) {
    const raw = Buffer.from(fromB64, 'base64').toString('utf8');
    return JSON.parse(raw);
  }

  throw new Error('Missing FIREBASE_SERVICE_ACCOUNT or FIREBASE_SERVICE_ACCOUNT_B64.');
}

function requireSmtpConfig() {
  const required = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'EMAIL_FROM'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing SMTP settings: ${missing.join(', ')}`);
  }
}

function toIsoDate(value) {
  if (!value) return new Date().toISOString();
  if (typeof value.toDate === 'function') return value.toDate().toISOString();
  if (typeof value === 'string') return value;
  return new Date().toISOString();
}

function normalizePayload(id, data) {
  return {
    id,
    requestId: data.requestId || id,
    requestTitle: data.requestTitle || data.title || 'Client Request',
    projectName: data.projectName || 'Project',
    clientName: data.clientName || 'there',
    clientEmail: data.clientEmail || '',
    previousStatus: data.previousStatus || null,
    nextStatus: data.nextStatus || data.status || 'updated',
    updateMessage: data.updateMessage || data.summary || 'We have pushed a fresh update to your request.',
    changedBy: data.changedBy || data.updatedBy || 'Project team',
    dashboardUrl: data.dashboardUrl || '',
    updatedAt: toIsoDate(data.updatedAt || data.createdAt),
    attempts: Number(data.attempts) || 0,
  };
}

function getTransporter() {
  const port = Number(process.env.SMTP_PORT || 587);
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

async function claimQueuedUpdate(db, docRef) {
  let claimed = null;

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(docRef);
    if (!snapshot.exists) return;

    const data = snapshot.data();
    const attempts = Number(data.attempts) || 0;
    if (data.emailStatus !== 'queued' || attempts >= MAX_ATTEMPTS) {
      return;
    }

    claimed = normalizePayload(snapshot.id, data);
    claimed.attempts = attempts + 1;

    transaction.update(docRef, {
      emailStatus: 'sending',
      attempts: attempts + 1,
      claimedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      lastError: FieldValue.delete(),
    });
  });

  return claimed;
}

async function markResult(db, queueDocRef, requestId, result) {
  const queueUpdate = {
    emailStatus: result.status,
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (result.status === 'sent') {
    queueUpdate.sentAt = FieldValue.serverTimestamp();
    queueUpdate.providerMessageId = result.messageId || null;
  } else {
    queueUpdate.lastError = result.error || 'Unknown error';
  }

  await queueDocRef.update(queueUpdate);

  if (!requestId) return;
  const requestRef = db.collection(REQUEST_COLLECTION).doc(requestId);
  await requestRef.set(
    {
      lastEmailStatus: result.status,
      lastEmailSentAt: result.status === 'sent' ? FieldValue.serverTimestamp() : null,
      lastEmailError: result.status === 'failed' ? result.error || 'Unknown error' : null,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

async function run() {
  requireSmtpConfig();
  const serviceAccount = getServiceAccount();

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }

  const db = getFirestore();
  const transporter = getTransporter();
  await transporter.verify();

  const queueSnapshot = await db
    .collection(QUEUE_COLLECTION)
    .where('emailStatus', '==', 'queued')
    .limit(MAX_BATCH)
    .get();

  if (queueSnapshot.empty) {
    console.log('No queued client request updates found.');
    return;
  }

  const docs = queueSnapshot.docs.sort((left, right) => {
    const leftTs = left.get('createdAt')?.toMillis?.() || 0;
    const rightTs = right.get('createdAt')?.toMillis?.() || 0;
    return leftTs - rightTs;
  });

  let sentCount = 0;
  let failedCount = 0;

  for (const doc of docs) {
    const queueDocRef = db.collection(QUEUE_COLLECTION).doc(doc.id);
    const payload = await claimQueuedUpdate(db, queueDocRef);

    if (!payload) {
      continue;
    }

    if (!payload.clientEmail) {
      await markResult(db, queueDocRef, payload.requestId, {
        status: 'failed',
        error: 'Missing clientEmail on queue item.',
      });
      failedCount += 1;
      continue;
    }

    try {
      const email = buildClientUpdateEmail(payload);

      if (!DRY_RUN) {
        const info = await transporter.sendMail({
          from: process.env.EMAIL_FROM,
          to: payload.clientEmail,
          replyTo: process.env.EMAIL_REPLY_TO || process.env.EMAIL_FROM,
          subject: email.subject,
          text: email.text,
          html: email.html,
        });

        await markResult(db, queueDocRef, payload.requestId, {
          status: 'sent',
          messageId: info.messageId,
        });
      } else {
        await markResult(db, queueDocRef, payload.requestId, {
          status: 'sent',
          messageId: 'dry-run',
        });
      }

      sentCount += 1;
    } catch (error) {
      const willRetry = payload.attempts < MAX_ATTEMPTS;
      await markResult(db, queueDocRef, payload.requestId, {
        status: willRetry ? 'queued' : 'failed',
        error: String(error?.message || error),
      });

      failedCount += 1;
      console.error(`Failed queue item ${doc.id}:`, error?.message || error);
    }
  }

  console.log(`Processed ${docs.length} items. Sent: ${sentCount}, failed: ${failedCount}.`);
}

run().catch((error) => {
  console.error('Client request email worker failed:', error?.message || error);
  process.exitCode = 1;
});
