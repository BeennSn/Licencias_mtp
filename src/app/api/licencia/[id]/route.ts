import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/utils/formatters'

/**
 * Genera y retorna el PDF de licencia en formato HTML imprimible.
 * Requiere que la aplicación esté en estado APROBADO.
 * En producción esta ruta devolvería un PDF generado con pdf-lib o Puppeteer.
 * Para el MVP, genera HTML que puede imprimirse como PDF desde el browser.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const supabase = createSupabaseServiceClient()

  const { data: app, error } = await supabase
    .from('applications')
    .select('*')
    .eq('id', id)
    .eq('status', 'APROBADO')
    .single()

  if (error || !app) {
    return NextResponse.json(
      { error: 'Licencia no encontrada o no ha sido aprobada.' },
      { status: 404 }
    )
  }

  const verifyUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/verificar/${app.tracking_code}`

  // Retornar HTML imprimible como licencia
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Licencia de Funcionamiento — ${app.tracking_code}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', sans-serif; background: #fff; color: #1a1a2e; }
    .license {
      max-width: 800px; margin: 0 auto; padding: 48px;
      border: 4px solid #1a3a6e;
    }
    .header { text-align: center; border-bottom: 2px solid #1a3a6e; padding-bottom: 24px; margin-bottom: 24px; }
    .escudo { font-size: 48px; margin-bottom: 8px; }
    .institution { font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: #666; }
    .title { font-size: 22px; font-weight: 700; color: #1a3a6e; margin-top: 8px; }
    .subtitle { font-size: 14px; color: #444; margin-top: 4px; }
    .code { font-size: 28px; font-weight: 700; color: #c8a84b; letter-spacing: 4px; margin: 16px 0; text-align: center; }
    .section { margin: 20px 0; }
    .label { font-size: 10px; letter-spacing: 1px; text-transform: uppercase; color: #888; }
    .value { font-size: 16px; font-weight: 600; color: #1a1a2e; margin-top: 2px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px; }
    .validity { background: #f0f9f0; border: 2px solid #22c55e; padding: 16px; border-radius: 8px; margin-top: 24px; text-align: center; }
    .validity .label { color: #16a34a; }
    .validity .value { color: #15803d; font-size: 18px; }
    .footer { margin-top: 40px; display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px solid #ddd; padding-top: 20px; }
    .qr-placeholder { border: 1px solid #ddd; padding: 8px; text-align: center; font-size: 10px; color: #999; }
    .signature { text-align: center; }
    .sig-line { border-top: 1px solid #333; width: 200px; margin: 0 auto; padding-top: 8px; font-size: 11px; }
    @media print {
      body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="license">
    <div class="header">
      <div class="escudo">🏛️</div>
      <div class="institution">República del Perú</div>
      <div class="title">MUNICIPALIDAD PROVINCIAL DE TRUJILLO</div>
      <div class="subtitle">Gerencia de Desarrollo Económico Local</div>
    </div>

    <div style="text-align:center; margin-bottom: 8px;">
      <span class="label">LICENCIA DE FUNCIONAMIENTO</span>
    </div>
    <div class="code">${app.tracking_code}</div>

    <div class="grid">
      <div class="section">
        <div class="label">Razón Social / Nombre Comercial</div>
        <div class="value">${app.business_name}</div>
      </div>
      <div class="section">
        <div class="label">RUC</div>
        <div class="value">${app.ruc}</div>
      </div>
      <div class="section">
        <div class="label">Domicilio del Establecimiento</div>
        <div class="value">${app.fiscal_address}</div>
      </div>
      <div class="section">
        <div class="label">Actividad Económica</div>
        <div class="value">${app.economic_activity ?? 'Ver expediente'}</div>
      </div>
      <div class="section">
        <div class="label">Fecha de Aprobación</div>
        <div class="value">${formatDate(app.approved_at)}</div>
      </div>
      <div class="section">
        <div class="label">Área del Establecimiento</div>
        <div class="value">${app.area_m2 ? `${app.area_m2} m²` : 'No especificada'}</div>
      </div>
    </div>

    <div class="validity">
      <div class="label">Vigencia de la Licencia</div>
      <div class="value">HASTA EL ${formatDate(app.expires_at)}</div>
    </div>

    <div class="footer">
      <div class="qr-placeholder">
        <div>🔗 Verificar en:</div>
        <div style="font-size:9px; word-break:break-all; max-width:140px;">${verifyUrl}</div>
      </div>
      <div class="signature">
        <div class="sig-line">Gerente de Desarrollo Económico Local</div>
        <div style="font-size:10px; color:#666; margin-top:4px;">Municipalidad Provincial de Trujillo</div>
      </div>
    </div>

    <p style="text-align:center; font-size:9px; color:#999; margin-top:24px;">
      Emitido el ${formatDate(new Date().toISOString())} — Verificación digital: ${verifyUrl}
    </p>
  </div>

  <div class="no-print" style="text-align:center; margin:24px;">
    <button onclick="window.print()" style="background:#1a3a6e; color:#fff; padding:12px 32px; border:none; border-radius:8px; font-size:16px; cursor:pointer;">
      🖨️ Imprimir / Guardar PDF
    </button>
  </div>
</body>
</html>`

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'private, no-cache',
    },
  })
}
