-- ============================================================
-- SISTEMA AUTOMATIZADO DE LICENCIAS MUNICIPALES - TRUJILLO
-- Supabase / PostgreSQL Schema
-- Versión: 1.0.0-MVP
-- ============================================================

-- ─────────────────────────────────────────────
-- 0. EXTENSIONES
-- ─────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────────
-- 1. ENUM: MÁQUINA DE ESTADOS
-- ─────────────────────────────────────────────
CREATE TYPE application_status AS ENUM (
  'PENDIENTE_PAGO',       -- RUC validado + plano subido, esperando pago
  'PAGADO',               -- Pago exitoso en Checkout Pro; se genera código TRU
  'EN_INSPECCION',        -- Inspector asignado, 1ra visita agendada
  'APROBADO',             -- Visita aprobada; se emite licencia PDF+QR (vigencia 1 año)
  'OBSERVADO',            -- Falla 1ra visita; 30 días hábiles para subsanar
  'SEGUNDA_INSPECCION',   -- 2da visita agendada automáticamente
  'NEGADO_DEFINITIVO',    -- Falla 2da visita; proceso cerrado
  'RENOVACION_PENDIENTE'  -- Licencia vencida (>1 año); requiere declaración de cambios
);

CREATE TYPE user_role AS ENUM (
  'contribuyente',
  'inspector',
  'admin'
);

-- ─────────────────────────────────────────────
-- 2. TABLA: profiles
--    Extiende auth.users de Supabase Auth
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT        NOT NULL,
  role        user_role   NOT NULL DEFAULT 'contribuyente',
  ruc         TEXT        UNIQUE,                 -- Solo contribuyentes; NULL para inspectores/admins
  full_name   TEXT,
  phone       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT profiles_ruc_format CHECK (ruc IS NULL OR ruc ~ '^\d{11}$')
);

COMMENT ON TABLE public.profiles IS
  'Extiende auth.users. Almacena el rol y datos del contribuyente/inspector/admin.';

-- ─────────────────────────────────────────────
-- 3. TABLA: applications
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.applications (
  id                  UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID            REFERENCES public.profiles(id) ON DELETE SET NULL,

  -- Datos del negocio (obtenidos de SUNAT + form)
  ruc                 TEXT            NOT NULL,
  business_name       TEXT            NOT NULL,
  fiscal_address      TEXT            NOT NULL,
  economic_activity   TEXT,           -- CIIU / actividad principal (SUNAT)
  business_type       TEXT,           -- Tipo de sociedad (SUNAT)
  area_m2             NUMERIC(10,2),  -- Área del local en m²

  -- Documentación
  document_url        TEXT,           -- URL del plano en Supabase Storage
  license_pdf_url     TEXT,           -- URL del PDF de licencia emitida
  license_qr_url      TEXT,           -- URL del QR de verificación

  -- Identificación y estado
  tracking_code       TEXT            UNIQUE,  -- TRU-YYYY-NNNNNN (generado al pagar)
  status              application_status NOT NULL DEFAULT 'PENDIENTE_PAGO',

  -- Pago (Mercado Pago)
  mp_preference_id    TEXT,           -- ID de preferencia Checkout Pro
  mp_payment_id       TEXT,           -- ID del pago confirmado
  mp_payment_status   TEXT,           -- Estado raw de MP (approved, pending, rejected)
  payment_amount      NUMERIC(10,2)   DEFAULT 180.00,
  paid_at             TIMESTAMPTZ,

  -- Vigencia
  approved_at         TIMESTAMPTZ,    -- Cuando status → APROBADO
  expires_at          TIMESTAMPTZ,    -- approved_at + 1 año (calculado por trigger)
  renewal_notified_at TIMESTAMPTZ,    -- Cuándo se envió la notif de renovación

  -- Observaciones (si aplica)
  observation_notes   TEXT,           -- Comentarios del inspector al observar
  observation_deadline TIMESTAMPTZ,   -- 30 días hábiles desde OBSERVADO

  -- Auditoría
  created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

  CONSTRAINT applications_ruc_format CHECK (ruc ~ '^\d{11}$'),
  CONSTRAINT applications_area_positive CHECK (area_m2 IS NULL OR area_m2 > 0)
);

