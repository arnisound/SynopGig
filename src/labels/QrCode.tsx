import qrcode from 'qrcode-generator'

/** A QR code drawn as SVG squares: sharp at any print size. */
export default function QrCode({ text, size = 80 }: { text: string; size?: number }) {
  const qr = qrcode(0, 'M')
  qr.addData(text)
  qr.make()
  const n = qr.getModuleCount()
  let d = ''
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c + 2} ${r + 2}h1v1h-1z`
  return (
    <svg className="qr" width={size} height={size} viewBox={`0 0 ${n + 4} ${n + 4}`} role="img" aria-label="QR code" shapeRendering="crispEdges">
      <rect width={n + 4} height={n + 4} fill="#fff" />
      <path d={d} fill="#000" />
    </svg>
  )
}
