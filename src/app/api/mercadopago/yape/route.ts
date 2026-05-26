import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { applicationId } = await request.json()

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

    const paymentRes = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        transaction_amount: 0.50, // CAMBIAR A 180.00 CUANDO VAYAS A PRODUCCIÓN REAL
        description: `Licencia de Funcionamiento - ${app.business_name}`,
        payment_method_id: 'yape',
        payer: { email: 'contribuyente@mpt.gob.pe' },
        external_reference: applicationId,
      }),
    })

    if (!paymentRes.ok) {
      const err = await paymentRes.text()
      return NextResponse.json({ error: `Error creando pago Yape: ${err}` }, { status: 502 })
    }

    const payment = await paymentRes.json()

    const transactionData = payment?.point_of_interaction?.transaction_data

    // Guardar mp_payment_id para tracking
    await supabase
      .from('applications')
      .update({
        mp_payment_id: String(payment.id),
        mp_payment_status: payment.status,
      })
      .eq('id', applicationId)

    return NextResponse.json({
      success: payment.status === 'approved' || payment.status === 'pending',
      paymentId: String(payment.id),
      status: payment.status,
      qrCodeBase64: transactionData?.qr_code_base64 ?? null,
      qrCodeText: transactionData?.qr_code ?? null,
      transactionAmount: payment.transaction_amount,
      externalReference: payment.external_reference,
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('[MP Yape]', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const paymentId = request.nextUrl.searchParams.get('paymentId')
    const applicationId = request.nextUrl.searchParams.get('applicationId')

    if (!paymentId && !applicationId) {
      return NextResponse.json({ error: 'paymentId o applicationId requerido' }, { status: 400 })
    }

    const accessToken = process.env.MP_ACCESS_TOKEN
    if (!accessToken) {
      return NextResponse.json({ error: 'MP_ACCESS_TOKEN no configurado' }, { status: 500 })
    }

    if (paymentId) {
      const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      if (!res.ok) {
        return NextResponse.json({ error: 'Error consultando pago' }, { status: 502 })
      }

      const payment = await res.json()

      return NextResponse.json({
        paymentId: String(payment.id),
        status: payment.status,
        statusDetail: payment.status_detail,
        approved: payment.status === 'approved',
      })
    }

    if (applicationId) {
      const res = await fetch(
        `https://api.mercadopago.com/v1/payments/search?external_reference=${applicationId}&payment_method_id=yape`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      )

      if (!res.ok) {
        return NextResponse.json({ error: 'Error buscando pagos' }, { status: 502 })
      }

      const data = await res.json()
      const payments = data?.results ?? []

      const approved = payments.find((p: Record<string, unknown>) => p.status === 'approved')
      const pending = payments.find((p: Record<string, unknown>) => p.status === 'pending')

      if (approved) {
        const supabase = createSupabaseServiceClient()
        await supabase
          .from('applications')
          .update({
            status: 'PAGADO',
            mp_payment_id: String((approved as Record<string, unknown>).id),
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
          confirmed: true,
          paymentId: String((approved as Record<string, unknown>).id),
          status: 'approved',
          trackingCode: (updated as Record<string, unknown>)?.tracking_code ?? null,
        })
      }

      return NextResponse.json({
        confirmed: false,
        status: pending ? (pending as Record<string, unknown>).status : 'not_found',
        paymentId: pending ? String((pending as Record<string, unknown>).id) : null,
      })
    }
  } catch (error) {
    console.error('[MP Yape GET]', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
