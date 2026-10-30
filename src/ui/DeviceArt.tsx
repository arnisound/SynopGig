import { useState } from 'react'
import { CATEGORY_COLORS, LIBRARY } from '../data/library'
import { symbolKey } from '../data/symbolKey'
import { useModelPhoto } from '../library/modelPhotos'
import type { Category } from '../types'
import { DeviceSymbol } from './DeviceSymbol'

const FAMILY = new Map(LIBRARY.map((t) => [t.id, t.family]))

/** A model's illustration: its photo when there is one, otherwise the symbol of its kind. */
export default function DeviceArt({
  image,
  family,
  templateId,
  model,
  category,
  size = 32,
}: {
  image?: string
  family?: string
  templateId?: string
  model?: string
  category: Category
  size?: number
}) {
  // A photo given by its address on another site: when the link is dead, the symbol comes back.
  // No photo of its own: its model's ('' asks for the symbol).
  const [broken, setBroken] = useState<string>()
  const ofModel = useModelPhoto(image === undefined ? templateId : undefined)
  image ??= ofModel
  if (image && image !== broken) {
    const remote = /^https?:/.test(image)
    return (
      <img
        className="device-art photo"
        src={image}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        referrerPolicy="no-referrer"
        {...(remote ? {} : { crossOrigin: 'anonymous' as const })}
        onError={() => setBroken(image)}
      />
    )
  }
  const name = symbolKey({ family: family ?? (templateId ? FAMILY.get(templateId) : undefined), templateId, model, category })
  return (
    <span className="device-art symbol" style={{ width: size, height: size, color: CATEGORY_COLORS[category] }}>
      <DeviceSymbol name={name} size={Math.round(size * 0.8)} />
    </span>
  )
}
