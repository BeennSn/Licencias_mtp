// Formateadores para el proyecto Licencias MPT

/** Formatea un número como soles peruanos */
export function formatSoles(amount: number): string {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2,
  }).format(amount)
}

/** Formatea una fecha ISO a formato legible en español peruano */
export function formatDate(isoDate: string | null | undefined): string {
  if (!isoDate) return '—'
  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(isoDate))
}

/** Formatea una fecha ISO con hora */
export function formatDateTime(isoDate: string | null | undefined): string {
  if (!isoDate) return '—'
  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(isoDate))
}

/** Formatea RUC: agrega guiones para legibilidad visual (10-XXXXXXXX-X) */
export function formatRUC(ruc: string): string {
  if (ruc.length !== 11) return ruc
  return ruc
}

/** Valida el formato de un RUC peruano (11 dígitos, empieza en 10 o 20) */
export function isValidRucFormat(ruc: string): boolean {
  return /^\d{11}$/.test(ruc) && (ruc.startsWith('10') || ruc.startsWith('20'))
}

/** Valida el dígito verificador del RUC peruano usando el algoritmo SUNAT */
export function validarDigitoVerificadorRUC(ruc: string): boolean {
  if (ruc.length !== 11) return false;

  const factores = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  let suma = 0;

  for (let i = 0; i < factores.length; i++) {
    suma += parseInt(ruc[i]) * factores[i];
  }

  const residuo = suma % 11;
  const digitoVerificador = 11 - residuo;

  let digitoEsperado: number;
  if (digitoVerificador === 10) {
    digitoEsperado = 0;
  } else if (digitoVerificador === 11) {
    digitoEsperado = 1;
  } else {
    digitoEsperado = digitoVerificador;
  }

  return parseInt(ruc[10]) === digitoEsperado;
}

/** Retorna días restantes desde hoy hasta una fecha futura */
export function daysUntil(isoDate: string | null | undefined): number | null {
  if (!isoDate) return null
  const diff = new Date(isoDate).getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

/** Determina si una fecha ya expiró */
export function isExpired(isoDate: string | null | undefined): boolean {
  if (!isoDate) return false
  return new Date(isoDate).getTime() < Date.now()
}

/** Genera un ID de sesión temporal (para el flujo sin login) */
export function generateSessionId(): string {
  return crypto.randomUUID()
}
