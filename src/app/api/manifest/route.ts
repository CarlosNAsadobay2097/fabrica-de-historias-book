import { NextRequest, NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import type { Manifest } from "@/types/overlay"

// MVP: un solo libro fijo, igual que en page.tsx.
// Cuando pasemos a multi-libro, este bookId viene de la ruta/query,
// y manifestPath() arma el path dinámicamente contra storage/books/{bookId}/.
const BOOK_ID = "fabrica_de_historias"

function manifestPath() {
  return path.join(process.cwd(), "public", "pages", BOOK_ID, "manifest.json")
}

export async function GET() {
  try {
    const raw = await fs.readFile(manifestPath(), "utf-8")
    return NextResponse.json(JSON.parse(raw) as Manifest)
  } catch {
    return NextResponse.json(
      { error: "No se pudo leer el manifest" },
      { status: 500 }
    )
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = (await req.json()) as Manifest

    if (!body || typeof body.pages !== "number" || !body.basePath) {
      return NextResponse.json({ error: "Manifest inválido" }, { status: 400 })
    }

    // ⚠️ Todavía sin autenticación. Antes de exponer esto en un servidor
    // real, hay que proteger esta ruta (ver la fase de auth /admin que
    // dejamos pendiente) — cualquiera que la encuentre puede reescribir
    // el manifest.
    await fs.writeFile(manifestPath(), JSON.stringify(body, null, 2), "utf-8")
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json(
      { error: "No se pudo guardar el manifest" },
      { status: 500 }
    )
  }
}
