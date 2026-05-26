'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { formatSoles } from '@/lib/utils/formatters'
import { LICENCIA_AMOUNT } from '@/lib/utils/stateMachine'
import {
  Building2, MapPin, FileText, Shield,
  CreditCard, Smartphone, ArrowRight,
  CheckCircle, Loader2, AlertTriangle, RefreshCw
} from 'lucide-react'

// ─── Tipos del Brick de MP ────────────────────────────────────────────────────
declare global {
  interface Window {
    MercadoPago: new (publicKey: string, options?: { locale: string }) => {
      bricks: () => MpBricksBuilder
    }
  }
}
interface MpBricksBuilder {
  create: (
    type: string,
    containerId: string,
    config: Record<string, unknown>
  ) => Promise<MpBrickController>
}
interface MpBrickController {
  unmount: () => void
  getFormData: () => Promise<Record<string, unknown>>
  submit: () => Promise<void>
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface PaymentTabsProps {
  applicationId: string
  businessName: string
  ruc: string
  address: string
  documentUploaded: boolean
}

type Tab = 'card' | 'yape'
type Status = 'idle' | 'loading' | 'success' | 'error' | 'pending'

// ─── Componente principal ─────────────────────────────────────────────────────
export function PaymentTabs({
  applicationId,
  businessName,
  ruc,
  address,
  documentUploaded,
}: PaymentTabsProps) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('card')
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [trackingCode, setTrackingCode] = useState<string | null>(null)
  const brickRef = useRef<MpBrickController | null>(null)
  const [brickReady, setBrickReady] = useState(false)
  const publicKey = process.env.NEXT_PUBLIC_MP_PUBLIC_KEY ?? ''

  // ── Inyectar SDK de MP ────────────────────────────────────────────────────
  useEffect(() => {
    if (document.getElementById('mp-sdk')) return
    const script = document.createElement('script')
    script.id = 'mp-sdk'
    script.src = 'https://sdk.mercadopago.com/js/v2'
    script.async = true
    document.head.appendChild(script)
  }, [])

  // ── Montar Brick de tarjeta ───────────────────────────────────────────────
  const mountCardBrick = useCallback(async () => {
    if (!window.MercadoPago || !publicKey) return
    if (brickRef.current) {
      brickRef.current.unmount()
      brickRef.current = null
    }
    setBrickReady(false)

    try {
      const mp = new window.MercadoPago(publicKey, { locale: 'es-PE' })
      const bricks = mp.bricks()

      const controller = await bricks.create('cardPayment', 'mp-card-brick', {
        initialization: {
          amount: LICENCIA_AMOUNT,
          payer: { email: '' },
        },
        customization: {
          paymentMethods: { maxInstallments: 1 },
          visual: {
            style: {
              theme: 'dark',
              customVariables: {
                baseColor: '#f59e0b',
                buttonBackground: 'linear-gradient(90deg, #f59e0b, #fbbf24)',
                buttonTextColor: '#0a0f1e',
                inputBackgroundColor: '#0f172a',
                inputBorderColor: '#334155',
                inputFocusedBorderColor: '#f59e0b',
                labelColor: '#94a3b8',
                inputTextColor: '#f1f5f9',
                formBackgroundColor: 'transparent',
                baseColorSecondVariant: '#334155',
              },
            },
          },
        },
        callbacks: {
          onReady: () => setBrickReady(true),
          onError: (err: unknown) => {
            console.error('[Brick error]', err)
          },
          onSubmit: async (formData: Record<string, unknown>) => {
            await processPayment({
              token: formData.token as string,
              paymentMethodId: formData.payment_method_id as string,
              issuerId: formData.issuer_id as string,
              installments: formData.installments as number,
              payerEmail: (formData.payer as { email?: string })?.email,
            })
          },
        },
      })

      brickRef.current = controller
    } catch (err) {
      console.error('[mountCardBrick]', err)
    }
  }, [publicKey])

  // ── Esperar SDK y montar en tab card ─────────────────────────────────────
  useEffect(() => {
    if (tab !== 'card' || !documentUploaded || status === 'success') return

    const tryMount = () => {
      if (window.MercadoPago) {
        mountCardBrick()
      } else {
        setTimeout(tryMount, 300)
      }
    }
    tryMount()

    return () => {
      brickRef.current?.unmount()
      brickRef.current = null
      setBrickReady(false)
    }
  }, [tab, documentUploaded, status, mountCardBrick])

