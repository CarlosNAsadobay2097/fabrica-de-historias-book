// types/overlay.ts
// Tipos compartidos entre el visor (FlipBook), el editor (/editor) y la API (/api/manifest)

export type OverlayType = "image" | "button"
export type OverlayAction = "none" | "toggleTarget" | "timedSwap" | "link"

export interface PageOverlay {
  id: string
  type: OverlayType
  /** Ruta a la imagen/webp/gif. Requerido si type === "image". Opcional en "button" (reemplaza al ícono/emoji). */
  src?: string
  /** Emoji o texto corto para representar un "button" cuando no tiene src propio. */
  icon?: string
  /** Posición y tamaño en % relativo a la página (no en px), para que escale con cualquier resize/zoom. */
  x: number
  y: number
  w: number
  h: number
  /** Visibilidad al cargar la página (permite overlays "ocultos" que se revelan con un botón). */
  visible: boolean
  /** Si responde a clics. */
  clickable: boolean
  action: OverlayAction
  /**
   * Sonido a reproducir en CADA clic, independiente de `action`.
   * Un botón puede sonar y además togglear/activar otros overlays a la vez.
   */
  audioSrc?: string
  /** ids de otros overlays de la misma página a mostrar/ocultar u activar temporalmente. Usado si action === "toggleTarget" o "timedSwap". */
  targetIds?: string[]
  /** Duración en milisegundos que quedan visibles los targetIds antes de revertir. Usado si action === "timedSwap". */
  durationMs?: number
  /** Usado si action === "link". */
  linkUrl?: string
  /**
   * Cómo encaja la imagen dentro de su caja (solo aplica si hay `src` de imagen):
   * "contain" (default) = se ve completa, se encoge proporcionalmente si no entra.
   * "cover" = mantiene su tamaño/proporción real y la caja actúa de ventana/máscara,
   *           recortando lo que no entra en vez de encoger el dibujo entero.
   */
  fit?: "contain" | "cover"
}

export interface Manifest {
  name: string
  source: string
  pages: number
  format: string
  basePath: string
  /** Clave = número de página, 1-indexado (coincide con page-001, page-002, ...), como string. */
  overlays?: Record<string, PageOverlay[]>
}
