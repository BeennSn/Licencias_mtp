import { NextRequest, NextResponse } from 'next/server'
import { getMercadoPagoPayment } from '@/lib/mercadopago/preference'
import { createSupabaseServiceClient } from '@/lib/supabase/server'

/**
 * Webhook de Mercado Pago (IPN)
 * Esta es la ÚNICA fuente de verdad para actualizar el estado de pago.
 * La página /pago/exito es solo UX — no cambia el estado.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // MP envía diferentes formatos de notificación
    const paymentId =
      body?.data?.id ??
      request.nextUrl.searchParams.get('id')

    const type = body?.type ?? request.nextUrl.searchParams.get('type')

    // Solo procesamos notificaciones de tipo 'payment'
    if (type !== 'payment' || !paymentId) {
      return NextResponse.json({ received: true }, { status: 200 })
    }

    // Obtener detalle real del pago desde MP
    const payment = await getMercadoPagoPayment(String(paymentId))

    const applicationId  = payment.external_reference
    const mpStatus       = payment.status        // 'approved' | 'pending' | 'rejected'
    const mpStatusDetail = payment.status_detail

    if (!applicationId) {
      console.warn('[MP Webhook] Pago sin external_reference:', paymentId)
      return NextResponse.json({ received: true }, { status: 200 })
    }

    const supabase = createSupabaseServiceClient()

    // Obtener la solicitud actual
    const { data: application } = await supabase
      .from('applications')
      .select('id, status, ruc, business_name')
      .eq('id', applicationId)
      .single()

    if (!application) {
      console.error('[MP Webhook] Aplicación no encontrada:', applicationId)
      return NextResponse.json({ error: 'Aplicación no encontrada' }, { status: 404 })
    }

    // Solo transicionar si aún está en PENDIENTE_PAGO
    if (application.status !== 'PENDIENTE_PAGO') {
      console.log(`[MP Webhook] Aplicación ${applicationId} ya tiene estado ${application.status}. Ignorando.`)
      return NextResponse.json({ received: true }, { status: 200 })
    }

    if (mpStatus === 'approved') {
      // ── PAGO APROBADO ────────────────────────────────────────────────
      // El trigger SQL genera el tracking_code y setea paid_at automáticamente
      const { error: updateError } = await supabase
        .from('applications')
        .update({
          status:           'PAGADO',
          mp_payment_id:    String(paymentId),
          mp_payment_status: mpStatus,
        })
        .eq('id', applicationId)
        .eq('status', 'PENDIENTE_PAGO') // Condición de carrera: idempotente

      if (updateError) {
        console.error('[MP Webhook] Error actualizando estado:', updateError)
        throw updateError
      }

      console.log(`[MP Webhook] ✅ Pago aprobado — Aplicación ${applicationId} → PAGADO`)

    } else if (mpStatus === 'rejected' || mpStatus === 'cancelled') {
      // Registrar el rechazo pero no cambiar el estado principal
      // El contribuyente puede reintentar el pago
      await supabase
        .from('applications')
        .update({
          mp_payment_id:    String(paymentId),
          mp_payment_status: `${mpStatus}:${mpStatusDetail}`,
        })
        .eq('id', applicationId)

      console.log(`[MP Webhook] ❌ Pago ${mpStatus} — Aplicación ${applicationId}`)
    }

    return NextResponse.json({ received: true }, { status: 200 })

  } catch (error) {
    console.error('[MP Webhook] Error general:', error)
    // Retornar 200 para que MP no reintente indefinidamente
    return NextResponse.json({ received: true }, { status: 200 })
  }
}

// MP también envía notificaciones GET (IPN legacy)
export async function GET(request: NextRequest) {
  return NextResponse.json({ status: 'MP Webhook activo' }, { status: 200 })
}
