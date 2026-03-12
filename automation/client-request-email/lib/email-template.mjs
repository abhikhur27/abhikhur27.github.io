function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function toStatusLabel(status) {
  if (!status) return 'Updated';
  return String(status)
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatUtc(isoDate) {
  if (!isoDate) return 'Unknown time';
  const date = new Date(isoDate);
  if (!Number.isFinite(date.getTime())) return 'Unknown time';
  return date.toLocaleString('en-US', {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).replace(',', '') + ' UTC';
}

export function buildClientUpdateEmail(payload) {
  const safe = {
    clientName: escapeHtml(payload.clientName || 'there'),
    projectName: escapeHtml(payload.projectName || 'Your Project'),
    requestTitle: escapeHtml(payload.requestTitle || payload.projectName || 'Client Request'),
    previousStatus: escapeHtml(toStatusLabel(payload.previousStatus)),
    nextStatus: escapeHtml(toStatusLabel(payload.nextStatus || 'updated')),
    updateMessage: escapeHtml(payload.updateMessage || 'We have pushed a fresh update to your request.'),
    changedBy: escapeHtml(payload.changedBy || 'Project team'),
    requestId: escapeHtml(payload.requestId || 'n/a'),
    dashboardUrl: payload.dashboardUrl || '',
    updatedAt: formatUtc(payload.updatedAt),
  };

  const subject = `${safe.projectName}: request is now ${safe.nextStatus}`;
  const dashboardCta = safe.dashboardUrl
    ? `<a href="${escapeHtml(safe.dashboardUrl)}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#152f6b;color:#f7fbff;text-decoration:none;font-weight:600;">Open Request Dashboard</a>`
    : '';

  const html = `
  <!doctype html>
  <html lang="en">
    <body style="margin:0;padding:24px;background:#05090f;color:#eef3ff;font-family:Inter,Segoe UI,Arial,sans-serif;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:720px;margin:0 auto;border:1px solid #1f2b3f;border-radius:14px;background:#0b1220;overflow:hidden;">
        <tr>
          <td style="padding:20px 22px;background:linear-gradient(120deg,#0f1a2f,#1a2a45);border-bottom:1px solid #243650;">
            <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.14em;color:#9fb3d9;text-transform:uppercase;">Client Update</p>
            <h1 style="margin:0;font-size:24px;line-height:1.2;font-family:Georgia,Times New Roman,serif;color:#ffffff;">${safe.projectName}</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:22px;">
            <p style="margin:0 0 14px;font-size:16px;color:#d8e3fb;">Hi ${safe.clientName},</p>
            <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#c8d6f3;">
              Your request <strong style="color:#ffffff;">${safe.requestTitle}</strong> has moved to
              <strong style="color:#9ec0ff;">${safe.nextStatus}</strong>.
            </p>

            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 18px;border-collapse:collapse;">
              <tr>
                <td style="padding:12px;border:1px solid #253958;border-radius:10px;background:#0f1727;">
                  <p style="margin:0 0 8px;font-size:12px;color:#8ea5d0;text-transform:uppercase;letter-spacing:0.08em;">Update Summary</p>
                  <p style="margin:0;font-size:15px;line-height:1.55;color:#edf3ff;">${safe.updateMessage}</p>
                </td>
              </tr>
            </table>

            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 18px;border-collapse:separate;border-spacing:10px 0;">
              <tr>
                <td style="padding:10px;border:1px solid #22314a;border-radius:10px;background:#0b1423;">
                  <p style="margin:0 0 4px;font-size:11px;color:#8aa0c8;letter-spacing:0.08em;text-transform:uppercase;">Previous</p>
                  <p style="margin:0;font-size:14px;color:#e5edff;">${safe.previousStatus}</p>
                </td>
                <td style="padding:10px;border:1px solid #22314a;border-radius:10px;background:#0b1423;">
                  <p style="margin:0 0 4px;font-size:11px;color:#8aa0c8;letter-spacing:0.08em;text-transform:uppercase;">Current</p>
                  <p style="margin:0;font-size:14px;color:#e5edff;">${safe.nextStatus}</p>
                </td>
                <td style="padding:10px;border:1px solid #22314a;border-radius:10px;background:#0b1423;">
                  <p style="margin:0 0 4px;font-size:11px;color:#8aa0c8;letter-spacing:0.08em;text-transform:uppercase;">Updated By</p>
                  <p style="margin:0;font-size:14px;color:#e5edff;">${safe.changedBy}</p>
                </td>
              </tr>
            </table>

            ${dashboardCta}

            <p style="margin:20px 0 0;font-size:12px;line-height:1.5;color:#8ca2cb;">
              Request ID: ${safe.requestId}<br>
              Timestamp: ${safe.updatedAt}
            </p>
          </td>
        </tr>
      </table>
    </body>
  </html>`;

  const text = [
    `${payload.projectName || 'Project'} update`,
    '',
    `Hi ${payload.clientName || 'there'},`,
    `Your request "${payload.requestTitle || payload.projectName || 'Client Request'}" is now "${toStatusLabel(payload.nextStatus || 'updated')}".`,
    '',
    `Summary: ${payload.updateMessage || 'We have pushed a fresh update to your request.'}`,
    `Previous status: ${toStatusLabel(payload.previousStatus)}`,
    `Current status: ${toStatusLabel(payload.nextStatus || 'updated')}`,
    `Updated by: ${payload.changedBy || 'Project team'}`,
    `Request ID: ${payload.requestId || 'n/a'}`,
    `Timestamp: ${formatUtc(payload.updatedAt)}`,
    payload.dashboardUrl ? `Dashboard: ${payload.dashboardUrl}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  return { subject, html, text };
}
