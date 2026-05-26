import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase/server'

/**
 * Endpoint SOLO PARA PRUEBAS: Procesa un pago de prueba directo con tarjeta de test
 * sin pasar por el Checkout Pro redirect, evitando los CSP issues del sandbox.
 *
 * Tarjetas de prueba:
 *   Visa: 4000 0000 0000 0004
 *   Mastercard: 5031 7557 3453 0604
 *   American Express: 3711 8030 3257 522
 *
 * CVU: 123, Fecha: cualquier fecha futura, Nombre: cualquiera
 */
export async function POST(request: NextRequest) {
  if (process.env.MP_MODE === 'production') {
    return NextResponse.json({ error: 'Endpoint solo disponible en modo sandbox' }, { status: 403 })
  }

  try {
    const { applicationId, cardNumber, cvv, expirationMonth, expirationYear, cardholderName } = await request.json()

    if (!applicationId) {
      return NextResponse.json({ error: 'applicationId requerido' }, { status: 400 })
    }

    const accessToken = process.env.MP_ACCESS_TOKEN
    if (!accessToken) {
      return NextResponse.json({ error: 'MP_ACCESS_TOKEN no configurado' }, { status: 500 })
    }

    const supabase = createSupabaseServiceClient()

    const { data: app } = await supabase
      .from('applications')
      .select('id, status, business_name, mp_preference_id')
      .eq('id', applicationId)
      .single()

    if (!app) {
      return NextResponse.json({ error: 'Aplicación no encontrada' }, { status: 404 })
    }

    if (app.status !== 'PENDIENTE_PAGO') {
      return NextResponse.json({ status: app.status, message: 'Ya procesado' })
    }

    // 1. Crear card token con la tarjeta de prueba
    const publicKey = process.env.NEXT_PUBLIC_MP_PUBLIC_KEY
    if (!publicKey) {
      return NextResponse.json({ error: 'MP_PUBLIC_KEY no configurada' }, { status: 500 })
    }

    const tokenRes = await fetch(`https://api.mercadopago.com/v1/card_tokens?public_key=${publicKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        card_number: cardNumber ?? '4000 0000 0000 0004',
        cvv: cvv ?? '123',
        expiration_month: expirationMonth ?? '12',
        expiration_year: expirationYear ?? '2030',
        cardholder: { name: cardholderName ?? 'Test User' },
      }),
    })

    if (!tokenRes.ok) {
      const err = await tokenRes.text()
      return NextResponse.json({ error: `Error creando card token: ${err}` }, { status: 502 })
    }

    const tokenData = await tokenRes.json()
    const cardTokenId = tokenData.id

    if (!cardTokenId) {
      return NextResponse.json({ error: 'No se pudo obtener el card token' }, { status: 502 })
    }

    // 2. Procesar el pago directamente
    const paymentRes = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        transaction_amount: 180.00,
        token: cardTokenId,
        description: `Licencia de Funcionamiento - ${app.business_name}`,
        installments: 1,
        payment_method_id: 'visa',
        payer: { email: 'test_user@test.com' },
        external_reference: applicationId,
      }),
    })

    if (!paymentRes.ok) {
      const err = await paymentRes.text()
      return NextResponse.json({ error: `Error procesando pago: ${err}` }, { status: 502 })
    }

    const payment = await paymentRes.json()

    // 3. Si el pago fue aprobado, actualizar la DB
    if (payment.status === 'approved') {
      const preferenceId = payment.preference_id || app.mp_preference_id

      const { error: updateError } = await supabase
        .from('applications')
        .update({
          status: 'PAGADO',
          mp_preference_id: preferenceId,
          mp_payment_id: String(payment.id),
          mp_payment_status: 'approved',
        })
        .eq('id', applicationId)
        .eq('status', 'PENDIENTE_PAGO')

      if (updateError) throw updateError

      const { data: updated } = await supabase
        .from('applications')
        .select('id, status, tracking_code, mp_payment_id')
        .eq('id', applicationId)
        .single()

      return NextResponse.json({
        success: true,
        status: 'PAGADO',
        tracking_code: (updated as Record<string, unknown>)?.tracking_code ?? null,
        mp_payment_id: String(payment.id),
      })
    }

    // Pago rechazado o pendiente
    return NextResponse.json({
      success: false,
      status: payment.status,
      status_detail: payment.status_detail,
      message: `Pago ${payment.status}: ${payment.status_detail}`,
    })
  } catch (error) {
    console.error('[MP pago-prueba]', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
