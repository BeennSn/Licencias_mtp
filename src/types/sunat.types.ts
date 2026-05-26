// Respuesta de la API SUNAT (adaptado a APIs públicas como apiperu.dev / consultaruc.com)

export interface SunatRucResponse {
  ruc: string
  razonSocial: string
  nombreComercial: string | null
  estadoContribuyente: string   // 'ACTIVO' | 'BAJA DE OFICIO' | ...
  condicionContribuyente: string // 'HABIDO' | 'NO HABIDO' | ...
  ubigeo: string                // Código UBIGEO (130xxx = La Libertad / Trujillo)
  departamento: string
  provincia: string
  distrito: string
  direccion: string
  actividadEconomica: string    // CIIU
  tipoContribuyente: string     // Tipo de sociedad
}

export interface SunatValidationResult {
  valid: boolean
  ruc: string
  data: SunatRucResponse | null
  error?: string
}
