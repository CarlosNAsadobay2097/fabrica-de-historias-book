"use client"

import type { PageOverlay } from "@/types/overlay"

/**
 * Registro compartido por libro/init: permite que un botón "toggleTarget"
 * encuentre y muestre/oculte otro overlay de la misma página, y evita
 * recrear objetos Audio en cada clic.
 */
export interface OverlayRegistry {
  byId: Map<string, HTMLElement>
  audio: Map<string, HTMLAudioElement>
}

export function createOverlayRegistry(): OverlayRegistry {
  return { byId: new Map(), audio: new Map() }
}

/**
 * Crea el elemento DOM de un overlay (imagen/webp/gif o botón) y lo cablea
 * con su acción. page-flip no usa React para renderizar las páginas, así
 * que esto también es DOM puro, consistente con el resto de FlipBook.tsx.
 */
export function buildOverlayElement(
  overlay: PageOverlay,
  registry: OverlayRegistry
): HTMLElement {
  const el = document.createElement("div")
  el.dataset.overlayId = overlay.id
  el.dataset.overlayType = overlay.type
  el.style.position = "absolute"
  el.style.left = `${overlay.x}%`
  el.style.top = `${overlay.y}%`
  el.style.width = `${overlay.w}%`
  el.style.height = `${overlay.h}%`
  el.style.pointerEvents = overlay.clickable ? "auto" : "none"
  el.style.cursor = overlay.clickable ? "pointer" : "default"
  el.style.display = overlay.visible ? (overlay.type === "button" ? "flex" : "block") : "none"

  if (overlay.type === "image" && overlay.src) {
    const img = document.createElement("img")
    img.src = overlay.src
    img.draggable = false
    img.alt = ""
    img.style.cssText = `width:100%;height:100%;object-fit:${overlay.fit ?? "contain"};display:block;`
    el.appendChild(img)
  } else if (overlay.type === "button") {
    el.style.alignItems = "center"
    el.style.justifyContent = "center"
    el.style.background = "transparent"

    if (overlay.src) {
      // Botón con imagen propia (ej: un ícono ilustrado a juego con el libro)
      const img = document.createElement("img")
      img.src = overlay.src
      img.draggable = false
      img.alt = ""
      img.style.cssText = `width:100%;height:100%;object-fit:${overlay.fit ?? "contain"};display:block;`
      el.appendChild(img)
    } else {
      // Fallback: emoji/texto corto si el botón no tiene imagen propia
      el.style.fontSize = "1.6rem"
      el.textContent = overlay.icon ?? "🔊"
    }
  }

  registry.byId.set(overlay.id, el)

  if (overlay.clickable) {
    // page-flip empieza a trackear el drag desde mousedown/touchstart, no desde click.
    // Si solo frenamos el click, la página ya empezó a "doblarse" antes de que
    // el clic llegue a completarse. Frenamos el gesto lo antes posible.
    const stop = (e: Event) => e.stopPropagation()
    el.addEventListener("mousedown", stop)
    el.addEventListener("touchstart", stop, { passive: true })
    el.addEventListener("pointerdown", stop)

    el.addEventListener("click", (e) => {
      e.stopPropagation()

      // El sonido es independiente de la acción: cualquier overlay clickeable
      // puede reproducir audio, además de lo que haga su acción principal.
      if (overlay.audioSrc) {
        let audio = registry.audio.get(overlay.id)
        if (!audio) {
          audio = new Audio(overlay.audioSrc)
          registry.audio.set(overlay.id, audio)
        }
        audio.currentTime = 0
        audio.play().catch(() => {})
      }

      if (overlay.action === "toggleTarget" && overlay.targetIds?.length) {
        overlay.targetIds.forEach((targetId) => {
          const target = registry.byId.get(targetId)
          if (target) {
            const isHidden = target.style.display === "none"
            const displayValue = target.dataset.overlayType === "button" ? "flex" : "block"
            target.style.display = isHidden ? displayValue : "none"
          }
        })
      }

      if (overlay.action === "timedSwap" && overlay.targetIds?.length) {
        // Botón estático → se oculta a sí mismo, muestra la(s) animación(es),
        // y pasado `durationMs` revierte todo automáticamente.
        const displaySelf = overlay.type === "button" ? "flex" : "block"
        el.style.display = "none"

        overlay.targetIds.forEach((targetId) => {
          const target = registry.byId.get(targetId)
          if (target) {
            target.style.display = target.dataset.overlayType === "button" ? "flex" : "block"
          }
        })

        const duration = overlay.durationMs ?? 3000
        setTimeout(() => {
          overlay.targetIds!.forEach((targetId) => {
            const target = registry.byId.get(targetId)
            if (target) target.style.display = "none"
          })
          el.style.display = displaySelf
        }, duration)
      }

      if (overlay.action === "link" && overlay.linkUrl) {
        window.open(overlay.linkUrl, "_blank", "noopener,noreferrer")
      }
    })
  }

  return el
}