COMMENT ON TABLE public.applications IS
  'Solicitudes de licencia. Sigue la máquina de estados en application_status.';
COMMENT ON COLUMN public.applications.tracking_code IS
  'Formato: TRU-YYYY-NNNNNN. Generado automáticamente al confirmar pago.';
COMMENT ON COLUMN public.applications.expires_at IS
  'Vigencia de 1 año desde la aprobación. Trigger la calcula automáticamente.';

-- Índices de rendimiento
CREATE INDEX idx_applications_user_id   ON public.applications(user_id);
CREATE INDEX idx_applications_ruc        ON public.applications(ruc);
CREATE INDEX idx_applications_status     ON public.applications(status);
CREATE INDEX idx_applications_tracking   ON public.applications(tracking_code);
CREATE INDEX idx_applications_expires    ON public.applications(expires_at)
  WHERE status = 'APROBADO';

-- ─────────────────────────────────────────────
-- 4. TABLA: inspections
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.inspections (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id  UUID        NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  inspector_id    UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,

  attempt_number  SMALLINT    NOT NULL CHECK (attempt_number IN (1, 2)),
  scheduled_date  DATE        NOT NULL,
  conducted_at    TIMESTAMPTZ,         -- Cuándo se realizó efectivamente
  result          TEXT        CHECK (result IN ('APROBADO', 'OBSERVADO', 'NEGADO_DEFINITIVO')),
  comments        TEXT,                -- Observaciones escritas del inspector
  photo_urls      TEXT[],              -- Fotos de la inspección (Supabase Storage)

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT inspections_unique_attempt
    UNIQUE (application_id, attempt_number)
);

COMMENT ON TABLE public.inspections IS
  'Visitas de inspección. Máximo 2 intentos por solicitud.';

CREATE INDEX idx_inspections_application ON public.inspections(application_id);
CREATE INDEX idx_inspections_inspector   ON public.inspections(inspector_id);
CREATE INDEX idx_inspections_scheduled   ON public.inspections(scheduled_date);

