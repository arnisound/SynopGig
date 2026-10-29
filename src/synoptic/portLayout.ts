import type { Port } from '../types'

/**
 * Which side of the device box each port sits on. Devices without plain
 * inputs (switches, laptops...) get their bidirectional ports spread on both
 * sides to keep cables short; patch panels show the inside face on the left.
 * A side the user chose wins.
 */
export function portSides(ports: Port[], visible: Port[] = ports) {
  const spread = !ports.some((p) => p.dir === 'in' && p.signal !== 'power')
  const io = ports.filter((p) => p.dir === 'io')
  const onLeft = (p: Port) =>
    p.face ? p.face === 'int' : p.side ? p.side === 'left' : p.dir === 'in' || (spread && p.dir === 'io' && io.indexOf(p) % 2 === 0)
  return { left: visible.filter(onLeft), right: visible.filter((p) => !onLeft(p)) }
}