  // ── Procesar pago genérico ────────────────────────────────────────────────
  const processPayment = async (payload: Record<string, unknown>) => {
    setStatus('loading')
    setErrorMsg(null)

    try {
      const res = await fetch('/api/mercadopago/procesar-pago', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId, ...payload }),
      })
      const data = await res.json()

      if (res.ok && data.success && data.trackingCode) {
        setTrackingCode(data.trackingCode)
        setStatus('success')
        sessionStorage.removeItem('mpt_application_id')
        sessionStorage.removeItem('mpt_sunat_data')
        sessionStorage.removeItem('mpt_doc_url')
        setTimeout(() => router.push(`/verificar/${data.trackingCode}`), 3000)
        return
      }

      if (data.status === 'pending' || data.status === 'in_process') {
        setStatus('pending')
        return
      }

      setErrorMsg(data.error ?? 'El pago fue rechazado. Verifica tus datos e intenta nuevamente.')
      setStatus('error')
    } catch {
      setErrorMsg('Error de conexión. Por favor intenta nuevamente.')
      setStatus('error')
    }
  }

  // ── Éxito ─────────────────────────────────────────────────────────────────
  if (status === 'success') {
    return (
      <div className="space-y-6">
        <ResumenTramite businessName={businessName} ruc={ruc} address={address} documentUploaded={documentUploaded} />
        <Card gold className="text-center space-y-5 py-8">
          <div className="mx-auto w-20 h-20 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
            <CheckCircle size={40} className="text-emerald-400" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-white">¡Pago confirmado!</h3>
            <p className="text-sm text-slate-400">Tu licencia está siendo procesada.</p>
          </div>
          {trackingCode && (
            <div className="bg-white/5 border border-amber-500/20 rounded-2xl p-4 inline-block mx-auto">
              <p className="text-xs text-slate-400 mb-1">Código de seguimiento</p>
              <p className="text-2xl font-bold tracking-widest gradient-text">{trackingCode}</p>
            </div>
          )}
          <p className="text-xs text-slate-500 flex items-center justify-center gap-2">
            <Loader2 size={12} className="animate-spin" />
            Redirigiendo a tu licencia...
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Resumen */}
      <ResumenTramite businessName={businessName} ruc={ruc} address={address} documentUploaded={documentUploaded} />

      {/* Detalle de cobro */}
      <Card gold>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-slate-300">Licencia de Funcionamiento</span>
          <span className="text-2xl font-bold gradient-text">{formatSoles(LICENCIA_AMOUNT)}</span>
        </div>
        <div className="border-t border-amber-500/20 pt-3 space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">TUPA — Derecho de trámite</span>
            <span className="text-white font-semibold">{formatSoles(LICENCIA_AMOUNT)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">IGV</span>
            <span className="text-slate-400">Incluido</span>
          </div>
        </div>
      </Card>

      {/* Aviso si falta documento */}
      {!documentUploaded && (
        <div className="flex gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30">
          <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-300">
            Debes subir el plano del local antes de proceder al pago.
          </p>
        </div>
      )}

      {/* Pestañas de método de pago */}
      {documentUploaded && (
        <div className="space-y-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
            Selecciona un método de pago
          </p>

          {/* Selector de tabs */}
          <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl glass border border-white/10">
            <TabBtn
              active={tab === 'card'}
              onClick={() => setTab('card')}
              icon={<CreditCard size={16} />}
              label="Tarjeta / Transferencia"
            />
            <TabBtn
              active={tab === 'yape'}
              onClick={() => setTab('yape')}
              icon={<Smartphone size={16} />}
              label="Yape"
            />
          </div>

          {/* Contenido del tab */}
          {tab === 'card' && (
            <div className="space-y-4">
              {/* Brick de MP */}
              <div className="relative">
                {!brickReady && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-[#0a0f1e]/80 z-10 min-h-[200px]">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 size={28} className="animate-spin text-amber-400" />
                      <p className="text-sm text-slate-400">Cargando formulario de pago...</p>
                    </div>
                  </div>
                )}
                <div
                  id="mp-card-brick"
                  className="min-h-[200px]"
                />
              </div>

              {status === 'loading' && (
                <div className="flex items-center justify-center gap-3 py-4">
                  <Loader2 size={20} className="animate-spin text-amber-400" />
                  <span className="text-sm text-slate-400">Procesando pago...</span>
                </div>
              )}

              {status === 'pending' && (
                <div className="flex gap-3 p-4 rounded-2xl bg-blue-500/10 border border-blue-500/30">
                  <AlertTriangle size={18} className="text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-blue-300">Pago en proceso</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Tu pago está siendo verificado. Puedes revisar el estado en tu panel más tarde.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'yape' && (
            <YapeAprobacionForm
              applicationId={applicationId}
              businessName={businessName}
              onProcess={processPayment}
              status={status}
              errorMsg={errorMsg}
              onRetry={() => { setStatus('idle'); setErrorMsg(null) }}
            />
          )}

          {/* Error global */}
          {status === 'error' && errorMsg && tab === 'card' && (
            <div className="flex gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/30">
              <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-red-300">Pago rechazado</p>
                <p className="text-xs text-slate-400 mt-1">{errorMsg}</p>
              </div>
              <button
                onClick={() => { setStatus('idle'); setErrorMsg(null) }}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-white shrink-0"
              >
                <RefreshCw size={14} /> Reintentar
              </button>
            </div>
          )}
        </div>
      )}

      {/* Footer de seguridad */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Shield size={14} className="text-emerald-400" />
        <span>
          Pago procesado por{' '}
          <strong className="text-slate-300">Mercado Pago</strong>.
          MPT no almacena datos de tu tarjeta.
        </span>
      </div>
    </div>
  )
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function TabBtn({
  active, onClick, icon, label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${
        active
          ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-slate-900 shadow-[0_0_20px_rgba(245,158,11,0.3)]'
          : 'text-slate-400 hover:text-white hover:bg-white/5'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}

function ResumenTramite({
  businessName, ruc, address, documentUploaded,
}: {
  businessName: string; ruc: string; address: string; documentUploaded: boolean
}) {
  return (
    <Card>
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
        Resumen del trámite
      </h3>
      <div className="space-y-3">
        <div className="flex gap-3">
          <Building2 size={16} className="text-amber-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs text-slate-500">Negocio</p>
            <p className="text-sm font-semibold text-white">{businessName}</p>
            <p className="text-xs text-slate-400">RUC {ruc}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <MapPin size={16} className="text-amber-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs text-slate-500">Domicilio fiscal</p>
            <p className="text-sm text-white">{address}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <FileText size={16} className="text-amber-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs text-slate-500">Plano del local</p>
            <p className={`text-sm ${documentUploaded ? 'text-emerald-400' : 'text-red-400'}`}>
              {documentUploaded ? '✓ Subido correctamente' : '✗ Pendiente de subida'}
            </p>
          </div>
        </div>
      </div>
    </Card>
  )
}

// ─── Formulario Yape con código de aprobación ─────────────────────────────────
function YapeAprobacionForm({
  applicationId: _applicationId,
  businessName,
  onProcess,
  status,
  errorMsg,
  onRetry,
}: {
  applicationId: string
  businessName: string
  onProcess: (payload: Record<string, unknown>) => void
  status: Status
  errorMsg: string | null
  onRetry: () => void
}) {
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [tokenizing, setTokenizing] = useState(false)
  const [tokenError, setTokenError] = useState<string | null>(null)
  const publicKey = process.env.NEXT_PUBLIC_MP_PUBLIC_KEY ?? ''

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length !== 9) return
    if (otp.length !== 6) return

    setTokenizing(true)
    setTokenError(null)

    try {
      // Tokenizar el pago Yape usando el SDK de MP (phone + OTP → token de un solo uso)
      if (!window.MercadoPago) {
        throw new Error('SDK de Mercado Pago no cargado. Recarga la página.')
      }

      const mp = new window.MercadoPago(publicKey, { locale: 'es-PE' })

      // Crear token Yape: phone_number + otp → token
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mpAny = mp as any
      let yapeToken: string | null = null

      if (mpAny.yape) {
        // API directa de Yape si está disponible
        const tokenRes = await mpAny.yape({ phoneNumber: cleaned, otp })
        yapeToken = tokenRes?.id ?? null
      } else if (mpAny.createCardToken) {
        // Fallback genérico
        const tokenRes = await mpAny.createCardToken({
          phoneNumber: cleaned,
          otp,
        })
        yapeToken = tokenRes?.id ?? null
      }

      if (yapeToken) {
        // Tenemos token → enviamos al backend con token
        onProcess({
          token: yapeToken,
          paymentMethodId: 'yape',
          installments: 1,
          payerEmail: 'contribuyente@mpt.gob.pe',
        })
      } else {
        // Sin token disponible → enviar directo con phone + otp (el backend lo procesa)
        onProcess({
          phoneNumber: cleaned,
          otp,
          payerEmail: 'contribuyente@mpt.gob.pe',
        })
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al procesar. Intenta nuevamente.'
      setTokenError(msg)
    } finally {
      setTokenizing(false)
    }
  }

  if (status === 'success') return null

  const isLoading = status === 'loading' || tokenizing

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Instrucciones */}
      <div className="rounded-2xl bg-purple-500/10 border border-purple-500/20 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Smartphone size={18} className="text-purple-400" />
          <p className="text-sm font-semibold text-white">Pagar con Yape</p>
        </div>
        <ol className="text-xs text-slate-400 space-y-1.5 list-none">
          <li className="flex gap-2">
            <span className="text-purple-400 font-bold shrink-0">1.</span>
            Abre la app de <strong className="text-white">Yape</strong> en tu celular.
          </li>
          <li className="flex gap-2">
            <span className="text-purple-400 font-bold shrink-0">2.</span>
            Toca <strong className="text-white">«Más»</strong> → <strong className="text-white">«Código de aprobación»</strong>.
          </li>
          <li className="flex gap-2">
            <span className="text-purple-400 font-bold shrink-0">3.</span>
            Ingresa el monto <strong className="text-white">{formatSoles(LICENCIA_AMOUNT)}</strong> y acepta.
          </li>
          <li className="flex gap-2">
            <span className="text-purple-400 font-bold shrink-0">4.</span>
            Escribe tu número Yape y el código de 6 dígitos abajo.
          </li>
        </ol>
        <div className="text-center bg-white/5 rounded-xl p-3">
          <p className="text-xs text-slate-500">Monto a pagar</p>
          <p className="text-xl font-bold gradient-text">{formatSoles(LICENCIA_AMOUNT)}</p>
          <p className="text-xs text-slate-500 mt-0.5">{businessName}</p>
        </div>
      </div>

      {/* Número de celular */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider" htmlFor="yape-phone">
          Número Yape (9 dígitos)
        </label>
        <input
          id="yape-phone"
          type="tel"
          inputMode="numeric"
          maxLength={9}
          value={phone}
          onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 9))}
          placeholder="9XXXXXXXX"
          className="w-full rounded-xl bg-[#0f172a] border border-[#334155] text-white placeholder-slate-600 px-4 py-3 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/30 transition-colors font-mono text-center text-lg tracking-widest"
          disabled={isLoading}
          required
        />
      </div>

      {/* Código de aprobación */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider" htmlFor="yape-otp">
          Código de aprobación (6 dígitos)
        </label>
        <input
          id="yape-otp"
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={otp}
          onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="——————"
          className="w-full rounded-xl bg-[#0f172a] border border-[#334155] text-white placeholder-slate-600 px-4 py-3 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500/30 transition-colors font-mono text-center text-2xl tracking-[0.5em]"
          disabled={isLoading}
          required
        />
        <p className="text-xs text-slate-500 text-center">
          El código expira en pocos minutos. Úsalo inmediatamente.
        </p>
      </div>

      {/* Errores */}
      {(status === 'error' && errorMsg || tokenError) && (
        <div className="flex gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/30">
          <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-300">Pago rechazado</p>
            <p className="text-xs text-slate-400 mt-1">{tokenError ?? errorMsg}</p>
          </div>
          <button
            type="button"
            onClick={() => { onRetry(); setTokenError(null) }}
            className="text-xs text-slate-400 hover:text-white shrink-0 flex items-center gap-1"
          >
            <RefreshCw size={14} /> Reintentar
          </button>
        </div>
      )}

      {/* Botón */}
      <button
        type="submit"
        id="btn-pagar-yape"
        disabled={phone.length !== 9 || otp.length !== 6 || isLoading}
        className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 to-purple-500 px-6 py-4 text-base font-bold text-white hover:opacity-90 hover:shadow-[0_0_30px_rgba(139,92,246,0.4)] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            {tokenizing ? 'Verificando código...' : 'Procesando pago Yape...'}
          </>
        ) : (
          <>
            <Smartphone size={18} />
            Pagar con Yape
            <ArrowRight size={18} />
          </>
        )}
      </button>
    </form>
  )
}
