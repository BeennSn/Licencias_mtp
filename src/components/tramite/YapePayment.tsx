'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Smartphone, CheckCircle, Loader2, RefreshCw, Copy } from 'lucide-react'
import { formatSoles } from '@/lib/utils/formatters'
import { LICENCIA_AMOUNT } from '@/lib/utils/stateMachine'

interface YapePaymentProps {
  applicationId: string
  businessName: string
  onSuccess: (trackingCode: string) => void
  onBack?: () => void
}

export function YapePayment({ applicationId, businessName, onSuccess, onBack }: YapePaymentProps) {
  const [step, setStep] = useState<'form' | 'qr' | 'polling' | 'done' | 'error'>('form')
  const [qrBase64, setQrBase64] = useState<string | null>(null)
  const [qrText, setQrText] = useState<string | null>(null)
  const [paymentId, setPaymentId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [trackingCode, setTrackingCode] = useState<string | null>(null)

  const handleGenerateQr = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/mercadopago/yape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Error al generar el código Yape')
        setStep('error')
        return
      }

      if (data.qrCodeBase64) {
        setQrBase64(data.qrCodeBase64)
      }
      if (data.qrCodeText) {
        setQrText(data.qrCodeText)
      }
      if (data.paymentId) {
        setPaymentId(data.paymentId)
      }

      setStep('qr')
    } catch {
      setError('Error de red. Intenta nuevamente.')
      setStep('error')
    } finally {
      setLoading(false)
    }
  }

  const startPolling = useCallback(() => {
    if (!paymentId && !applicationId) return

    setStep('polling')

    let attempts = 0
    const MAX_ATTEMPTS = 30

    const poll = async () => {
      attempts++

      try {
        const params = paymentId
          ? `paymentId=${paymentId}`
          : `applicationId=${applicationId}`

        const res = await fetch(`/api/mercadopago/yape?${params}`)
        const data = await res.json()

        if (data.confirmed && data.trackingCode) {
          setTrackingCode(data.trackingCode)
          setStep('done')
          onSuccess(data.trackingCode)
          return
        }

        if (data.status === 'approved') {
          const res2 = await fetch(`/api/mercadopago/yape?applicationId=${applicationId}`)
          const data2 = await res2.json()
          if (data2.confirmed && data2.trackingCode) {
            setTrackingCode(data2.trackingCode)
            setStep('done')
            onSuccess(data2.trackingCode)
            return
          }
        }
      } catch {
        // ignorar error de polling
      }

      if (attempts < MAX_ATTEMPTS) {
        setTimeout(poll, 2000)
      } else {
        setError('El tiempo de espera terminó. Verifica si el pago se realizó en la app de Yape.')
        setStep('error')
      }
    }

    setTimeout(poll, 2000)
  }, [paymentId, applicationId, onSuccess])

  const copyQrText = () => {
    if (qrText) {
      navigator.clipboard.writeText(qrText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleGoBack = () => {
    setStep('form')
    setError(null)
    setQrBase64(null)
    setQrText(null)
    setPaymentId(null)
  }

  if (step === 'done') {
    return (
      <Card gold className="text-center space-y-4">
        <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
          <CheckCircle size={32} className="text-emerald-400" />
        </div>
        <h3 className="text-lg font-semibold text-white">¡Pago Yape confirmado!</h3>
        <p className="text-sm text-slate-400">
          El pago por {businessName} se recibió correctamente.
        </p>
        {trackingCode && (
          <div className="bg-white/5 rounded-lg p-3">
            <p className="text-xs text-slate-400 mb-1">Código de seguimiento</p>
            <p className="text-xl font-bold tracking-widest gradient-text">{trackingCode}</p>
          </div>
        )}
        <p className="text-xs text-slate-500">
          Serás redirigido automáticamente...
        </p>
      </Card>
    )
  }

  if (step === 'polling') {
    return (
      <Card className="text-center space-y-4">
        <Loader2 size={40} className="animate-spin text-amber-400 mx-auto" />
        <h3 className="text-lg font-semibold text-white">Esperando pago Yape...</h3>
        <p className="text-sm text-slate-400">
          Escanea el QR con tu app de Yape para pagar. Estamos verificando el pago cada 2 segundos.
        </p>
        {qrBase64 && (
          <div className="flex justify-center">
            <img
              src={`data:image/png;base64,${qrBase64}`}
              alt="Código QR Yape"
              className="w-48 h-48 rounded-lg"
            />
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={startPolling}
          icon={<RefreshCw size={14} />}
        >
          Reintentar verificación
        </Button>
      </Card>
    )
  }

  if (step === 'error') {
    return (
      <Card className="text-center space-y-4 border-red-500/30 bg-red-500/10">
        <h3 className="text-lg font-semibold text-red-300">Error</h3>
        <p className="text-sm text-red-400/80">{error || 'Ocurrió un error al generar el pago Yape.'}</p>
        <div className="flex gap-2 justify-center">
          <Button variant="secondary" onClick={handleGoBack} icon={<RefreshCw size={14} />}>
            Reintentar
          </Button>
          {onBack && (
            <Button variant="ghost" onClick={onBack}>
              Volver
            </Button>
          )}
        </div>
      </Card>
    )
  }

  return (
    <Card className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
          <Smartphone size={20} className="text-purple-400" />
        </div>
        <div>
          <h3 className="font-semibold text-white">Pagar con Yape</h3>
          <p className="text-xs text-slate-400">Genera un código QR para pagar desde la app Yape</p>
        </div>
      </div>

      <div className="bg-white/5 rounded-lg p-4 space-y-3">
        <p className="text-sm text-slate-400 text-center">
          {formatSoles(LICENCIA_AMOUNT)} — Licencia de Funcionamiento
        </p>

        {qrBase64 && (
          <div className="flex flex-col items-center gap-3">
            <img
              src={`data:image/png;base64,${qrBase64}`}
              alt="Código QR Yape"
              className="w-48 h-48 rounded-lg border border-white/10"
            />
            {qrText && (
              <div className="flex items-center gap-2">
                <code className="text-xs bg-black/30 px-2 py-1 rounded font-mono text-slate-300">
                  {qrText.slice(0, 30)}...
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyQrText}
                  icon={<Copy size={12} />}
                >
                  {copied ? 'Copiado' : 'Copiar'}
                </Button>
              </div>
            )}
            <ol className="text-xs text-slate-400 space-y-1 max-w-sm text-left">
              <li>1. Abre la app de <strong className="text-white">Yape</strong> en tu celular</li>
              <li>2. Toca el botón <strong className="text-white">"Pagar con QR"</strong></li>
              <li>3. Escanea este código</li>
              <li>4. Confirma el pago de <strong className="text-white">{formatSoles(LICENCIA_AMOUNT)}</strong></li>
            </ol>
            <Button
              onClick={startPolling}
              size="lg"
              className="w-full"
              icon={<Smartphone size={16} />}
            >
              Ya pagué — Verificar
            </Button>
          </div>
        )}

        {!qrBase64 && (
          <Button
            onClick={handleGenerateQr}
            loading={loading}
            size="lg"
            className="w-full"
            icon={<Smartphone size={16} />}
          >
            {loading ? 'Generando código QR...' : 'Generar código Yape'}
          </Button>
        )}
      </div>

      <p className="text-xs text-slate-500 text-center">
        Yape es un servicio de <strong className="text-slate-400">Banco de Crédito BCP</strong>.
        Procesado por Mercado Pago.
      </p>
    </Card>
  )
}
