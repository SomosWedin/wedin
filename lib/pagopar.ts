'use server';

import { createHash, timingSafeEqual } from 'crypto';

const publicKey = process.env.PAGOPAR_PUBLIC_KEY;
const privateKey = process.env.PAGOPAR_PRIVATE_KEY;
const baseUrl = 'https://api.pagopar.com';

const hasCredentials = Boolean(publicKey && privateKey);

if (!hasCredentials) {
  console.warn(
    'lib/pagopar.ts: PAGOPAR_PUBLIC_KEY/PAGOPAR_PRIVATE_KEY are not set — using stub responses.'
  );
}

type CreateOrderParams = {
  orderId: string;
  totalAmount: number;
  description: string;
  payer: {
    name: string;
    email: string;
    documento: string;
  };
  items: {
    name: string;
    amount: number;
  }[];
};

type PagoparOrder = {
  hash: string;
  pedido: string;
};

type PagoparOrderStatus = {
  pagado: boolean;
  cancelado: boolean;
  hash_pedido: string;
  monto: string;
};

function sha1(value: string): string {
  return createHash('sha1').update(value).digest('hex');
}

// Pagopar wants "YYYY-MM-DD HH:MM:SS", no timezone offset.
function formatPagoparDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
}

export async function createOrder(
  params: CreateOrderParams
): Promise<{ error: string } | { success: PagoparOrder }> {
  if (!hasCredentials) {
    return {
      success: { hash: `STUB-${params.orderId}`, pedido: params.orderId },
    };
  }

  const token = sha1(
    privateKey + params.orderId + String(params.totalAmount)
  );

  try {
    const response = await fetch(
      `${baseUrl}/api/comercios/2.0/iniciar-transaccion`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          public_key: publicKey,
          monto_total: params.totalAmount,
          tipo_pedido: 'VENTA-COMERCIO',
          id_pedido_comercio: params.orderId,
          fecha_maxima_pago: formatPagoparDate(
            new Date(Date.now() + 24 * 60 * 60 * 1000)
          ),
          descripcion_resumen: params.description,
          comprador: {
            ruc: '',
            email: params.payer.email,
            nombre: params.payer.name,
            telefono: '',
            documento: params.payer.documento,
            tipo_documento: 'CI',
            ciudad: null,
            direccion: '',
            coordenadas: '',
            razon_social: '',
            direccion_referencia: null,
          },
          // categoria 4 = "productos y servicios virtuales", the bucket
          // Pagopar had to explicitly enable on this merchant account —
          // a cash-gift contribution has no physical shipment, so the
          // courier-taxonomy categories don't apply here.
          compras_items: params.items.map((item, index) => ({
            nombre: item.name,
            cantidad: 1,
            categoria: 4,
            ciudad: '1',
            descripcion: item.name,
            id_producto: index + 1,
            precio_total: item.amount,
            public_key: publicKey,
            url_imagen: '',
            vendedor_telefono: '',
            vendedor_direccion: '',
            vendedor_direccion_referencia: '',
            vendedor_direccion_coordenadas: '',
          })),
        }),
      }
    );

    const json = await response.json();

    if (!response.ok || !json.respuesta) {
      return { error: `Pagopar error: ${JSON.stringify(json.resultado ?? json)}` };
    }

    return {
      success: { hash: json.resultado[0].data, pedido: json.resultado[0].pedido },
    };
  } catch (error) {
    console.error('Error creating Pagopar order:', error);
    return { error: 'No se pudo iniciar el pago' };
  }
}

export async function getOrderStatus(
  hash: string
): Promise<{ error: string } | { success: PagoparOrderStatus }> {
  if (hash.startsWith('STUB-')) {
    return {
      success: { pagado: true, cancelado: false, hash_pedido: hash, monto: '0' },
    };
  }

  if (!hasCredentials) {
    return { error: 'Pagopar no está configurado' };
  }

  const token = sha1(privateKey + 'CONSULTA');

  try {
    const response = await fetch(`${baseUrl}/api/pedidos/1.1/traer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hash_pedido: hash,
        token,
        token_publico: publicKey,
      }),
    });

    const json = await response.json();

    if (!response.ok || !json.respuesta) {
      return { error: `Pagopar error: ${JSON.stringify(json)}` };
    }

    return { success: json.resultado[0] };
  } catch (error) {
    console.error('Error retrieving Pagopar order status:', error);
    return { error: 'No se pudo consultar el pago' };
  }
}

export async function verifyWebhookToken(
  hashPedido: string,
  token: string | null | undefined
): Promise<boolean> {
  if (!hasCredentials) return true;

  if (!token || !privateKey) return false;

  const expected = sha1(privateKey + hashPedido);
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(token);

  if (expectedBuffer.length !== actualBuffer.length) return false;

  return timingSafeEqual(expectedBuffer, actualBuffer);
}
