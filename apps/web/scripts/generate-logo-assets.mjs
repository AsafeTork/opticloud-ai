import sharp from 'sharp'
import { readFileSync, mkdirSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dir = dirname(fileURLToPath(import.meta.url))
const publicDir = join(__dir, '..', 'public')
const srcPng   = 'C:/Users/gilma/.claude/uploads/bf736b4a-ae44-474a-9ab0-2fc7eec0efd2/1cde5ad0-1000077187.png'

async function removeWhiteBg(inputPath) {
  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const { width, height, channels } = info
  const buf = Buffer.from(data)

  for (let i = 0; i < buf.length; i += channels) {
    const r = buf[i], g = buf[i + 1], b = buf[i + 2]
    if (r > 240 && g > 240 && b > 240) buf[i + 3] = 0
  }
  return sharp(buf, { raw: { width, height, channels } })
}

async function svgToPng(svgPath, size) {
  const svg = readFileSync(svgPath)
  return sharp(svg).resize(size, size).png()
}

async function run() {
  console.log('Gerando assets de logo...')

  // 1 — PNG transparente do original (remove fundo branco)
  const transparent = await removeWhiteBg(srcPng)
  await transparent.resize(512, 512).png().toFile(join(publicDir, 'opticloud-logo.png'))
  await transparent.resize(192, 192).png().toFile(join(publicDir, 'icon-192.png'))
  await transparent.resize(64, 64).png().toFile(join(publicDir, 'icon-64.png'))
  await transparent.resize(32, 32).png().toFile(join(publicDir, 'icon-32.png'))
  console.log('✓ opticloud-logo.png + icon-192/64/32.png')

  // 2 — Variantes SVG → PNG
  const variants = ['logo', 'logo-white', 'logo-dark', 'logo-mono']
  for (const name of variants) {
    const svgPath = join(publicDir, `${name}.svg`)
    await (await svgToPng(svgPath, 512)).toFile(join(publicDir, `${name}.png`))
    await (await svgToPng(svgPath, 192)).toFile(join(publicDir, `${name}-192.png`))
  }
  console.log('✓ logo variants PNG (512 + 192)')

  // 3 — apple-icon.png (180×180)
  const appleIcon = await svgToPng(join(publicDir, 'logo.svg'), 180)
  await appleIcon.toFile(join(publicDir, 'apple-icon.png'))
  console.log('✓ apple-icon.png')

  // 4 — og:image (1200×630)
  const svg = readFileSync(join(publicDir, 'logo.svg'))
  await sharp(svg)
    .resize(630, 630)
    .extend({ top: 0, bottom: 0, left: 285, right: 285, background: { r: 15, g: 23, b: 42, alpha: 1 } })
    .png()
    .toFile(join(publicDir, 'og-image.png'))
  console.log('✓ og-image.png (1200×630)')

  console.log('\nDone!')
}

run().catch(console.error)
