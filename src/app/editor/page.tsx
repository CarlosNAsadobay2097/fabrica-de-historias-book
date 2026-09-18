"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Rnd } from "react-rnd"
import type { Manifest, OverlayAction, OverlayType, PageOverlay } from "@/types/overlay"
import AssetDropzone from "@/components/AssetDropzone"

function pageUrl(basePath: string, format: string, n: number): string {
  return `${basePath}/page-${String(n).padStart(3, "0")}.${format}`
}

function overlayIcon(type: OverlayType) {
  if (type === "image") return "🖼️"
  if (type === "reveal") return "🫥"
  if (type === "video") return "🎬"
  return "🔘"
}

function newOverlay(type: OverlayType, existingCount: number): PageOverlay {
  // Escalonamos la posición inicial para que overlays agregados en secuencia
  // no nazcan exactamente superpuestos (antes: siempre x:40,y:40 → parecía
  // que "solo se guardaban 2" cuando en realidad estaban todos apilados).
  const step = (existingCount % 6) * 7
  if (type === "reveal") {
    return {
      id: crypto.randomUUID(),
      type,
      x: 15 + step,
      y: 15 + step,
      w: 10,
      h: 10,
      visible: true,
      clickable: true,
      action: "none",
      name: "Nombre Apellido",
      role: "Cargo",
      bio: "",
      avatarColor: "#4a6cf7",
    }
  }
  if (type === "video") {
    return {
      id: crypto.randomUUID(),
      type,
      x: 15 + step,
      y: 15 + step,
      w: 30,
      h: 20,
      visible: true,
      clickable: false,
      action: "none",
      rotate: 0,
    }
  }
  return {
    id: crypto.randomUUID(),
    type,
    x: 15 + step,
    y: 15 + step,
    w: type === "image" ? 20 : 8,
    h: type === "image" ? 20 : 8,
    visible: type === "button", // las imágenes empiezan ocultas por defecto (el caso típico), los botones visibles
    clickable: true,
    action: "none",
    icon: type === "button" ? "🔊" : undefined,
  }
}

