import { NextRequest, NextResponse } from 'next/server'
import { createMercadoPagoPreference } from '@/lib/mercadopago/preference'
import { createSupabaseServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { applicationId } = body

    if (!applicationId) {
      return NextResponse.json(
        { error: 'applicationId es requerido.' },
        { status: 400 }
      )
    }

    // Verificar que la aplicación existe y está en estado correcto
    const supabase = createSupabaseServiceClient()
    const { data: application, error: dbError } = await supabase
      .from('applications')
      .select('id, business_name, status, ruc')
      .eq('id', applicationId)
      .single()

    if (dbError || !application) {
      return NextResponse.json(
        { error: 'Solicitud no encontrada.' },
        { status: 404 }
      )
    }

    if (application.status !== 'PENDIENTE_PAGO') {
      return NextResponse.json(
        { error: `La solicitud ya tiene estado: ${application.status}. Solo se puede pagar en estado PENDIENTE_PAGO.` },
        { status: 409 }
      )
    }

    // Crear la preference en Mercado Pago
    const preference = await createMercadoPagoPreference(
      applicationId,
      application.business_name
    )

    // Guardar el preference_id en la base de datos
    await supabase
      .from('applications')
      .update({ mp_preference_id: preference.id })
      .eq('id', applicationId)

    const isProduction = process.env.MP_MODE === 'production'

    return NextResponse.json({
      preferenceId:  preference.id,
      checkoutUrl:   isProduction ? preference.init_point : preference.sandbox_init_point,
    })
  } catch (error) {
    console.error('[MP crear-preferencia]', error)
    return NextResponse.json(
      { error: 'Error al crear la preferencia de pago.' },
      { status: 500 }
    )
  }
}
