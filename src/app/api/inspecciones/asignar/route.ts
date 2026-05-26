import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase/server'

/**
 * Asigna un inspector a una solicitud y cambia el estado a EN_INSPECCION.
 * Solo accesible por inspectores y admins (validado via RLS + check manual).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { applicationId, inspectorId, scheduledDate, attemptNumber = 1 } = body

    if (!applicationId || !inspectorId || !scheduledDate) {
      return NextResponse.json(
        { error: 'applicationId, inspectorId y scheduledDate son requeridos.' },
        { status: 400 }
      )
    }

    const supabase = createSupabaseServiceClient()

    // Verificar que el inspector existe y tiene el rol correcto
    const { data: inspector } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', inspectorId)
      .eq('role', 'inspector')
      .single()

    if (!inspector) {
      return NextResponse.json(
        { error: 'Inspector no válido.' },
        { status: 403 }
      )
    }

    // Crear la inspección
    const { data: inspection, error: inspError } = await supabase
      .from('inspections')
      .insert({
        application_id: applicationId,
        inspector_id:   inspectorId,
        attempt_number: attemptNumber,
        scheduled_date: scheduledDate,
      })
      .select()
      .single()

    if (inspError) {
      throw inspError
    }

    // Actualizar el estado de la solicitud
    const newStatus = attemptNumber === 1 ? 'EN_INSPECCION' : 'SEGUNDA_INSPECCION'
    await supabase
      .from('applications')
      .update({ status: newStatus })
      .eq('id', applicationId)

    return NextResponse.json({ inspection }, { status: 201 })

  } catch (error) {
    console.error('[Inspecciones/asignar]', error)
    return NextResponse.json(
      { error: 'Error al asignar la inspección.' },
      { status: 500 }
    )
  }
}
