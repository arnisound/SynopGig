import { describe, expect, it } from 'vitest'
import { CONNECTOR_OPTIONS, CONNECTORS, SIGNAL_OPTIONS, SIGNALS, checkLink, refineSignal } from './connectors'
import { FAMILY_ORDER, LIBRARY } from './library'
import type { Port } from '../types'

const p = (signal: Port['signal'], dir: Port['dir'] = 'io', label = 'Port'): Port => ({ id: 'x', label, connector: 'ethercon', signal, dir })

describe('signals on a network', () => {
  it('lets Dante, Art-Net or NDI go through a plain network switch', () => {
    for (const s of ['dante', 'avb', 'artnet', 'ndi', 'control-ip'] as const) expect(checkLink(p(s), p('network'))).toEqual([])
    expect(checkLink(p('dante'), p('artnet'))).toEqual([])
  })

  it('still warns when a console link meets an IP network', () => {
    expect(checkLink(p('audio-link'), p('network'))[0].message).toContain('Signal incompatible')
  })

  it('reads what a catalogue port carries from its name', () => {
    expect(refineSignal(p('network', 'io', 'Dante primaire'))).toBe('dante')
    expect(refineSignal(p('network', 'io', 'Art-Net / sACN'))).toBe('artnet')
    expect(refineSignal(p('audio-digital', 'io', 'AES50 A'))).toBe('audio-link')
    expect(refineSignal(p('network', 'io', 'Réseau'))).toBe('network')
    expect(refineSignal(p('network', 'io', 'Ethernet OCA A'))).toBe('control-ip')
    expect(refineSignal(p('network', 'io', 'EtherSound in'))).toBe('audio-link')
    expect(LIBRARY.some((t) => t.ports.some((q) => q.signal === 'dante'))).toBe(true)
  })
})

describe('alphabetical order', () => {
  const sorted = (l: string[]) => [...l].sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base', numeric: true }))
  it('sorts the menus and the families', () => {
    expect(SIGNAL_OPTIONS.map((k) => SIGNALS[k].label)).toEqual(sorted(SIGNAL_OPTIONS.map((k) => SIGNALS[k].label)))
    expect(CONNECTOR_OPTIONS.map((k) => CONNECTORS[k])).toEqual(sorted(CONNECTOR_OPTIONS.map((k) => CONNECTORS[k])))
    expect(FAMILY_ORDER).toEqual(sorted(FAMILY_ORDER))
  })
})