-- ─────────────────────────────────────────────
-- 5. TABLA: audit_log (inmutable)
--    Registra cada cambio de estado para trazabilidad
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_log (
  id              BIGSERIAL   PRIMARY KEY,
  application_id  UUID        NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  actor_id        UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  previous_status application_status,
  new_status      application_status NOT NULL,
  metadata        JSONB,      -- Datos adicionales (payment_id, inspection_id, etc.)
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.audit_log IS
  'Log inmutable de transiciones de estado. No tiene UPDATE ni DELETE permitidos.';

CREATE INDEX idx_audit_application ON public.audit_log(application_id);
CREATE INDEX idx_audit_created     ON public.audit_log(created_at DESC);

-- ─────────────────────────────────────────────
-- 6. FUNCIONES AUXILIARES
-- ─────────────────────────────────────────────

-- 6.1 Generador de código de seguimiento TRU-YYYY-NNNNNN
CREATE OR REPLACE FUNCTION public.generate_tracking_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_year    TEXT;
  v_seq     BIGINT;
  v_code    TEXT;
BEGIN
  v_year := TO_CHAR(NOW(), 'YYYY');

  -- Secuencia por año: cuenta solicitudes PAGADAS del año en curso
  SELECT COUNT(*) + 1
    INTO v_seq
    FROM public.applications
   WHERE tracking_code LIKE 'TRU-' || v_year || '-%'
     AND status <> 'PENDIENTE_PAGO';

  v_code := 'TRU-' || v_year || '-' || LPAD(v_seq::TEXT, 6, '0');

  -- Garantizar unicidad ante concurrencia
  WHILE EXISTS (SELECT 1 FROM public.applications WHERE tracking_code = v_code) LOOP
    v_seq  := v_seq + 1;
    v_code := 'TRU-' || v_year || '-' || LPAD(v_seq::TEXT, 6, '0');
  END LOOP;

  RETURN v_code;
END;
$$;

-- 6.2 Cálculo de días hábiles peruanos (excluye sáb, dom y feriados nacionales fijos)
--     Feriados variables (Semana Santa, etc.) deben gestionarse en tabla separada.
CREATE TABLE IF NOT EXISTS public.holidays (
  holiday_date DATE PRIMARY KEY,
  description  TEXT NOT NULL
);

COMMENT ON TABLE public.holidays IS
  'Feriados nacionales y locales de Perú. Administrar desde el panel de admin.';

-- Feriados fijos 2025-2026 (actualizar anualmente)
INSERT INTO public.holidays (holiday_date, description) VALUES
  ('2026-01-01', 'Año Nuevo'),
  ('2026-05-01', 'Día del Trabajo'),
  ('2026-06-07', 'Batalla de Arica'),
  ('2026-06-29', 'San Pedro y San Pablo'),
  ('2026-07-28', 'Fiestas Patrias'),
  ('2026-07-29', 'Fiestas Patrias'),
  ('2026-08-30', 'Santa Rosa de Lima'),
  ('2026-10-08', 'Combate de Angamos'),
  ('2026-11-01', 'Todos los Santos'),
  ('2026-12-08', 'Inmaculada Concepción'),
  ('2026-12-25', 'Navidad')
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.add_business_days(
  p_start_date TIMESTAMPTZ,
  p_days       INT
)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
AS $$
DECLARE
  v_date  DATE := p_start_date::DATE;
  v_count INT  := 0;
BEGIN
  WHILE v_count < p_days LOOP
    v_date := v_date + INTERVAL '1 day';

    -- Omitir sábado (6) y domingo (0)
    IF EXTRACT(DOW FROM v_date) IN (0, 6) THEN
      CONTINUE;
    END IF;

    -- Omitir feriados registrados
    IF EXISTS (SELECT 1 FROM public.holidays WHERE holiday_date = v_date) THEN
      CONTINUE;
    END IF;

    v_count := v_count + 1;
  END LOOP;

  -- Retorna al final del día hábil calculado
  RETURN (v_date + INTERVAL '23 hours 59 minutes 59 seconds')::TIMESTAMPTZ;
END;
$$;

-- 6.3 Trigger: actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

-- 6.4 Trigger: lógica de transición de estados en applications
CREATE OR REPLACE FUNCTION public.handle_application_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Solo actuar si el status realmente cambió
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- ── Transición → PAGADO ──────────────────────────────────
  IF NEW.status = 'PAGADO' AND OLD.status = 'PENDIENTE_PAGO' THEN
    NEW.tracking_code := public.generate_tracking_code();
    NEW.paid_at       := NOW();
  END IF;

  -- ── Transición → APROBADO ────────────────────────────────
  IF NEW.status = 'APROBADO' THEN
    NEW.approved_at := NOW();
    NEW.expires_at  := NOW() + INTERVAL '1 year';
  END IF;

  -- ── Transición → OBSERVADO ───────────────────────────────
  IF NEW.status = 'OBSERVADO' THEN
    -- 30 días hábiles peruanos para subsanar
    NEW.observation_deadline := public.add_business_days(NOW(), 30);
  END IF;

  -- ── Transición → RENOVACION_PENDIENTE ───────────────────
  IF NEW.status = 'RENOVACION_PENDIENTE' THEN
    NEW.renewal_notified_at := NOW();
  END IF;

  -- ── Registrar en audit_log ───────────────────────────────
  INSERT INTO public.audit_log (
    application_id,
    actor_id,
    previous_status,
    new_status,
    metadata
  ) VALUES (
    NEW.id,
    auth.uid(),
    OLD.status,
    NEW.status,
    jsonb_build_object(
      'mp_payment_id',     NEW.mp_payment_id,
      'mp_payment_status', NEW.mp_payment_status,
      'timestamp',         NOW()
    )
  );

  RETURN NEW;
END;
$$;

-- ─────────────────────────────────────────────
-- 7. TRIGGERS
-- ─────────────────────────────────────────────

-- updated_at en las tres tablas principales
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_applications_updated_at
  BEFORE UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_inspections_updated_at
  BEFORE UPDATE ON public.inspections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Lógica de estado en applications
CREATE TRIGGER trg_applications_status_change
  BEFORE UPDATE OF status ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.handle_application_status_change();

-- Auto-crear profile al registrarse con Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'contribuyente')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─────────────────────────────────────────────
-- 8. ROW LEVEL SECURITY (RLS)
-- ─────────────────────────────────────────────

