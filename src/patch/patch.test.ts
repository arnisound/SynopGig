import { describe, expect, it } from 'vitest'
import { demoProject } from '../project'
import { buildPatch, channelsBySource } from './patch'

describe('patch lists', () => {
  const p = demoProject()

  it('lists the stage sources on the stagebox inputs, through the patch panel', () => {
    const { inputs } = buildPatch(p)
    expect(inputs.length).toBeGreaterThan(0)
    // The source is the microphone, not the panel it goes through.
    for (const r of inputs) expect(r.far?.node.data.panel).toBeUndefined()
    expect(inputs.map((r) => r.channel)).toEqual(inputs.map((_, i) => String(i + 1)))
  })

  it('keeps the edits made on a line', () => {
    const first = buildPatch(p).inputs[0]
    const edited = { ...p, patch: { inputs: { [first.key]: { channel: '12', name: 'Lead', stand: 'Grand pied perche', phantom: true } } } }
    const r = buildPatch(edited).inputs[0]
    expect(r).toMatchObject({ channel: '12', name: 'Lead', stand: 'Grand pied perche', phantom: true })
    expect(channelsBySource(edited).get(first.far!.node.id)).toEqual(['12'])
  })

  it('lists what the outputs feed', () => {
    const { outputs } = buildPatch(p)
    for (const r of outputs) expect(r.far).toBeDefined()
  })
})
