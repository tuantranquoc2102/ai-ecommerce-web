/**
 * Simple, framework-free email templates. Kept as string builders (not
 * React Email) to avoid an extra build step and heavy dependency for what
 * are ultimately small HTML blocks. Each helper returns { html, text } so
 * clients that block HTML still get a readable message.
 *
 * Design notes:
 * - Table-based layout for Gmail/Outlook compatibility.
 * - Inline styles only. No <style> blocks, no external CSS, no images.
 * - Neutral palette that reads well in both light and dark clients.
 * - No hidden trackers, tracking pixels, or click redirects — GDPR/PDPD-safe.
 */

interface OtpInput {
  brand: string;
  code: string;
  ttlMinutes: number;
}

export function otpEmail(input: OtpInput): { html: string; text: string } {
  const text = [
    `${input.brand} verification code`,
    '',
    `Your one-time code: ${input.code}`,
    `This code expires in ${input.ttlMinutes} minute${input.ttlMinutes === 1 ? '' : 's'}.`,
    '',
    `If you did not request this code, ignore this email — no changes were made to your account.`,
  ].join('\n');

  const html = layout({
    brand: input.brand,
    body: `
      <p style="margin:0 0 16px;font-size:14px;color:#0f172a;">Use this one-time code to finish signing in:</p>
      <div style="margin:24px 0;padding:20px 24px;background:#f1f5f9;border-radius:8px;text-align:center;">
        <div style="font-family:'Courier New',monospace;font-size:32px;letter-spacing:8px;font-weight:700;color:#0f172a;">${escape(input.code)}</div>
      </div>
      <p style="margin:0 0 8px;font-size:13px;color:#475569;">This code expires in <strong>${input.ttlMinutes} minute${input.ttlMinutes === 1 ? '' : 's'}</strong>.</p>
      <p style="margin:0;font-size:13px;color:#475569;">Didn't try to sign in? You can ignore this email — nothing has changed on your account.</p>
    `,
  });

  return { html, text };
}

interface PasswordResetInput {
  brand: string;
  resetUrl: string;
  ttlMinutes: number;
}

export function passwordResetEmail(input: PasswordResetInput): { html: string; text: string } {
  const text = [
    `${input.brand} password reset`,
    '',
    `Someone requested a password reset for your account. To choose a new password, open this link:`,
    input.resetUrl,
    '',
    `The link expires in ${input.ttlMinutes} minute${input.ttlMinutes === 1 ? '' : 's'}.`,
    `If you did not request this, you can safely ignore the message — your password stays the same.`,
  ].join('\n');

  const html = layout({
    brand: input.brand,
    body: `
      <p style="margin:0 0 16px;font-size:14px;color:#0f172a;">We received a request to reset the password for your ${escape(input.brand)} account.</p>
      <p style="margin:24px 0;text-align:center;">
        <a href="${escapeAttr(input.resetUrl)}" style="display:inline-block;padding:12px 24px;background:#0f172a;color:#ffffff;font-weight:600;font-size:14px;text-decoration:none;border-radius:6px;">Reset password</a>
      </p>
      <p style="margin:0 0 8px;font-size:13px;color:#475569;">Or paste this link into your browser:</p>
      <p style="margin:0 0 16px;font-size:12px;word-break:break-all;color:#334155;">${escape(input.resetUrl)}</p>
      <p style="margin:0 0 8px;font-size:13px;color:#475569;">The link expires in <strong>${input.ttlMinutes} minute${input.ttlMinutes === 1 ? '' : 's'}</strong>.</p>
      <p style="margin:0;font-size:13px;color:#475569;">Didn't request this? You can ignore this email — your password stays the same.</p>
    `,
  });

  return { html, text };
}

interface WelcomeInput {
  brand: string;
  firstName: string | null;
}

interface OrderConfirmationInput {
  brand: string;
  firstName: string | null;
  orderNumber: string;
  paidAt: Date;
  items: Array<{
    title: string;
    quantity: number;
    unitPriceFormatted: string;
    lineTotalFormatted: string;
    imageUrl?: string | null;
  }>;
  subtotalFormatted: string;
  discountFormatted: string | null;
  shippingFormatted: string;
  totalFormatted: string;
  shipping: {
    recipientName: string;
    recipientPhone: string;
    addressLine: string;
    ward: string | null;
    district: string | null;
    province: string | null;
  } | null;
  paymentMethod: string;
  viewOrderUrl: string;
}

