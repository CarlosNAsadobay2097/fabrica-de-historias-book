"use client"

import { useCallback, useRef, useState } from "react"

interface AssetDropzoneProps {
  label: string
  value?: string
  /** ej: "image/webp,image/gif,image/png,image/jpeg" o "audio/*" */
  accept: string
  onChange: (url: string) => void
}

export default function AssetDropzone({ label, value, accept, onChange }: AssetDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const upload = useCallback(
    async (file: File) => {
      setUploading(true)
      setError(null)
      try {
        const formData = new FormData()
        formData.append("file", file)
        const res = await fetch("/api/upload", { method: "POST", body: formData })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? "Error al subir")
        onChange(data.url as string)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al subir")
      } finally {
        setUploading(false)
      }
    },
    [onChange]
  )

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0]
    if (file) upload(file)
  }

  const isImage = accept.startsWith("image")
  const isAudio = accept.startsWith("audio")

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-gray-400">{label}</span>

      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setIsDragging(false)
          handleFiles(e.dataTransfer.files)
        }}
        className={`cursor-pointer rounded border border-dashed px-3 py-4 text-center text-xs transition-colors ${
          isDragging ? "border-blue-400 bg-blue-500/10" : "border-white/20 hover:border-white/40"
        }`}
      >
        {uploading ? (
          <span className="text-blue-400">Subiendo…</span>
        ) : value ? (
          <div className="flex flex-col items-center gap-2">
            {isImage && (
              <img src={value} alt="" className="max-h-16 max-w-full object-contain rounded" />
            )}
            {isAudio && (
              <audio
                controls
                src={value}
                className="w-full h-8"
                onClick={(e) => e.stopPropagation()}
              />
            )}
            <span className="text-[10px] text-gray-500 break-all">{value}</span>
            <span className="text-blue-400 underline">Reemplazar archivo</span>
          </div>
        ) : (
          <span className="text-gray-500">Arrastrá un archivo acá o hacé clic para elegirlo</span>
        )}
      </div>

      {error && <span className="text-[10px] text-red-400">{error}</span>}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  )
}