export default function EditorPage() {
  const [manifest, setManifest] = useState<Manifest | null>(null)
  const [pageNum, setPageNum] = useState(1)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const [containerSize, setContainerSize] = useState({ w: 600, h: 800 })

  useEffect(() => {
    fetch("/api/manifest")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(setManifest)
      .catch((e) => setLoadError(e.message))
  }, [])

  useEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        setContainerSize({
          w: containerRef.current.offsetWidth,
          h: containerRef.current.offsetHeight,
        })
      }
    }
    measure()
    window.addEventListener("resize", measure)
    return () => window.removeEventListener("resize", measure)
  }, [manifest, pageNum])

  const overlays = manifest?.overlays?.[String(pageNum)] ?? []

  const updateOverlays = useCallback(
    (updater: (list: PageOverlay[]) => PageOverlay[]) => {
      setManifest((prev) => {
        if (!prev) return prev
        const key = String(pageNum)
        const current = prev.overlays?.[key] ?? []
        return {
          ...prev,
          overlays: { ...prev.overlays, [key]: updater(current) },
        }
      })
    },
    [pageNum]
  )

  const updateRevealImage = (url: string) => {
    setManifest((prev) => {
      if (!prev) return prev
      const key = String(pageNum)
      return {
        ...prev,
        revealImages: { ...prev.revealImages, [key]: url },
      }
    })
  }

  const updateRevealCardBg = (url: string) => {
    setManifest((prev) => (prev ? { ...prev, revealCardBg: url } : prev))
  }

  const updateDownloadPdf = (url: string) => {
    setManifest((prev) => (prev ? { ...prev, downloadPdfUrl: url } : prev))
  }

  const addTocEntry = () => {
    setManifest((prev) => {
      if (!prev) return prev
      const entry = { id: crypto.randomUUID(), label: "Nuevo cuento", page: pageNum }
      return { ...prev, tableOfContents: [...(prev.tableOfContents ?? []), entry] }
    })
  }

  const updateTocEntry = (id: string, patch: Partial<{ label: string; page: number }>) => {
    setManifest((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        tableOfContents: (prev.tableOfContents ?? []).map((e) =>
          e.id === id ? { ...e, ...patch } : e
        ),
      }
    })
  }

  const removeTocEntry = (id: string) => {
    setManifest((prev) => {
      if (!prev) return prev
      return { ...prev, tableOfContents: (prev.tableOfContents ?? []).filter((e) => e.id !== id) }
    })
  }

  const addOverlay = (type: OverlayType) => {
    const ov = newOverlay(type, overlays.length)
    updateOverlays((list) => [...list, ov])
    setSelectedId(ov.id)
  }

  const patchOverlay = (id: string, patch: Partial<PageOverlay>) => {
    updateOverlays((list) => list.map((o) => (o.id === id ? { ...o, ...patch } : o)))
  }

  const removeOverlay = (id: string) => {
    updateOverlays((list) => list.filter((o) => o.id !== id))
    if (selectedId === id) setSelectedId(null)
  }

  const save = async () => {
    if (!manifest) return
    setSaving(true)
    try {
      const res = await fetch("/api/manifest", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(manifest),
      })
      if (!res.ok) throw new Error("save failed")
      setSavedAt(new Date().toLocaleTimeString())
    } catch {
      alert("No se pudo guardar. Revisá la consola del servidor (npm run dev).")
    } finally {
      setSaving(false)
    }
  }

  if (loadError) {
    return (
      <div className="p-8 text-white bg-[#0d0d0d] h-screen">
        ⚠ No se pudo cargar el manifest: {loadError}
      </div>
    )
  }

  if (!manifest) {
    return (
      <div className="p-8 text-white bg-[#0d0d0d] h-screen flex items-center justify-center font-mono tracking-widest">
        CARGANDO…
      </div>
    )
  }

  const selected = overlays.find((o) => o.id === selectedId) ?? null

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white flex">
      {/* Panel izquierdo: navegación de páginas + lista de overlays */}
      <div className="w-56 border-r border-white/10 p-4 flex flex-col gap-4">
        <h1 className="text-sm font-semibold uppercase tracking-wide text-blue-400">
          Editor de overlays
        </h1>

        <div className="flex items-center justify-between">
          <button
            onClick={() => setPageNum((p) => Math.max(1, p - 1))}
            className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-sm"
          >
            ◀
          </button>
          <span className="text-sm font-mono">
            Pág. {pageNum} / {manifest.pages}
          </span>
          <button
            onClick={() => setPageNum((p) => Math.min(manifest.pages, p + 1))}
            className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-sm"
          >
            ▶
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={() => addOverlay("image")}
            className="px-3 py-2 rounded bg-blue-600 hover:bg-blue-500 text-sm text-left"
          >
            + Imagen / WebP / GIF
          </button>
          <button
            onClick={() => addOverlay("button")}
            className="px-3 py-2 rounded bg-white/10 hover:bg-white/20 text-sm text-left"
          >
            + Botón interactivo
          </button>
          <button
            onClick={() => addOverlay("reveal")}
            className="px-3 py-2 rounded bg-purple-600 hover:bg-purple-500 text-sm text-left"
          >
            + Punto de revelado (equipo)
          </button>
          <button
            onClick={() => addOverlay("video")}
            className="px-3 py-2 rounded bg-red-600 hover:bg-red-500 text-sm text-left"
          >
            + Video (YouTube)
          </button>
        </div>

        <AssetDropzone
          label="Foto real de esta página (mismo tamaño y composición que el fieltro)"
          accept="image/webp,image/gif,image/png,image/jpeg"
          value={manifest.revealImages?.[String(pageNum)]}
          onChange={updateRevealImage}
        />

        <AssetDropzone
          label="Textura de fondo de las tarjetas de bio (aplica a todo el libro)"
          accept="image/webp,image/png,image/jpeg"
          value={manifest.revealCardBg}
          onChange={updateRevealCardBg}
        />

        <AssetDropzone
          label="PDF descargable para lectores (botón de descarga, todo el libro)"
          accept="application/pdf"
          value={manifest.downloadPdfUrl}
          onChange={updateDownloadPdf}
        />

        <div className="flex flex-col gap-2 border-t border-white/10 pt-3">
          <div className="text-xs uppercase text-gray-500">Índice del libro (todo el libro)</div>
          {(manifest.tableOfContents ?? []).map((entry) => (
            <div key={entry.id} className="flex items-center gap-1">
              <input
                className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded px-2 py-1 text-xs"
                value={entry.label}
                onChange={(e) => updateTocEntry(entry.id, { label: e.target.value })}
                placeholder="Título del cuento"
              />
              <input
                type="number"
                min={1}
                className="w-14 bg-white/5 border border-white/10 rounded px-1 py-1 text-xs text-center"
                value={entry.page}
                onChange={(e) => updateTocEntry(entry.id, { page: parseInt(e.target.value) || 1 })}
              />
              <button
                onClick={() => removeTocEntry(entry.id)}
                className="w-6 h-6 shrink-0 flex items-center justify-center rounded bg-red-600/70 hover:bg-red-600 text-xs"
                title="Eliminar entrada"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            onClick={addTocEntry}
            className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 text-xs text-left"
          >
            + Agregar entrada (página actual: {pageNum})
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="text-xs uppercase text-gray-500 mb-2">Overlays en esta página</div>
          {overlays.length === 0 && <div className="text-xs text-gray-600">Ninguno todavía</div>}
          {overlays.map((o) => (
            <div key={o.id} className="flex items-center gap-1 mb-1">
              <button
                onClick={() => setSelectedId(o.id)}
                className={`flex-1 text-left px-2 py-1.5 rounded text-xs ${
                  selectedId === o.id ? "bg-blue-600" : "bg-white/5 hover:bg-white/10"
                }`}
              >
                {overlayIcon(o.type)} {o.id.slice(0, 8)}
                {!o.visible && <span className="text-gray-500"> (oculta)</span>}
              </button>
              <button
                onClick={() => patchOverlay(o.id, { visible: !o.visible })}
                title={o.visible ? "Ocultar al cargar la página" : "Mostrar al cargar la página"}
                className="w-7 h-7 flex items-center justify-center rounded bg-white/5 hover:bg-white/10 text-sm shrink-0"
              >
                {o.visible ? "👁️" : "🚫"}
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="px-3 py-2 rounded bg-green-600 hover:bg-green-500 disabled:opacity-50 text-sm font-semibold"
        >
          {saving ? "Guardando…" : "Guardar manifest"}
        </button>
        {savedAt && <div className="text-[10px] text-gray-500">Guardado {savedAt}</div>}
      </div>

      {/* Canvas central: la página real con los overlays encima */}
      <div className="flex-1 flex items-center justify-center p-8 overflow-auto">
        <div
          ref={containerRef}
          className="relative bg-black border border-white/10"
          style={{ width: "min(70vw, 900px)" }}
        >
          <img
            src={pageUrl(manifest.basePath, manifest.format, pageNum)}
            alt={`Página ${pageNum}`}
            className="w-full h-auto block select-none pointer-events-none"
            draggable={false}
          />

          {overlays.map((o) => (
            <Rnd
              key={o.id}
              size={{
                width: (o.w / 100) * containerSize.w,
                height: (o.h / 100) * containerSize.h,
              }}
              position={{
                x: (o.x / 100) * containerSize.w,
                y: (o.y / 100) * containerSize.h,
              }}
              onDragStop={(_e, d) => {
                patchOverlay(o.id, {
                  x: (d.x / containerSize.w) * 100,
                  y: (d.y / containerSize.h) * 100,
                })
              }}
              onResizeStop={(_e, _dir, ref, _delta, position) => {
                patchOverlay(o.id, {
                  w: (ref.offsetWidth / containerSize.w) * 100,
                  h: (ref.offsetHeight / containerSize.h) * 100,
                  x: (position.x / containerSize.w) * 100,
                  y: (position.y / containerSize.h) * 100,
                })
              }}
              onMouseDown={() => setSelectedId(o.id)}
              style={{
                border:
                  selectedId === o.id
                    ? "2px solid #3b82f6"
                    : o.type === "reveal"
                    ? "2px dashed #a855f7"
                    : o.type === "video"
                    ? "2px dashed #dc2626"
                    : "1px dashed rgba(255,255,255,0.4)",
                borderRadius: o.type === "reveal" ? "9999px" : undefined,
                background:
                  o.type === "button"
                    ? "rgba(59,130,246,0.15)"
                    : o.type === "reveal"
                    ? "rgba(168,85,247,0.15)"
                    : o.type === "video"
                    ? "rgba(220,38,38,0.15)"
                    : "transparent",
                opacity: o.visible ? 1 : 0.4,
                transform: o.type === "video" && o.rotate ? `rotate(${o.rotate}deg)` : undefined,
              }}
            >
              {o.type === "reveal" ? (
                <div className="w-full h-full flex items-center justify-center text-[10px] text-purple-200 font-semibold pointer-events-none text-center px-1">
                  {(o.name || "").trim().split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "?"}
                </div>
              ) : o.type === "video" ? (
                <div className="w-full h-full flex flex-col items-center justify-center text-red-200 pointer-events-none gap-1">
                  <span className="text-lg">▶️</span>
                  <span className="text-[9px] text-center px-1 break-all">{o.videoId || "sin ID"}</span>
                </div>
              ) : o.src ? (
                <img
                  src={o.src}
                  style={{ objectFit: o.fit ?? "contain" }}
                  className="w-full h-full pointer-events-none"
                  alt=""
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xl pointer-events-none">
                  {o.icon ?? "🔘"}
                </div>
              )}
            </Rnd>
          ))}
        </div>
      </div>

      {/* Panel derecho: propiedades del overlay seleccionado */}
      <div className="w-72 border-l border-white/10 p-4">
        {!selected && (
          <div className="text-sm text-gray-500">Seleccioná un overlay para editarlo</div>
        )}
        {selected && (
          <div className="flex flex-col gap-3 text-sm">
            <div className="text-xs uppercase text-gray-500">Overlay {selected.id.slice(0, 8)}</div>

            {selected.type === "image" && (
              <>
                <AssetDropzone
                  label="Imagen / WebP / GIF"
                  accept="image/webp,image/gif,image/png,image/jpeg"
                  value={selected.src}
                  onChange={(url) => patchOverlay(selected.id, { src: url })}
                />
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-gray-400">Modo de encuadre</span>
                  <select
                    className="bg-white/5 border border-white/10 rounded px-2 py-1"
                    value={selected.fit ?? "contain"}
                    onChange={(e) =>
                      patchOverlay(selected.id, { fit: e.target.value as "contain" | "cover" })
                    }
                  >
                    <option value="contain">Ajustar completo (se ve toda, con márgenes)</option>
                    <option value="cover">Recortar / enmascarar (llena la caja, oculta bordes)</option>
                  </select>
                </label>
              </>
            )}

            {selected.type === "button" && (
              <>
                <AssetDropzone
                  label="Imagen del botón (opcional)"
                  accept="image/webp,image/gif,image/png,image/jpeg"
                  value={selected.src}
                  onChange={(url) => patchOverlay(selected.id, { src: url })}
                />
                {selected.src && (
                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-gray-400">Modo de encuadre</span>
                    <select
                      className="bg-white/5 border border-white/10 rounded px-2 py-1"
                      value={selected.fit ?? "contain"}
                      onChange={(e) =>
                        patchOverlay(selected.id, { fit: e.target.value as "contain" | "cover" })
                      }
                    >
                      <option value="contain">Ajustar completo</option>
                      <option value="cover">Recortar / enmascarar</option>
                    </select>
                  </label>
                )}
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-gray-400">
                    Ícono de respaldo (si no hay imagen)
                  </span>
                  <input
                    className="bg-white/5 border border-white/10 rounded px-2 py-1"
                    value={selected.icon ?? ""}
                    onChange={(e) => patchOverlay(selected.id, { icon: e.target.value })}
                  />
                </label>
              </>
            )}

            {selected.type === "reveal" && (
              <>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-gray-400">Nombre completo</span>
                  <input
                    className="bg-white/5 border border-white/10 rounded px-2 py-1"
                    value={selected.name ?? ""}
                    onChange={(e) => patchOverlay(selected.id, { name: e.target.value })}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-gray-400">Cargo / Rol</span>
                  <input
                    className="bg-white/5 border border-white/10 rounded px-2 py-1"
                    value={selected.role ?? ""}
                    onChange={(e) => patchOverlay(selected.id, { role: e.target.value })}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-gray-400">Biografía</span>
                  <textarea
                    rows={4}
                    className="bg-white/5 border border-white/10 rounded px-2 py-1 resize-none"
                    value={selected.bio ?? ""}
                    onChange={(e) => patchOverlay(selected.id, { bio: e.target.value })}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-gray-400">Color de acento (avatar/etiqueta)</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      className="w-9 h-8 rounded bg-transparent border border-white/10"
                      value={selected.avatarColor ?? "#4a6cf7"}
                      onChange={(e) => patchOverlay(selected.id, { avatarColor: e.target.value })}
                    />
                    <input
                      className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1"
                      value={selected.avatarColor ?? "#4a6cf7"}
                      onChange={(e) => patchOverlay(selected.id, { avatarColor: e.target.value })}
                    />
                  </div>
                </label>
                <p className="text-[10px] text-gray-500">
                  Este punto revela la “Foto real de esta página” cargada arriba, en el lugar y
                  tamaño de este círculo. Ajustá el tamaño del círculo para que cubra bien el
                  rostro.
                </p>
              </>
            )}

            {selected.type === "video" && (
              <>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-gray-400">Link o ID del video de YouTube</span>
                  <input
                    className="bg-white/5 border border-white/10 rounded px-2 py-1"
                    placeholder="https://youtu.be/XXXXXXXXXXX o solo el ID"
                    defaultValue={selected.videoId ?? ""}
                    onBlur={(e) => {
                      const raw = e.target.value.trim()
                      const match = raw.match(
                        /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{6,})/
                      )
                      const id = match ? match[1] : raw
                      patchOverlay(selected.id, { videoId: id })
                    }}
                  />
                </label>
                <p className="text-[10px] text-gray-500">
                  Pegá el link completo de YouTube (marcado como “No listado”) o directamente el
                  ID del video — se guarda solo al salir del campo.
                </p>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-gray-400">
                    Inclinación (grados) — para calzar con el diseño de la página
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={-45}
                      max={45}
                      step={1}
                      className="flex-1"
                      value={selected.rotate ?? 0}
                      onChange={(e) => patchOverlay(selected.id, { rotate: parseInt(e.target.value) })}
                    />
                    <input
                      type="number"
                      className="w-16 bg-white/5 border border-white/10 rounded px-2 py-1 text-center"
                      value={selected.rotate ?? 0}
                      onChange={(e) => patchOverlay(selected.id, { rotate: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selected.visible}
                    onChange={(e) => patchOverlay(selected.id, { visible: e.target.checked })}
                  />
                  <span className="text-xs text-gray-400">Visible al cargar la página</span>
                </label>
              </>
            )}

            {selected.type !== "reveal" && selected.type !== "video" && (
              <>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selected.visible}
                    onChange={(e) => patchOverlay(selected.id, { visible: e.target.checked })}
                  />
                  <span className="text-xs text-gray-400">Visible al cargar la página</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selected.clickable}
                    onChange={(e) => patchOverlay(selected.id, { clickable: e.target.checked })}
                  />
                  <span className="text-xs text-gray-400">Responde a clic</span>
                </label>

                {selected.clickable && (
                  <AssetDropzone
                    label="Sonido al hacer clic (opcional)"
                    accept="audio/*"
                    value={selected.audioSrc}
                    onChange={(url) => patchOverlay(selected.id, { audioSrc: url })}
                  />
                )}

                <label className="flex flex-col gap-1">
                  <span className="text-xs text-gray-400">Acción al hacer clic</span>
                  <select
                    className="bg-white/5 border border-white/10 rounded px-2 py-1"
                    value={selected.action}
                    onChange={(e) =>
                      patchOverlay(selected.id, { action: e.target.value as OverlayAction })
                    }
                  >
                    <option value="none">Ninguna (solo el sonido, si hay)</option>
                    <option value="toggleTarget">Mostrar/ocultar otros overlays</option>
                    <option value="timedSwap">Activar temporalmente y volver</option>
                    <option value="link">Abrir enlace</option>
                  </select>
                </label>

                {selected.action === "timedSwap" && (
                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-gray-400">
                      Duración antes de revertir (segundos)
                    </span>
                    <input
                      type="number"
                      min={0.5}
                      step={0.5}
                      className="bg-white/5 border border-white/10 rounded px-2 py-1"
                      value={(selected.durationMs ?? 3000) / 1000}
                      onChange={(e) =>
                        patchOverlay(selected.id, {
                          durationMs: Math.max(500, Math.round(parseFloat(e.target.value) * 1000)),
                        })
                      }
                    />
                  </label>
                )}

                {(selected.action === "toggleTarget" || selected.action === "timedSwap") && (
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-gray-400">
                      {selected.action === "timedSwap"
                        ? "Overlay(s) a activar temporalmente"
                        : "Overlays a mostrar/ocultar (podés elegir varios)"}
                    </span>
                    <div className="flex flex-col gap-1 max-h-40 overflow-y-auto bg-white/5 border border-white/10 rounded px-2 py-2">
                      {overlays.filter((o) => o.id !== selected.id).length === 0 && (
                        <span className="text-[10px] text-gray-600">
                          No hay otros overlays en esta página todavía
                        </span>
                      )}
                      {overlays
                        .filter((o) => o.id !== selected.id)
                        .map((o) => {
                          const checked = selected.targetIds?.includes(o.id) ?? false
                          return (
                            <label key={o.id} className="flex items-center gap-2 text-xs">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  const current = selected.targetIds ?? []
                                  const next = e.target.checked
                                    ? [...current, o.id]
                                    : current.filter((id) => id !== o.id)
                                  patchOverlay(selected.id, { targetIds: next })
                                }}
                              />
                              <span>
                                {overlayIcon(o.type)}{" "}
                                {o.id.slice(0, 8)}
                              </span>
                            </label>
                          )
                        })}
                    </div>
                  </div>
                )}

                {selected.action === "link" && (
                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-gray-400">URL</span>
                    <input
                      className="bg-white/5 border border-white/10 rounded px-2 py-1"
                      value={selected.linkUrl ?? ""}
                      onChange={(e) => patchOverlay(selected.id, { linkUrl: e.target.value })}
                      placeholder="https://..."
                    />
                  </label>
                )}
              </>
            )}

            <button
              onClick={() => removeOverlay(selected.id)}
              className="mt-2 px-3 py-2 rounded bg-red-600/80 hover:bg-red-600 text-xs"
            >
              Eliminar overlay
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
