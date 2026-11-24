/** Esqueleto mostrado na hora em que se toca numa aba, enquanto os dados chegam. */
export default function Carregando() {
  return (
    <main className="screen" aria-busy="true" aria-label="Carregando">
      <div className="row">
        <div className="esq" style={{ width: 52, height: 46, borderRadius: 14 }} />
        <div className="col gap-6 flex-1">
          <div className="esq" style={{ width: '55%', height: 20, borderRadius: 8 }} />
          <div className="esq" style={{ width: '35%', height: 14, borderRadius: 6 }} />
        </div>
      </div>
      <div className="esq" style={{ height: 190, borderRadius: 24 }} />
      <div className="grid-3">
        <div className="esq" style={{ height: 92 }} />
        <div className="esq" style={{ height: 92 }} />
        <div className="esq" style={{ height: 92 }} />
      </div>
      <div className="esq" style={{ height: 64 }} />
      <div className="esq" style={{ height: 64 }} />
      <div className="esq" style={{ height: 64 }} />
    </main>
  )
}
