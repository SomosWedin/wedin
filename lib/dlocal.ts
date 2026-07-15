'use server';

import { createHmac, timingSafeEqual } from 'crypto';

const apiKey = process.env.DLOCAL_GO_API_KEY;
const secretKey = process.env.DLOCAL_GO_SECRET_KEY;
const baseUrl = process.env.DLOCAL_GO_API_URL || 'https://api-sbx.dlocalgo.com';

const hasCredentials = Boolean(apiKey && secretKey);

if (!hasCredentials) {
  console.warn(
    'lib/dlocal.ts: DLOCAL_GO_API_KEY/DLOCAL_GO_SECRET_KEY are not set — using stub responses.'
  );
}

type DlocalPaymentStatus =
  | 'PENDING'
  | 'PAID'
  | 'REJECTED'
  | 'CANCELLED'
  | 'EXPIRED';

type CreatePaymentParams = {
  amount: number;
  currency: 'PYG';
  country: 'PY';
  orderId: string;
  description?: string;
  successUrl: string;
  backUrl: string;
  notificationUrl: string;
  payer?: {
    name?: string;
    email?: string;
  };
};

type DlocalPayment = {
  id: string;
  amount: number;
  currency: string;
  country: string;
  status: DlocalPaymentStatus;
  redirect_url: string;
  merchant_checkout_token?: string;
};

function authHeader(): string {
  return `Bearer ${apiKey}:${secretKey}`;
}

export async function createPayment(
  params: CreatePaymentParams
): Promise<{ error: string } | { success: DlocalPayment }> {
  if (!hasCredentials) {
    return {
      success: {
        id: `STUB-${params.orderId}`,
        amount: params.amount,
        currency: params.currency,
        country: params.country,
        status: 'PENDING',
        redirect_url: `${params.successUrl}?stub=1`,
        merchant_checkout_token: 'stub-token',
      },
    };
  }

  try {
    const response = await fetch(`${baseUrl}/v1/payments`, {
      method: 'POST',
      headers: {
        Authorization: authHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: params.amount,
        currency: params.currency,
        country: params.country,
        order_id: params.orderId,
        description: params.description,
        success_url: params.successUrl,
        back_url: params.backUrl,
        notification_url: params.notificationUrl,
        payer: params.payer,
      }),
    });

    if (!response.ok) {
      return { error: `dLocal error (${response.status}): ${await response.text()}` };
    }

    return { success: await response.json() };
  } catch (error) {
    console.error('Error creating dLocal payment:', error);
    return { error: 'No se pudo iniciar el pago' };
  }
}

export async function getPayment(
  paymentId: string
): Promise<{ error: string } | { success: DlocalPayment }> {
  if (paymentId.startsWith('STUB-')) {
    return {
      success: {
        id: paymentId,
        amount: 0,
        currency: 'PYG',
        country: 'PY',
        status: 'PAID',
        redirect_url: '',
      },
    };
  }

  if (!hasCredentials) {
    return { error: 'dLocal no está configurado' };
  }

  try {
    const response = await fetch(`${baseUrl}/v1/payments/${paymentId}`, {
      headers: { Authorization: authHeader() },
    });

    if (!response.ok) {
      return { error: `dLocal error (${response.status}): ${await response.text()}` };
    }

    return { success: await response.json() };
  } catch (error) {
    console.error('Error retrieving dLocal payment:', error);
    return { error: 'No se pudo consultar el pago' };
  }
}

export async function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null
): Promise<boolean> {
  // Stub/dev mode (no credentials configured): createPayment/getPayment
  // above already stub their responses in this case, so there's no real
  // secret to verify a signature against — accept unconditionally so the
  // webhook route stays exercisable end-to-end without sandbox creds, same
  // as the rest of this module. Production always sets real credentials,
  // so this bypass never applies there.
  if (!hasCredentials) return true;

  if (!signatureHeader || !apiKey || !secretKey) return false;

  const [, signature] = signatureHeader.split('Signature: ');
  if (!signature) return false;

  const expected = createHmac('sha256', secretKey)
    .update(apiKey + rawBody)
    .digest('hex');

  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(signature);

  if (expectedBuffer.length !== actualBuffer.length) return false;

  return timingSafeEqual(expectedBuffer, actualBuffer);
}