export function orderConfirmationEmail(input: OrderConfirmationInput): { html: string; text: string } {
  const greeting = input.firstName ? `Hi ${input.firstName},` : 'Hi,';
  const paidAt = input.paidAt.toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });

  // ----- plain text (fallback) --------------------------------------------
  const textLines: string[] = [
    `${input.brand} — order confirmed`,
    '',
    greeting,
    '',
    `Thanks for your order! Here's a copy for your records.`,
    '',
    `Order:   ${input.orderNumber}`,
    `Placed:  ${paidAt}`,
    `Payment: ${input.paymentMethod}`,
    '',
    'Items:',
  ];
  for (const item of input.items) {
    textLines.push(`  ${item.quantity}× ${item.title}  —  ${item.lineTotalFormatted}`);
  }
  textLines.push('', `Subtotal: ${input.subtotalFormatted}`);
  if (input.discountFormatted) textLines.push(`Discount: −${input.discountFormatted}`);
  textLines.push(`Shipping: ${input.shippingFormatted}`);
  textLines.push(`Total:    ${input.totalFormatted}`);
  if (input.shipping) {
    textLines.push('', 'Shipping to:');
    textLines.push(`  ${input.shipping.recipientName}`);
    textLines.push(`  ${input.shipping.recipientPhone}`);
    textLines.push(`  ${input.shipping.addressLine}`);
    const region = [input.shipping.ward, input.shipping.district, input.shipping.province]
      .filter(Boolean)
      .join(', ');
    if (region) textLines.push(`  ${region}`);
  }
  textLines.push('', `View your order: ${input.viewOrderUrl}`);
  const text = textLines.join('\n');

  // ----- HTML ---------------------------------------------------------------
  const itemsHtml = input.items
    .map(
      (item) => `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #e2e8f0;vertical-align:top;">
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr>
              ${
                item.imageUrl
                  ? `<td style="padding-right:12px;vertical-align:top;">
                       <img src="${escapeAttr(item.imageUrl)}" alt="" width="52" height="52" style="display:block;width:52px;height:52px;object-fit:cover;border-radius:6px;background:#f1f5f9;" />
                     </td>`
                  : ''
              }
              <td style="vertical-align:top;">
                <div style="font-size:14px;color:#0f172a;font-weight:500;line-height:1.35;">${escape(item.title)}</div>
                <div style="font-size:12px;color:#64748b;margin-top:2px;">${item.quantity} × ${escape(item.unitPriceFormatted)}</div>
              </td>
            </tr>
          </table>
        </td>
        <td style="padding:12px 0;border-bottom:1px solid #e2e8f0;text-align:right;font-size:14px;font-weight:600;color:#0f172a;white-space:nowrap;vertical-align:top;">
          ${escape(item.lineTotalFormatted)}
        </td>
      </tr>`,
    )
    .join('');

  const shippingHtml = input.shipping
    ? `
      <div style="margin-top:24px;padding:16px;background:#f8fafc;border-radius:8px;">
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;margin-bottom:6px;">Shipping to</div>
        <div style="font-size:14px;color:#0f172a;font-weight:500;">${escape(input.shipping.recipientName)}</div>
        <div style="font-size:13px;color:#475569;">${escape(input.shipping.recipientPhone)}</div>
        <div style="font-size:13px;color:#475569;margin-top:4px;">${escape(input.shipping.addressLine)}</div>
        ${(() => {
          const region = [input.shipping!.ward, input.shipping!.district, input.shipping!.province]
            .filter((s): s is string => !!s)
            .join(', ');
          return region ? `<div style="font-size:13px;color:#475569;">${escape(region)}</div>` : '';
        })()}
      </div>`
    : '';

  const body = `
    <p style="margin:0 0 8px;font-size:14px;color:#0f172a;">${escape(greeting)}</p>
    <p style="margin:0 0 24px;font-size:14px;color:#0f172a;">Thanks for your order — payment received and we're getting it ready.</p>

    <div style="margin:0 0 8px;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;">Order</div>
    <div style="margin:0 0 24px;font-family:'Courier New',monospace;font-size:18px;font-weight:700;color:#0f172a;">${escape(input.orderNumber)}</div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      ${itemsHtml}
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
      <tr>
        <td style="padding:4px 0;font-size:13px;color:#64748b;">Subtotal</td>
        <td style="padding:4px 0;font-size:13px;color:#0f172a;text-align:right;">${escape(input.subtotalFormatted)}</td>
      </tr>
      ${
        input.discountFormatted
          ? `<tr>
               <td style="padding:4px 0;font-size:13px;color:#64748b;">Discount</td>
               <td style="padding:4px 0;font-size:13px;color:#059669;text-align:right;">−${escape(input.discountFormatted)}</td>
             </tr>`
          : ''
      }
      <tr>
        <td style="padding:4px 0;font-size:13px;color:#64748b;">Shipping</td>
        <td style="padding:4px 0;font-size:13px;color:#0f172a;text-align:right;">${escape(input.shippingFormatted)}</td>
      </tr>
      <tr>
        <td style="padding:12px 0 4px;font-size:14px;font-weight:700;color:#0f172a;border-top:1px solid #e2e8f0;">Total</td>
        <td style="padding:12px 0 4px;font-size:16px;font-weight:700;color:#0f172a;text-align:right;border-top:1px solid #e2e8f0;">${escape(input.totalFormatted)}</td>
      </tr>
    </table>

    ${shippingHtml}

    <div style="margin-top:16px;padding:12px 16px;background:#eff6ff;border-radius:6px;font-size:12px;color:#1e40af;">
      Payment method: <strong>${escape(input.paymentMethod)}</strong>
    </div>

    <p style="margin:32px 0 0;text-align:center;">
      <a href="${escapeAttr(input.viewOrderUrl)}" style="display:inline-block;padding:12px 24px;background:#0f172a;color:#ffffff;font-weight:600;font-size:14px;text-decoration:none;border-radius:6px;">View your order</a>
    </p>
    <p style="margin:12px 0 0;font-size:11px;color:#94a3b8;text-align:center;word-break:break-all;">${escape(input.viewOrderUrl)}</p>
  `;

  const html = layout({ brand: input.brand, body });
  return { html, text };
}