-- Habilitar RLS en todas las tablas
ALTER TABLE public.profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspections   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holidays      ENABLE ROW LEVEL SECURITY;

-- ─── Helper: obtener rol del usuario actual ───────────────
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- ────────────────────────────────────────────
-- 8.1 POLÍTICAS: profiles
-- ────────────────────────────────────────────

-- Contribuyente: ve y edita solo su propio perfil
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    -- No puede cambiarse el rol a sí mismo
    role = (SELECT role FROM public.profiles WHERE id = auth.uid())
  );

-- Inspector: ve perfiles de contribuyentes (para sus aplicaciones)
CREATE POLICY "profiles_inspector_select"
  ON public.profiles FOR SELECT
  USING (public.get_my_role() = 'inspector');

-- Admin: acceso total a profiles
CREATE POLICY "profiles_admin_all"
  ON public.profiles FOR ALL
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

-- ────────────────────────────────────────────
-- 8.2 POLÍTICAS: applications
-- ────────────────────────────────────────────

-- Contribuyente: ve y crea solo sus propias solicitudes
CREATE POLICY "applications_contribuyente_select"
  ON public.applications FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.get_my_role() IS NULL  -- Acceso pre-login (verificación pública de tracking_code)
  );

CREATE POLICY "applications_contribuyente_insert"
  ON public.applications FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    OR user_id IS NULL  -- Flujo sin login: se asocia el user_id después del pago
  );

CREATE POLICY "applications_contribuyente_update_own"
  ON public.applications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (
    -- Contribuyente solo puede actualizar campos de documentación, no el status
    user_id = auth.uid()
  );

-- Inspector: ve todas las solicitudes en estado de inspección
CREATE POLICY "applications_inspector_select"
  ON public.applications FOR SELECT
  USING (
    public.get_my_role() = 'inspector'
    AND status IN ('EN_INSPECCION', 'OBSERVADO', 'SEGUNDA_INSPECCION')
  );

-- Inspector: puede actualizar status dentro de su dominio
CREATE POLICY "applications_inspector_update"
  ON public.applications FOR UPDATE
  USING (public.get_my_role() = 'inspector')
  WITH CHECK (
    public.get_my_role() = 'inspector'
    AND status IN ('APROBADO', 'OBSERVADO', 'SEGUNDA_INSPECCION', 'NEGADO_DEFINITIVO')
  );

-- Admin: acceso total
CREATE POLICY "applications_admin_all"
  ON public.applications FOR ALL
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

-- Verificación pública de código de seguimiento (sin autenticación)
CREATE POLICY "applications_public_tracking"
  ON public.applications FOR SELECT
  USING (tracking_code IS NOT NULL);

-- ────────────────────────────────────────────
-- 8.3 POLÍTICAS: inspections
-- ────────────────────────────────────────────

