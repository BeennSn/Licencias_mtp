import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase/server'

/**
 * Verifica un pago contra Mercado Pago y actualiza la aplicación si está aprobado.
 * Se llama desde PagoExitoContent cuando MP redirige con payment_id en la URL.
 */
export async function POST(request: NextRequest) {
  try {
    const { applicationId, paymentId } = await request.json()

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
      .select('id, status, mp_preference_id')
      .eq('id', applicationId)
      .single()

    if (!app) {
      return NextResponse.json({ error: 'Aplicación no encontrada' }, { status: 404 })
    }

    if (app.status !== 'PENDIENTE_PAGO') {
      return NextResponse.json({ status: app.status, message: 'Ya procesado' })
    }

    // Si nos pasaron paymentId, verificamos ese pago directamente
    if (paymentId) {
      const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      if (!mpRes.ok) {
        return NextResponse.json({ error: 'Error verificando pago en MP' }, { status: 502 })
      }

      const payment = await mpRes.json()

      if (payment.status === 'approved') {
        const { error: updateError } = await supabase
          .from('applications')
          .update({
            status: 'PAGADO',
            mp_payment_id: String(paymentId),
            mp_payment_status: payment.status,
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
          confirmed: true,
          status: 'PAGADO',
          tracking_code: (updated as Record<string, unknown>)?.tracking_code ?? null,
        })
      }

      return NextResponse.json({
        confirmed: false,
        status: payment.status,
        message: `Pago en estado: ${payment.status}`,
      })
    }

    // Sin paymentId: buscar pagos por preference_id
    if (app.mp_preference_id) {
      const mpRes = await fetch(
        `https://api.mercadopago.com/checkout/preferences/${app.mp_preference_id}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      )

      if (mpRes.ok) {
        const pref = await mpRes.json()
        const collections = pref?.collections ?? pref?.items ?? []
        // Buscar pagos asociados
        const searchRes = await fetch(
          `https://api.mercadopago.com/v1/payments/search?external_reference=${applicationId}`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        )

        if (searchRes.ok) {
          const searchData = await searchRes.json()
          const payments = searchData?.results ?? []

          const approved = payments.find((p: Record<string, unknown>) => p.status === 'approved')
          if (approved) {
            const { error: updateError } = await supabase
              .from('applications')
              .update({
                status: 'PAGADO',
                mp_payment_id: String(approved.id),
                mp_payment_status: 'approved',
              })
              .eq('id', applicationId)
              .eq('status', 'PENDIENTE_PAGO')

            if (updateError) throw updateError

            const { data: updated } = await supabase
              .from('applications')
              .select('id, status, tracking_code')
              .eq('id', applicationId)
              .single()

            return NextResponse.json({
              confirmed: true,
              status: 'PAGADO',
              tracking_code: (updated as Record<string, unknown>)?.tracking_code ?? null,
            })
          }
        }
      }
    }

    return NextResponse.json({
      confirmed: false,
      status: 'PENDIENTE_PAGO',
      message: 'No se encontró pago aprobado en Mercado Pago',
    })
  } catch (error) {
    console.error('[MP confirmar-pago]', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