export function welcomeEmail(input: WelcomeInput): { html: string; text: string } {
  const greeting = input.firstName ? `Hi ${input.firstName},` : 'Hi,';
  const text = [
    `Welcome to ${input.brand}`,
    '',
    greeting,
    '',
    `Your account is ready. Start browsing our catalog and enjoy shopping with us.`,
    '',
    `— The ${input.brand} team`,
  ].join('\n');

  const html = layout({
    brand: input.brand,
    body: `
      <p style="margin:0 0 16px;font-size:14px;color:#0f172a;">${escape(greeting)}</p>
      <p style="margin:0 0 16px;font-size:14px;color:#0f172a;">Your ${escape(input.brand)} account is ready. Welcome aboard — we're glad to have you.</p>
      <p style="margin:0;font-size:13px;color:#475569;">— The ${escape(input.brand)} team</p>
    `,
  });

  return { html, text };
}

interface LayoutInput {
  brand: string;
  body: string;
}

function layout({ brand, body }: LayoutInput): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${escape(brand)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:12px;padding:32px;box-shadow:0 1px 2px rgba(15,23,42,0.06);">
            <tr>
              <td>
                <div style="margin:0 0 24px;font-weight:700;font-size:16px;color:#0f172a;">${escape(brand)}</div>
                ${body}
              </td>
            </tr>
          </table>
          <div style="margin-top:16px;font-size:11px;color:#94a3b8;">
            You received this because your email address was used with ${escape(brand)}. If you did not sign up, please ignore this message.
          </div>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function escape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(value: string): string {
  // URLs need `&` → `&amp;` inside href, plus quote escaping.
  return escape(value);
}