-- Contribuyente: ve las inspecciones de sus propias solicitudes
CREATE POLICY "inspections_contribuyente_select"
  ON public.inspections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.applications a
      WHERE a.id = inspections.application_id
        AND a.user_id = auth.uid()
    )
  );

-- Inspector: ve y gestiona sus propias inspecciones
CREATE POLICY "inspections_inspector_select"
  ON public.inspections FOR SELECT
  USING (
    inspector_id = auth.uid()
    OR public.get_my_role() = 'inspector'
  );

CREATE POLICY "inspections_inspector_insert"
  ON public.inspections FOR INSERT
  WITH CHECK (
    public.get_my_role() IN ('inspector', 'admin')
    AND inspector_id = auth.uid()
  );

CREATE POLICY "inspections_inspector_update"
  ON public.inspections FOR UPDATE
  USING (inspector_id = auth.uid() AND public.get_my_role() = 'inspector')
  WITH CHECK (inspector_id = auth.uid());

-- Admin: acceso total
CREATE POLICY "inspections_admin_all"
  ON public.inspections FOR ALL
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

-- ────────────────────────────────────────────
-- 8.4 POLÍTICAS: audit_log (solo lectura)
-- ────────────────────────────────────────────

-- Contribuyente: ve el log de sus propias solicitudes
CREATE POLICY "audit_contribuyente_select"
  ON public.audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.applications a
      WHERE a.id = audit_log.application_id
        AND a.user_id = auth.uid()
    )
  );

-- Inspector y Admin: ven todo el log
CREATE POLICY "audit_staff_select"
  ON public.audit_log FOR SELECT
  USING (public.get_my_role() IN ('inspector', 'admin'));

-- Nadie puede insertar directamente (solo via trigger SECURITY DEFINER)
-- Nadie puede actualizar ni eliminar registros de auditoría
CREATE POLICY "audit_no_update"
  ON public.audit_log FOR UPDATE
  USING (FALSE);

CREATE POLICY "audit_no_delete"
  ON public.audit_log FOR DELETE
  USING (FALSE);

-- ────────────────────────────────────────────
-- 8.5 POLÍTICAS: holidays
-- ────────────────────────────────────────────

CREATE POLICY "holidays_public_read"
  ON public.holidays FOR SELECT
  USING (TRUE);

CREATE POLICY "holidays_admin_write"
  ON public.holidays FOR ALL
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

-- ─────────────────────────────────────────────
-- 9. VISTAS ÚTILES (sin exponer data sensible)
-- ─────────────────────────────────────────────

-- Vista pública para verificación de licencia por código
CREATE OR REPLACE VIEW public.license_verification AS
  SELECT
    a.tracking_code,
    a.business_name,
    a.fiscal_address,
    a.status,
    a.approved_at,
    a.expires_at,
    a.license_qr_url
  FROM public.applications a
  WHERE a.status = 'APROBADO'
    AND a.tracking_code IS NOT NULL;

COMMENT ON VIEW public.license_verification IS
  'Vista pública para que ciudadanos verifiquen la validez de una licencia mediante su código TRU.';

-- Vista para dashboard del inspector
CREATE OR REPLACE VIEW public.inspector_dashboard AS
  SELECT
    i.id              AS inspection_id,
    i.application_id,
    i.scheduled_date,
    i.attempt_number,
    i.result,
    a.tracking_code,
    a.business_name,
    a.fiscal_address,
    a.document_url,
    a.status          AS application_status,
    p.full_name       AS contribuyente_name,
    p.phone           AS contribuyente_phone
  FROM public.inspections i
  JOIN public.applications a ON a.id = i.application_id
  LEFT JOIN public.profiles p ON p.id = a.user_id
  WHERE i.inspector_id = auth.uid();

COMMENT ON VIEW public.inspector_dashboard IS
  'Vista segura para el inspector: solo ve sus propias inspecciones con datos relevantes.';

-- ─────────────────────────────────────────────
-- FIN DEL SCRIPT
-- ─────────────────────────────────────────────
