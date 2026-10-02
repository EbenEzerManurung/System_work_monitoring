import sharp from 'sharp'
import { mkdir } from 'fs/promises'

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#14B8A6"/>
      <stop offset="100%" stop-color="#0F766E"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#g)"/>
  <text x="256" y="352" font-family="Arial,Helvetica,sans-serif"
        font-size="280" font-weight="bold" text-anchor="middle" fill="#ffffff">W</text>
</svg>
`

const maskable = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#0D9488"/>
  <rect x="76" y="76" width="360" height="360" rx="80" fill="#14B8A6"/>
  <text x="256" y="340" font-family="Arial,Helvetica,sans-serif"
        font-size="220" font-weight="bold" text-anchor="middle" fill="#ffffff">W</text>
</svg>
`

const buf = Buffer.from(svg)
const bufMask = Buffer.from(maskable)

await mkdir('public/icons', { recursive: true })

await sharp(buf).resize(192, 192).png().toFile('public/pwa-192x192.png')
await sharp(buf).resize(512, 512).png().toFile('public/pwa-512x512.png')
await sharp(buf).resize(180, 180).png().toFile('public/apple-touch-icon.png')
await sharp(buf).resize(32, 32).png().toFile('public/favicon-32.png')
await sharp(buf).resize(16, 16).png().toFile('public/favicon-16.png')
await sharp(bufMask).resize(512, 512).png().toFile('public/pwa-maskable-512x512.png')
await sharp(buf).resize(64, 64).png().toFile('public/icons/icon-64.png')

console.log('✅ Icons generated in public/')
