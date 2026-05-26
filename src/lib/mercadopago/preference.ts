import {
  type MercadoPagoPreferenceRequest,
  type MercadoPagoPreferenceResponse,
} from '@/types/mercadopago.types'

const MP_API_BASE = 'https://api.mercadopago.com'

/**
 * Crea una Preference de Checkout Pro en Mercado Pago.
 * Se llama SOLO desde el servidor (Route Handler).
 */
export async function createMercadoPagoPreference(
  applicationId: string,
  businessName: string,
  payerEmail?: string
): Promise<MercadoPagoPreferenceResponse> {
  const accessToken = process.env.MP_ACCESS_TOKEN
  if (!accessToken) {
    throw new Error('MP_ACCESS_TOKEN no está configurado en las variables de entorno.')
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'

  const body: MercadoPagoPreferenceRequest = {
    items: [
      {
        id: 'LICENCIA-FUNCIONAMIENTO',
        title: 'Licencia de Funcionamiento Municipal',
        description: `Licencia para: ${businessName} — Municipalidad Provincial de Trujillo`,
        quantity: 1,
        currency_id: 'PEN',
        unit_price: 180.00,
      },
    ],
    payer: payerEmail ? { email: payerEmail } : undefined,
    external_reference: applicationId,
    
    back_urls: {
      success: `${baseUrl}/pago/exito`,
      pending: `${baseUrl}/pago/pendiente`,
      failure: `${baseUrl}/pago/fallo`,
    },
    
    notification_url: `${baseUrl}/api/mercadopago/webhook`,
    
    expires: true,
    expiration_date_to: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24h
  }

  const response = await fetch(`${MP_API_BASE}/checkout/preferences`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Mercado Pago error ${response.status}: ${err}`)
  }

  const data = await response.json()

  return {
    id: data.id,
    init_point: data.init_point,
    sandbox_init_point: data.sandbox_init_point,
  }
}

/**
 * Consulta el detalle de un pago en Mercado Pago.
 * Usado en el webhook para verificar el estado real del pago.
 */
export async function getMercadoPagoPayment(paymentId: string) {
  const accessToken = process.env.MP_ACCESS_TOKEN!

  const response = await fetch(`${MP_API_BASE}/v1/payments/${paymentId}`, {
    headers: { 'Authorization': `Bearer ${accessToken}` },
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`Error consultando pago MP ${paymentId}: ${response.status}`)
  }

  return response.json()
}
