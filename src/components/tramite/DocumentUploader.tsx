'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Upload, FileText, X, CheckCircle, AlertTriangle } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import clsx from 'clsx'

interface DocumentUploaderProps {
  applicationId: string
  onSuccess: (url: string) => void
}

const MAX_SIZE_MB = 10
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']

export function DocumentUploader({ applicationId, onSuccess }: DocumentUploaderProps) {
  const [file, setFile]         = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploaded, setUploaded]  = useState(false)
  const [error, setError]        = useState<string | null>(null)
  const [drag, setDrag]          = useState(false)

  const validate = (f: File): string | null => {
    if (!ALLOWED_TYPES.includes(f.type))
      return 'Solo se aceptan archivos PDF, JPG o PNG.'
    if (f.size > MAX_SIZE_MB * 1024 * 1024)
      return `El archivo no debe superar ${MAX_SIZE_MB} MB.`
    return null
  }

  const handleFile = useCallback((f: File) => {
    const err = validate(f)
    if (err) { setError(err); return }
    setError(null)
    setFile(f)
    setUploaded(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDrag(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) handleFile(dropped)
  }, [handleFile])

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    setError(null)

    try {
      const supabase = createSupabaseBrowserClient()
      const ext      = file.name.split('.').pop()
      const path     = `planos/${applicationId}/plano-${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('documentos')
        .upload(path, file, { cacheControl: '3600', upsert: true })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('documentos')
        .getPublicUrl(path)

      // Actualizar la solicitud con la URL del documento
      await supabase
        .from('applications')
        .update({ document_url: publicUrl })
        .eq('id', applicationId)

      setUploaded(true)
      onSuccess(publicUrl)
    } catch (err) {
      setError('Error al subir el archivo. Intenta nuevamente.')
      console.error(err)
    } finally {
      setUploading(false)
    }
  }

  if (uploaded) {
    return (
      <Card className="border-emerald-500/30 bg-emerald-500/10">
        <div className="flex items-center gap-3">
          <CheckCircle size={24} className="text-emerald-400" />
          <div>
            <p className="font-semibold text-emerald-300">Plano subido correctamente</p>
            <p className="text-sm text-slate-400 mt-0.5">{file?.name}</p>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Zona de drop */}
      <div
        onDragOver={e => { e.preventDefault(); setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        onDrop={handleDrop}
        onClick={() => document.getElementById('file-input')?.click()}
        className={clsx(
          'relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed',
          'cursor-pointer transition-all duration-200 p-10',
          drag
            ? 'border-amber-500 bg-amber-500/10 scale-[1.01]'
            : file
            ? 'border-blue-500/50 bg-blue-500/5'
            : 'border-white/15 hover:border-amber-500/50 hover:bg-white/5'
        )}
      >
        <input
          id="file-input"
          type="file"
          className="hidden"
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
        />

        {file ? (
          <>
            <FileText size={36} className="text-blue-400" />
            <div className="text-center">
              <p className="text-sm font-semibold text-white">{file.name}</p>
              <p className="text-xs text-slate-400 mt-1">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <button
              onClick={e => { e.stopPropagation(); setFile(null) }}
              className="absolute top-3 right-3 rounded-full bg-white/10 p-1 hover:bg-white/20"
            >
              <X size={14} className="text-slate-400" />
            </button>
          </>
        ) : (
          <>
            <Upload size={32} className={clsx('transition-colors', drag ? 'text-amber-400' : 'text-slate-500')} />
            <div className="text-center">
              <p className="text-sm text-slate-300">
                Arrastra tu plano aquí o{' '}
                <span className="text-amber-400 underline underline-offset-2">selecciona el archivo</span>
              </p>
              <p className="text-xs text-slate-500 mt-1">PDF, JPG o PNG — máximo 10 MB</p>
            </div>
          </>
        )}
      </div>

      {error && (
        <div className="flex gap-2 text-red-400 text-sm">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {file && (
        <Button
          onClick={handleUpload}
          loading={uploading}
          size="lg"
          className="w-full"
          id="btn-subir-plano"
        >
          {uploading ? 'Subiendo plano...' : 'Confirmar y subir plano'}
        </Button>
      )}
    </div>
  )
}
