import FlipBook from "@/components/FlipBook"

export default function Home() {
  return (
    <main className="min-h-screen">
      <FlipBook manifest="/pages/fabrica_de_historias/manifest.json" />
    </main>
  )
}