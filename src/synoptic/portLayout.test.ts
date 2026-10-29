import { expect, it } from 'vitest'
import type { Port } from '../types'
import { portSides } from './portLayout'

const p = (id: string, dir: Port['dir'], side?: Port['side']): Port => ({ id, label: id, connector: 'xlr3', signal: 'audio-analog', dir, ...(side ? { side } : {}) })

it('puts inputs left and outputs right, unless the user chose a side', () => {
  const ports = [p('in1', 'in'), p('out1', 'out'), p('in2', 'in', 'right'), p('out2', 'out', 'left')]
  const { left, right } = portSides(ports)
  expect(left.map((x) => x.id)).toEqual(['in1', 'out2'])
  expect(right.map((x) => x.id)).toEqual(['out1', 'in2'])
})
