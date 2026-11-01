import { describe, expect, it } from 'vitest'
import type { Port } from '../types'
import { checkLink, checkRun } from './connectors'

const port = (connector: Port['connector'], signal: Port['signal'], dir: Port['dir'], label = 'x'): Port => ({ id: label, label, connector, signal, dir })

describe('cables', () => {
  it('takes a power cord for granted, but not a 32 A to 16 A adapter', () => {
    expect(checkLink(port('schuko', 'power', 'out'), port('iec', 'power', 'in'))).toEqual([])
    expect(checkLink(port('powercon-true1', 'power', 'out'), port('iec', 'power', 'in'))).toEqual([])
    expect(checkLink(port('p17-32a', 'power', 'out'), port('p17-16a', 'power', 'in')).map((i) => i.message)[0]).toMatch(/Adaptateur/)
  })

  it('warns of a 12G source into a 3G input, and of runs too long', () => {
    expect(checkLink(port('sdi', 'video', 'out', '12G-SDI out'), port('sdi', 'video', 'in', '3G-SDI in'))[0].message).toMatch(/3G/)
    expect(checkRun(port('hdmi', 'video', 'out'), port('hdmi', 'video', 'in'), 20)[0].message).toMatch(/HDMI/)
    expect(checkRun(port('sdi', 'video', 'out', '12G-SDI out'), port('sdi', 'video', 'in', '12G-SDI in'), 90)[0].message).toMatch(/12G/)
    expect(checkRun(port('sdi', 'video', 'out', '12G-SDI out'), port('sdi', 'video', 'in', '12G-SDI in'), 50)).toEqual([])
    expect(checkRun(port('ethercon', 'network', 'io'), port('ethercon', 'network', 'io'), 120)[0].message).toMatch(/100 m/)
  })
})
