import { type SunatRucResponse, type SunatValidationResult } from '@/types/sunat.types'

// Ubigeos de la Provincia de Trujillo (La Libertad)
const TRUJILLO_UBIGEOS = [
  '130101', '130102', '130103', '130104', '130105',
  '130106', '130107', '130108', '130109', '130110', '130111',
]

/**
 * Valida que un RUC corresponda a un negocio:
 * 1. Con estado ACTIVO
 * 2. Con condición HABIDO
 * 3. Ubicado en la Provincia de Trujillo (por ubigeo o por nombre de provincia/departamento)
 */
export function validateSunatData(data: SunatRucResponse): SunatValidationResult {
  const ruc = data.ruc

  if (data.estadoContribuyente.toUpperCase() !== 'ACTIVO') {
    return {
      valid: false,
      ruc,
      data,
      error: `El RUC ${ruc} no está ACTIVO en SUNAT (estado: ${data.estadoContribuyente}).`,
    }
  }

  if (data.condicionContribuyente.toUpperCase() !== 'HABIDO') {
    return {
      valid: false,
      ruc,
      data,
      error: `El RUC ${ruc} figura como NO HABIDO en SUNAT. Solo se aceptan contribuyentes HABIDOS.`,
    }
  }

  let esTrujillo = false;

  if (data.ubigeo) {
    esTrujillo = TRUJILLO_UBIGEOS.some(u => data.ubigeo?.startsWith(u))
  }

  if (!esTrujillo && data.departamento && data.provincia) {
    const depto = data.departamento.toUpperCase();
    const prov = data.provincia.toUpperCase();
    esTrujillo =
      (depto === 'LA LIBERTAD' || depto.includes('LIBERTAD')) &&
      prov === 'TRUJILLO';
  }

  if (!esTrujillo) {
    const ubicacion = data.provincia
      ? `${data.provincia}, ${data.departamento || '—'}`
      : (data.ubigeo || '—');
    return {
      valid: false,
      ruc,
      data,
      error: `El domicilio fiscal (${ubicacion}) no corresponde a la Provincia de Trujillo. Esta licencia solo se otorga en el ámbito de la MPT.`,
    }
  }

  return { valid: true, ruc, data }
}
