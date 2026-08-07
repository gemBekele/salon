import type { Pool } from 'mysql2/promise';
import crypto from 'node:crypto';

export type SmsMessageType = 'appointment_reminder' | 'queue_turn_alert' | 'session_receipt' | 'marketing_promo';

/**
 * SMS delivery abstraction. Two providers are supported:
 *  - "log": simulation mode, records the message as "sent" (used for local demo).
 *  - "http": real gateway POST to SMS_PROVIDER_URL with { to, text, from, apiKey }.
 *
 * Every message is persisted to sms_logs with a queued -> sent/failed lifecycle,
 * and delivery is retried once before being marked failed.
 */
export function createSmsService(pool: Pool) {
  const provider = (process.env.SMS_PROVIDER || 'log').toLowerCase();
  const providerUrl = process.env.SMS_PROVIDER_URL || '';
  const apiKey = process.env.SMS_API_KEY || '';
  const senderId = process.env.SMS_SENDER_ID || 'Serenity';

  async function sendViaProvider(recipientPhone: string, content: string): Promise<boolean> {
    if (provider === 'http' && providerUrl) {
      try {
        const res = await fetch(providerUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: apiKey ? `Bearer ${apiKey}` : '',
          },
          body: JSON.stringify({
            to: recipientPhone,
            text: content,
            from: senderId,
          }),
        });
        return res.ok;
      } catch (e) {
        console.error('[sms] provider error:', e);
        return false;
      }
    }
    console.log(`[sms:simulated] -> ${recipientPhone}: ${content}`);
    return true;
  }

  async function dispatch(params: {
    companyId: string;
    recipientPhone: string;
    messageType: SmsMessageType;
    content: string;
  }): Promise<void> {
    if (!params.recipientPhone) return;
    const id = `sms_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`;

    await pool.query(
      `INSERT INTO sms_logs (id, company_id, recipient_phone, message_type, content, status) VALUES (?, ?, ?, ?, ?, 'queued')`,
      [id, params.companyId, params.recipientPhone, params.messageType, params.content]
    );

    let delivered = await sendViaProvider(params.recipientPhone, params.content);
    if (!delivered) delivered = await sendViaProvider(params.recipientPhone, params.content);

    await pool.query(`UPDATE sms_logs SET status = ?, sent_at = NOW() WHERE id = ?`, [
      delivered ? 'sent' : 'failed',
      id,
    ]);
  }

  return { dispatch };
}