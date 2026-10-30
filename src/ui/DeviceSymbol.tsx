import type { ReactNode } from 'react'

/*
 * One symbol per kind of equipment, drawn on a 24 × 24 grid with strokes:
 * the illustration of every model that has no photo.
 */

const S: Record<string, ReactNode> = {
  mic: <><rect x="9" y="2.5" width="6" height="10" rx="3" /><path d="M6 10.5a6 6 0 0 0 12 0M12 16.5v5M8.5 21.5h7" /></>,
  di: <><rect x="4" y="6" width="16" height="12" rx="2" /><circle cx="8.5" cy="12" r="2" /><path d="M14 10h3M14 14h3" /></>,
  console: <><path d="M2.5 18.5 5 6h14l2.5 12.5z" /><path d="M8 9v6M11 9v6M14 9v6M17 9v6" /><path d="M7 12h2M10 10.5h2M13 13h2M16 11h2" /></>,
  stagebox: <><rect x="3" y="5" width="18" height="14" rx="2" />{[7, 11, 15].flatMap((y) => [7, 12, 17].map((x) => <circle key={`${x}${y}`} cx={x} cy={y} r="1.4" />))}</>,
  receiver: <><rect x="2.5" y="11" width="19" height="8" rx="1.5" /><path d="M6 11 4 3M18 11l2-8" /><path d="M6 15h5M15 15h3" /></>,
  transmitter: <><rect x="9" y="7" width="6" height="14" rx="2" /><path d="M12 7V2.5" /><path d="M10.5 11h3" /></>,
  ear: <><path d="M8 6a4 4 0 0 1 8 0c0 3-2.5 4-2.5 7a2.5 2.5 0 0 1-5 0" /><path d="M11 21c3 0 4-2 4-4" /><circle cx="12" cy="6.5" r="1" /></>,
  antenna: <><path d="M12 21V10M7 21h10" /><path d="M12 10 6 3h12z" /></>,
  amp: <><rect x="2.5" y="6" width="19" height="12" rx="1.5" /><path d="M5.5 12h2l1.5-3 2 6 1.5-3h1.5" /><circle cx="18" cy="12" r="1.8" /></>,
  processor: <><rect x="2.5" y="7" width="19" height="10" rx="1.5" /><path d="M7 10v4M10 9.5v5M13 11v2M16 9.5v5" /></>,
  speaker: <><rect x="6" y="2.5" width="12" height="19" rx="1.5" /><circle cx="12" cy="7" r="2" /><circle cx="12" cy="15" r="3.6" /></>,
  array: <><path d="M4 3h16l-1 4H5zM5 8h14l-1.5 4.5h-11zM6.5 13.5h11L15.5 18h-7zM8.5 19h7l-1.5 2.5h-4z" /></>,
  sub: <><rect x="3" y="4" width="18" height="16" rx="1.5" /><circle cx="12" cy="12" r="5.5" /><circle cx="12" cy="12" r="1.5" /></>,
  wedge: <><path d="M2.5 19 8 7h13.5v12z" /><circle cx="15" cy="13" r="3" /></>,
  headphones: <><path d="M4 15v-3a8 8 0 0 1 16 0v3" /><rect x="3" y="14" width="4" height="6" rx="1.5" /><rect x="17" y="14" width="4" height="6" rx="1.5" /></>,
  movinghead: <><path d="M6 21h12M9 21v-3h6v3M7 18V9M17 18V9" /><rect x="8.5" y="4" width="7" height="9" rx="3.5" /><path d="M12 13v2" /></>,
  wash: <><path d="M6 21h12M9 21v-3h6v3M7 18V9M17 18V9" /><circle cx="12" cy="9" r="4.5" /><circle cx="12" cy="9" r="1.5" /></>,
  par: <><path d="M7 5h10l-1.5 11h-7z" /><path d="M8 18l-2 3.5M16 18l2 3.5M9 18h6" /></>,
  profile: <><path d="M3 10h10l3-3h4v10h-4l-3-3H3z" /><path d="M8 14v5M6 19h4" /></>,
  strobe: <><rect x="3" y="7" width="18" height="10" rx="1.5" /><path d="m12 8.5-2 4h4l-2 3" /></>,
  smoke: <><rect x="3" y="12" width="12" height="8" rx="1.5" /><path d="M15 15h2" /><path d="M18 13c2-1 2-3 0-4s0-3 2-4" /></>,
  dimmer: <><rect x="3" y="5" width="18" height="14" rx="1.5" /><path d="M7 15V9M12 15v-4M17 15v-2" /></>,
  lightdesk: <><path d="M2.5 18.5 5 6h14l2.5 12.5z" />{[8, 11, 14, 17].map((x) => <circle key={x} cx={x} cy="10" r="1.2" />)}<path d="M8 13.5v2.5M11 13.5v2.5M14 13.5v2.5M17 13.5v2.5" /></>,
  dmxnode: <><rect x="3" y="7" width="18" height="10" rx="1.5" />{[7.5, 12, 16.5].map((x) => <circle key={x} cx={x} cy="12" r="2" />)}</>,
  camera: <><rect x="2.5" y="7" width="13" height="10" rx="1.5" /><path d="m15.5 10.5 6-3v9l-6-3z" /></>,
  ptz: <><path d="M5 20h14M8 20v-3h8v3" /><path d="M6 17a6 6 0 0 1 12 0" /><circle cx="12" cy="12" r="2.2" /></>,
  ptzdesk: <><rect x="3" y="9" width="18" height="10" rx="1.5" /><path d="M12 9V5" /><circle cx="12" cy="4" r="1.5" /><path d="M6 13h4M6 16h4" /><circle cx="16" cy="14.5" r="2" /></>,
  projector: <><rect x="2.5" y="8" width="13" height="8" rx="1.5" /><circle cx="11" cy="12" r="2" /><path d="m15.5 10 6-3M15.5 14l6 3" /></>,
  led: <><rect x="2.5" y="4" width="19" height="13" rx="1" /><path d="M2.5 8.5h19M2.5 12.5h19M8.5 4v13M15 4v13M10 21h4M12 17v4" /></>,
  videomixer: <><path d="M2.5 18.5 5 6h14l2.5 12.5z" /><rect x="7" y="9" width="3" height="2" /><rect x="11" y="9" width="3" height="2" /><rect x="15" y="9" width="2.5" height="2" /><path d="M10 14.5h5" /></>,
  recorder: <><rect x="2.5" y="6" width="19" height="12" rx="1.5" /><circle cx="7.5" cy="12" r="2.5" /><path d="M13 10.5h5M13 13.5h5" /></>,
  converter: <><rect x="6" y="7" width="12" height="10" rx="1.5" /><path d="M2 12h4M18 12h4M10 10l2 2-2 2M13 10l2 2-2 2" /></>,
  server: <><rect x="3" y="4" width="18" height="7" rx="1.2" /><rect x="3" y="13" width="18" height="7" rx="1.2" /><path d="M6.5 7.5h4M6.5 16.5h4" /><circle cx="17" cy="7.5" r="1" /><circle cx="17" cy="16.5" r="1" /></>,
  switch: <><rect x="2.5" y="8" width="19" height="8" rx="1.2" />{[5.5, 8.5, 11.5, 14.5].map((x) => <rect key={x} x={x} y="10.5" width="2" height="3" />)}<circle cx="18.5" cy="12" r="1" /></>,
  computer: <><rect x="3" y="4" width="18" height="12" rx="1.5" /><path d="M8 20h8M12 16v4" /></>,
  wifi: <><path d="M3 9a13 13 0 0 1 18 0M6 12.5a8.5 8.5 0 0 1 12 0M9 16a4 4 0 0 1 6 0" /><circle cx="12" cy="19" r="1" /></>,
  power: <><rect x="3.5" y="3" width="17" height="18" rx="2" /><path d="m13 6-4 7h4l-2 5" /></>,
  ups: <><rect x="3" y="7" width="16" height="11" rx="1.5" /><path d="M19 10.5h2v4h-2M11 9l-2.5 4.5h3.5l-2 3" /></>,
  charger: <><rect x="7" y="4" width="10" height="17" rx="2" /><path d="M10 2.5h4M13 8l-2.5 4h3l-2 4" /></>,
  panel: <><rect x="2" y="8" width="20" height="8" rx="1" />{[5, 8, 11, 14, 17].map((x) => <circle key={x} cx={x + 0.5} cy="12" r="1.4" />)}</>,
  multicore: <><circle cx="6" cy="12" r="3.5" /><path d="M9.5 12h4M13.5 12l5-6M13.5 12l5 0M13.5 12l5 6" /></>,
  drawer: <><rect x="2.5" y="6" width="19" height="12" rx="1.2" /><path d="M9 12h6" /></>,
  lavalier: <><circle cx="12" cy="6" r="2.5" /><path d="M12 8.5c0 5-6 4-6 9.5M10 6h4" /><rect x="3.5" y="18" width="5" height="3.5" rx="1" /></>,
  headset: <><path d="M5 13a7 7 0 0 1 14 0" /><rect x="3.5" y="12" width="3" height="5" rx="1.2" /><path d="M6.5 16c2 3 6 3.5 9 2.5" /><circle cx="16.5" cy="18.3" r="1.3" /></>,
  handheld: <><circle cx="12" cy="5" r="3" /><path d="M9.5 7.5 10.5 21h3l1-13.5" /><path d="M10.8 13h2.4" /></>,
  bodypack: <><rect x="6" y="6" width="12" height="15" rx="2" /><path d="M9 6V2.5M10 11h4M10 14h4" /></>,
  plugon: <><rect x="8" y="9" width="8" height="12" rx="1.5" /><path d="M10 9V4.5h4V9M11 6.5h2" /><path d="M10.5 13h3" /></>,
  iemtx: <><rect x="2.5" y="11" width="19" height="8" rx="1.5" /><path d="M12 11V3" /><path d="M9 5.5a4 4 0 0 1 6 0" /><path d="M6 15h4M14 15h4" /></>,
  rfrack: <><rect x="2.5" y="10" width="19" height="9" rx="1.5" /><path d="M6 10 4 3M18 10l2-7" />{[8, 11, 14, 17].map((x) => <circle key={x} cx={x} cy="14.5" r="1" />)}</>,
  column: <><rect x="9" y="2" width="6" height="20" rx="1.5" />{[5, 8.5, 12, 15.5, 19].map((y) => <circle key={y} cx="12" cy={y} r="1.2" />)}</>,
  beam: <><path d="M6 21h12M9 21v-3h6v3M7 18V9M17 18V9" /><rect x="9" y="5" width="6" height="8" rx="3" /><path d="M12 5V1.5" /></>,
  bar: <><rect x="2" y="9" width="20" height="6" rx="1.5" />{[5, 9, 13, 17].map((x) => <circle key={x} cx={x + 1} cy="12" r="1.3" />)}<path d="M7 15v3M17 15v3" /></>,
  blinder: <><rect x="3" y="3" width="18" height="18" rx="1.5" />{[8, 16].flatMap((y) => [8, 16].map((x) => <circle key={`${x}${y}`} cx={x} cy={y} r="2.4" />))}</>,
  personalmixer: <><rect x="4" y="3" width="16" height="18" rx="2" /><rect x="7" y="6" width="10" height="4" rx="0.8" />{[8, 12, 16].map((x) => <circle key={x} cx={x} cy="15" r="1.5" />)}</>,
  ceiling: <><path d="M3 4h18" /><rect x="5" y="6" width="14" height="5" rx="1" />{[8, 12, 16].map((x) => <circle key={x} cx={x} cy="8.5" r="0.9" />)}<path d="M8 15l-2 3M12 15v4M16 15l2 3" /></>,
  gooseneck: <><path d="M4 21h9M8.5 21v-3" /><rect x="4" y="15" width="9" height="3" rx="1" /><path d="M8.5 15c0-6 3-9 9-10" /><rect x="16.5" y="3" width="4" height="3" rx="1" transform="rotate(-20 18.5 4.5)" /></>,
  earphones: <><circle cx="7" cy="8" r="3" /><circle cx="17" cy="8" r="3" /><path d="M7 11c0 5 5 5 5 9M17 11c0 5-5 5-5 9" /></>,
  blank: <><rect x="2.5" y="8" width="19" height="8" rx="1" /><circle cx="5" cy="12" r="0.8" /><circle cx="19" cy="12" r="0.8" /></>,
  lamp: <><path d="M5 21h6M8 21v-3" /><path d="M8 18c0-7 3-11 9-12" /><path d="M14 4l6 2-1.5 4.5" /></>,
  fan: <><rect x="2.5" y="6" width="19" height="12" rx="1.2" /><circle cx="8" cy="12" r="3.5" /><circle cx="16" cy="12" r="3.5" /><path d="M8 8.5v7M16 8.5v7" /></>,
  splitter: <><rect x="3" y="7" width="18" height="10" rx="1.5" /><circle cx="6.5" cy="12" r="1.8" />{[11, 14.5, 18].map((x) => <circle key={x} cx={x} cy="12" r="1.4" />)}</>,
  dropbox: <><rect x="3" y="5" width="18" height="12" rx="1.5" />{[7, 11].flatMap((y) => [7, 11, 15].map((x) => <circle key={`${x}${y}`} cx={x + 1} cy={y + 1} r="1.2" />))}<path d="M12 17v4" /></>,
  box: <><rect x="4" y="6" width="16" height="12" rx="2" /><path d="M4 10h16" /></>,
}

export function DeviceSymbol({ name, size = 24, color = 'currentColor' }: { name: string; size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {S[name] ?? S.box}
    </svg>
  )
}
