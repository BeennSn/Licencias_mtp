import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase/server'
import { LICENCIA_AMOUNT } from '@/lib/utils/stateMachine'

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
}

/**
 * POST /api/mercadopago/procesar-pago
 *
 * Procesa pagos tokenizados desde MercadoPago Bricks.
 * Soporta:
 *   - Tarjeta de crédito/débito (token de card)
 *   - Yape por código de aprobación (phone + otp)
 *   - Transferencia bancaria (PSE / Pago efectivo)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      applicationId,
      // Campos para tarjeta
      token,
      paymentMethodId,
      issuerId,
      installments,
      payerEmail,
      // Campos para Yape
      phoneNumber,
      otp,
    } = body

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
      .select('id, status, business_name, ruc')
      .eq('id', applicationId)
      .single()

    if (!app) {
      return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 })
    }

    if (app.status !== 'PENDIENTE_PAGO') {
      return NextResponse.json(
        { error: `La solicitud ya tiene estado: ${app.status}` },
        { status: 409 }
      )
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
    const amount = LICENCIA_AMOUNT

    let paymentBody: Record<string, unknown>

    // ── Pago con Yape (código de aprobación) ────────────────────────────────
    if (phoneNumber && otp) {
      paymentBody = {
        transaction_amount: amount,
        description: `Licencia de Funcionamiento - ${app.business_name}`,
        payment_method_id: 'yape',
        payer: {
          email: payerEmail ?? 'contribuyente@mpt.gob.pe',
          first_name: app.business_name,
        },
        external_reference: applicationId,
        notification_url: `${baseUrl}/api/mercadopago/webhook`,
        metadata: {
          phone_number: phoneNumber,
          otp,
        },
      }

    // ── Pago con Tarjeta (token de Bricks) ──────────────────────────────────
    } else if (token && paymentMethodId) {
      paymentBody = {
        transaction_amount: amount,
        token,
        description: `Licencia de Funcionamiento - ${app.business_name}`,
        installments: installments ?? 1,
        payment_method_id: paymentMethodId,
        issuer_id: issuerId,
        payer: {
          email: payerEmail ?? 'contribuyente@mpt.gob.pe',
        },
        external_reference: applicationId,
        notification_url: `${baseUrl}/api/mercadopago/webhook`,
      }

    } else {
      return NextResponse.json(
        { error: 'Parámetros insuficientes. Se requiere (token + paymentMethodId) o (phoneNumber + otp).' },
        { status: 400 }
      )
    }

    // ── Llamada a la API de Mercado Pago ────────────────────────────────────
    const mpRes = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        'X-Idempotency-Key': `${applicationId}-${Date.now()}`,
      },
      body: JSON.stringify(paymentBody),
    })

    const payment = await mpRes.json()

    if (!mpRes.ok) {
      console.error('[procesar-pago] MP error:', payment)
      const userMessage = getMpErrorMessage(payment)
      return NextResponse.json({ error: userMessage }, { status: 422, headers: NO_CACHE_HEADERS })
    }

    // ── Actualizar DB ────────────────────────────────────────────────────────
    if (payment.status === 'approved') {
      await supabase
        .from('applications')
        .update({
          status: 'PAGADO',
          mp_payment_id: String(payment.id),
          mp_payment_status: 'approved',
        })
        .eq('id', applicationId)
        .eq('status', 'PENDIENTE_PAGO')

      const { data: updated } = await supabase
        .from('applications')
        .select('id, status, tracking_code')
        .eq('id', applicationId)
        .single()

      return NextResponse.json({
        success: true,
        status: 'approved',
        trackingCode: (updated as Record<string, unknown>)?.tracking_code ?? null,
      }, { headers: NO_CACHE_HEADERS })
    }

    // Pago pendiente (transferencias, etc.)
    if (payment.status === 'pending' || payment.status === 'in_process') {
      await supabase
        .from('applications')
        .update({
          mp_payment_id: String(payment.id),
          mp_payment_status: payment.status,
        })
        .eq('id', applicationId)

      return NextResponse.json({
        success: false,
        status: payment.status,
        statusDetail: payment.status_detail,
        paymentId: String(payment.id),
        message: 'El pago está siendo procesado. Recibirás una confirmación.',
      }, { headers: NO_CACHE_HEADERS })
    }

    // Rechazado
    const reason = getMpErrorMessage(payment)
    return NextResponse.json({
      success: false,
      status: payment.status,
      statusDetail: payment.status_detail,
      error: reason,
    }, { status: 422, headers: NO_CACHE_HEADERS })

  } catch (err) {
    console.error('[procesar-pago]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

function getMpErrorMessage(payment: Record<string, unknown>): string {
  const detail = String(payment?.status_detail ?? '')
  const cause = (payment?.cause as Array<{ description: string }> | undefined)?.[0]?.description

  const MAP: Record<string, string> = {
    cc_rejected_bad_filled_card_number: 'Número de tarjeta incorrecto.',
    cc_rejected_bad_filled_date:        'Fecha de vencimiento incorrecta.',
    cc_rejected_bad_filled_other:       'Datos de la tarjeta incorrectos.',
    cc_rejected_bad_filled_security_code: 'Código de seguridad incorrecto.',
    cc_rejected_blacklist:              'Tarjeta rechazada. Contacta a tu banco.',
    cc_rejected_call_for_authorize:     'Llama a tu banco para autorizar el pago.',
    cc_rejected_card_disabled:          'Tarjeta inactiva. Contacta a tu banco.',
    cc_rejected_insufficient_amount:    'Fondos insuficientes.',
    cc_rejected_max_attempts:           'Límite de intentos alcanzado. Intenta con otra tarjeta.',
    pending_waiting_transfer:           'Transferencia iniciada. Esperando confirmación bancaria.',
    pending_waiting_payment:            'Pendiente de pago.',
  }

  return MAP[detail] ?? cause ?? `Pago rechazado (${detail || 'error desconocido'}).`
}
