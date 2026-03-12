import {
  collection,
  doc,
  getDoc,
  serverTimestamp,
  writeBatch,
} from 'https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js';

const REQUEST_COLLECTION = 'clientRequests';
const QUEUE_COLLECTION = 'clientRequestUpdates';

function ensureString(value, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback;
}

export async function updateClientRequestAndQueueEmail({
  db,
  requestId,
  patch,
  actorName = 'Project team',
  updateMessage = '',
  notifyClient = true,
}) {
  if (!db) throw new Error('Firestore instance is required.');
  if (!requestId) throw new Error('requestId is required.');
  if (!patch || typeof patch !== 'object') throw new Error('patch object is required.');

  const requestRef = doc(db, REQUEST_COLLECTION, requestId);
  const currentSnapshot = await getDoc(requestRef);

  if (!currentSnapshot.exists()) {
    throw new Error(`Request "${requestId}" does not exist.`);
  }

  const currentData = currentSnapshot.data();
  const mergedData = { ...currentData, ...patch };
  const previousStatus = ensureString(currentData.status, 'created');
  const nextStatus = ensureString(mergedData.status, previousStatus || 'updated');
  const message = ensureString(updateMessage, mergedData.lastUpdateSummary || '');

  const batch = writeBatch(db);
  batch.set(
    requestRef,
    {
      ...patch,
      updatedBy: ensureString(actorName, 'Project team'),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  let queuedEmailId = null;

  if (notifyClient) {
    const queueRef = doc(collection(db, QUEUE_COLLECTION));
    queuedEmailId = queueRef.id;

    batch.set(queueRef, {
      requestId,
      requestTitle: ensureString(mergedData.title, mergedData.requestTitle || `Request ${requestId}`),
      projectName: ensureString(mergedData.projectName, mergedData.project || 'Client Project'),
      clientName: ensureString(mergedData.clientName, 'there'),
      clientEmail: ensureString(mergedData.clientEmail),
      previousStatus,
      nextStatus,
      updateMessage: message || 'Progress update available in your client dashboard.',
      changedBy: ensureString(actorName, 'Project team'),
      changedFields: Object.keys(patch),
      dashboardUrl: ensureString(mergedData.clientPortalUrl, mergedData.portalUrl || ''),
      emailStatus: 'queued',
      attempts: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  await batch.commit();

  return {
    requestId,
    queuedEmailId,
    notified: notifyClient,
    previousStatus,
    nextStatus,
  };
}
