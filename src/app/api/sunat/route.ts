import { NextRequest, NextResponse } from 'next/server';
import { consultarRucEnRucPeru } from '@/lib/sunat/rucperu-scraper';
import { validateSunatData } from '@/lib/sunat/validator';
import { validarDigitoVerificadorRUC } from '@/lib/utils/formatters';
import type { SunatRucResponse, SunatValidationResult } from '@/types/sunat.types';

function mapRucPeruResponse(ruc: string, data: NonNullable<Awaited<ReturnType<typeof consultarRucEnRucPeru>>>): SunatRucResponse {
  return {
    ruc: data.ruc || ruc,
    razonSocial: data.razon_social || '',
    nombreComercial: null,
    estadoContribuyente: (data.estado || '').toUpperCase().trim(),
    condicionContribuyente: (data.condicion || '').toUpperCase().trim(),
    ubigeo: '',
    departamento: (data.departamento || '').toUpperCase().trim(),
    provincia: (data.provincia || '').toUpperCase().trim(),
    distrito: (data.distrito || '').toUpperCase().trim(),
    direccion: data.direccion || '',
    actividadEconomica: '',
    tipoContribuyente: data.tipo_contribuyente || '',
  };
}

export async function GET(request: NextRequest) {
  const ruc = request.nextUrl.searchParams.get('ruc');

  if (!ruc || !/^\d{11}$/.test(ruc)) {
    return NextResponse.json({
      valid: false,
      ruc: ruc || '',
      data: null,
      error: 'RUC inválido. Debe tener exactamente 11 dígitos numéricos.',
    } satisfies SunatValidationResult, { status: 400 });
  }

  if (!validarDigitoVerificadorRUC(ruc)) {
    return NextResponse.json({
      valid: false,
      ruc,
      data: null,
      error: 'El RUC ingresado no es válido (dígito verificador incorrecto).',
    } satisfies SunatValidationResult, { status: 400 });
  }

  try {
    const raw = await consultarRucEnRucPeru(ruc);

    if (!raw) {
      return NextResponse.json({
        valid: false,
        ruc,
        data: null,
        error: 'No se encontraron datos para este RUC en SUNAT. Verifique que el número sea correcto.',
      } satisfies SunatValidationResult, { status: 404 });
    }

    const sunatData = mapRucPeruResponse(ruc, raw);
    const validation = validateSunatData(sunatData);

    if (!validation.valid) {
      return NextResponse.json(validation, { status: 200 });
    }

    return NextResponse.json(validation, { status: 200 });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido';

    return NextResponse.json({
      valid: false,
      ruc,
      data: null,
      error: `Error al consultar SUNAT: ${message}`,
    } satisfies SunatValidationResult, { status: 502 });
  }
}
