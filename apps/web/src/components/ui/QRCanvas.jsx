import { useEffect, useRef } from 'react'
import QRCode from 'qrcode'

/**
 * Shared QRCanvas — renders a QR code on a canvas element.
 * Reads theme colors from CSS custom properties.
 */
export default function QRCanvas({ value, size = 160, borderRadius = 4, centered = false }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (!value || !canvasRef.current) return
    const style = getComputedStyle(document.documentElement)
    const darkColor = style.getPropertyValue('--accent-primary').trim() || '#00d4ff'
    const lightColor = style.getPropertyValue('--bg-primary').trim() || '#050a14'
    QRCode.toCanvas(canvasRef.current, value, {
      width: size,
      margin: 2,
      errorCorrectionLevel: 'L',
      color: { dark: darkColor, light: lightColor },
    }).catch(console.error)
  }, [value, size])

  const style = centered
    ? { borderRadius, display: 'block', margin: '0 auto' }
    : { borderRadius, display: 'block', width: size, height: size, maxWidth: '100%' }

  return <canvas ref={canvasRef} style={style} />
}
