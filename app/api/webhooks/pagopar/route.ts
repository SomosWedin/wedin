import { NextResponse } from 'next/server'
import { applyTransactionStatusChange } from '@/actions/data/transaction'
import { getOrderStatus, verifyWebhookToken } from '@/lib/pagopar'
import prismaClient from '@/prisma/client'

export async function POST(request: Request) {
  const rawBody = await request.text()

  let resultado: Array<Record<string, unknown>> | undefined

  try {
    resultado = JSON.parse(rawBody).resultado
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const [result] = resultado ?? []
  const hashPedido = result?.hash_pedido as string | undefined
  const token = result?.token as string | undefined

  if (!hashPedido) {
    return NextResponse.json({ error: 'Missing hash_pedido' }, { status: 400 })
  }

  const isValidToken = await verifyWebhookToken(hashPedido, token)

  if (!isValidToken) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  const status = await getOrderStatus(hashPedido)

  if ('error' in status) {
    console.error(
      'Pagopar webhook: failed to retrieve order status',
      hashPedido,
      status.error
    )
    // Non-200 so Pagopar retries in ~10 min and we get another chance.
    return NextResponse.json(
      { error: 'Could not retrieve order' },
      { status: 502 }
    )
  }

  let targetStatus: 'COMPLETED' | 'FAILED' | null = null

  if (status.success.pagado) {
    targetStatus = 'COMPLETED'
  } else if (status.success.cancelado) {
    targetStatus = 'FAILED'
  }

  if (!targetStatus) {
    return NextResponse.json(resultado, { status: 200 })
  }

  try {
    const transactions = await prismaClient.transaction.findMany({
      where: { pagoparHash: hashPedido },
    })

    for (const transaction of transactions) {
      await applyTransactionStatusChange(transaction.id, targetStatus, null)
    }

    return NextResponse.json(resultado, { status: 200 })
  } catch (error) {
    console.error('Error processing Pagopar webhook:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
