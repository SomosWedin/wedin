import { NextResponse } from 'next/server';
import { applyTransactionStatusChange } from '@/actions/data/transaction';
import { getPayment, verifyWebhookSignature } from '@/lib/dlocal';
import prismaClient from '@/prisma/client';

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signatureHeader = request.headers.get('authorization');

  const isValidSignature = await verifyWebhookSignature(
    rawBody,
    signatureHeader
  );

  if (!isValidSignature) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let paymentId: string | undefined;

  try {
    paymentId = JSON.parse(rawBody).payment_id;
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  if (!paymentId) {
    return NextResponse.json({ error: 'Missing payment_id' }, { status: 400 });
  }

  const payment = await getPayment(paymentId);

  if ('error' in payment) {
    console.error('dLocal webhook: failed to retrieve payment', paymentId, payment.error);
    return NextResponse.json({ error: 'Could not retrieve payment' }, { status: 502 });
  }

  let targetStatus: 'COMPLETED' | 'FAILED' | null = null;

  if (payment.success.status === 'PAID') {
    targetStatus = 'COMPLETED';
  } else if (
    payment.success.status === 'REJECTED' ||
    payment.success.status === 'CANCELLED' ||
    payment.success.status === 'EXPIRED'
  ) {
    targetStatus = 'FAILED';
  }

  if (!targetStatus) {
    return NextResponse.json({ received: true });
  }

  try {
    const transactions = await prismaClient.transaction.findMany({
      where: { dlocalPaymentId: paymentId },
    });

    for (const transaction of transactions) {
      await applyTransactionStatusChange(transaction.id, targetStatus, null);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing dLocal webhook:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
