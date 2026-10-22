import type { ReactNode } from 'react'

/** A4 sheet; a wide drawing is turned a quarter on it. */
export default function Page({ wide, children }: { wide: boolean; children: ReactNode }) {
  return wide ? (
    <section className="d-page d-wide">
      <div className="d-turn">{children}</div>
    </section>
  ) : (
    <section className="d-page">{children}</section>
  )
}
