import { describe, expect, it } from 'vitest'
import { LIBRARY } from '../data/library'
import { findKnownModels } from './findKnown'

const names = (text: string) => findKnownModels(text, LIBRARY).map((t) => `${t.brand} ${t.model}`)

describe('instant lookup', () => {
  it('finds a model named in the sheet', () => {
    expect(names('YAMAHA Rio1608-D2 I/O rack, 16 inputs')[0]).toBe('Yamaha Rio1608-D2')
    expect(names('Mixing console Yamaha MG10XU')[0]).toBe('Yamaha MG10XU (analogique)')
  })

  it('tolerates spaces and dashes in the model name', () => {
    expect(names('Shure ULX-D4D digital wireless')).toContain('Shure ULXD4D')
  })

  it('needs the brand too', () => {
    expect(names('Generic box compatible with Rio1608-D2 cables')).toEqual([])
  })

  it('ignores sheets that name nothing we know', () => {
    expect(names('Acme Super Mixer 3000 with 4 XLR inputs')).toEqual([])
  })
})
