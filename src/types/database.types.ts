export type UserRole = 'contribuyente' | 'inspector' | 'admin'

export type ApplicationStatus =
  | 'PENDIENTE_PAGO'
  | 'PAGADO'
  | 'EN_INSPECCION'
  | 'APROBADO'
  | 'OBSERVADO'
  | 'SEGUNDA_INSPECCION'
  | 'NEGADO_DEFINITIVO'
  | 'RENOVACION_PENDIENTE'

export type InspectionResult = 'APROBADO' | 'OBSERVADO' | 'NEGADO_DEFINITIVO'

// ─── Tablas ──────────────────────────────────────────────────────────────────

export interface Profile {
  id: string
  email: string
  role: UserRole
  ruc: string | null
  full_name: string | null
  phone: string | null
  created_at: string
  updated_at: string
}

export interface Application {
  id: string
  user_id: string | null
  ruc: string
  business_name: string
  fiscal_address: string
  economic_activity: string | null
  business_type: string | null
  area_m2: number | null
  document_url: string | null
  license_pdf_url: string | null
  license_qr_url: string | null
  tracking_code: string | null
  status: ApplicationStatus
  mp_preference_id: string | null
  mp_payment_id: string | null
  mp_payment_status: string | null
  payment_amount: number
  paid_at: string | null
  approved_at: string | null
  expires_at: string | null
  renewal_notified_at: string | null
  observation_notes: string | null
  observation_deadline: string | null
  created_at: string
  updated_at: string
}

export interface Inspection {
  id: string
  application_id: string
  inspector_id: string
  attempt_number: 1 | 2
  scheduled_date: string
  conducted_at: string | null
  result: InspectionResult | null
  comments: string | null
  photo_urls: string[] | null
  created_at: string
  updated_at: string
}

export interface AuditLog {
  id: number
  application_id: string
  actor_id: string | null
  previous_status: ApplicationStatus | null
  new_status: ApplicationStatus
  metadata: Record<string, unknown> | null
  created_at: string
}

export interface Holiday {
  holiday_date: string
  description: string
}

// ─── Tipos de base de datos para Supabase client ─────────────────────────────

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at' | 'updated_at'>
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>
      }
      applications: {
        Row: Application
        Insert: Omit<Application, 'id' | 'created_at' | 'updated_at' | 'tracking_code' | 'paid_at' | 'approved_at' | 'expires_at'>
        Update: Partial<Omit<Application, 'id' | 'created_at'>>
      }
      inspections: {
        Row: Inspection
        Insert: Omit<Inspection, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Inspection, 'id' | 'created_at'>>
      }
      audit_log: {
        Row: AuditLog
        Insert: never // Solo via trigger
        Update: never
      }
      holidays: {
        Row: Holiday
        Insert: Holiday
        Update: Partial<Holiday>
      }
    }
    Views: {
      license_verification: {
        Row: {
          tracking_code: string
          business_name: string
          fiscal_address: string
          status: ApplicationStatus
          approved_at: string | null
          expires_at: string | null
          license_qr_url: string | null
        }
      }
    }
    Enums: {
      application_status: ApplicationStatus
      user_role: UserRole
    }
  }
}
