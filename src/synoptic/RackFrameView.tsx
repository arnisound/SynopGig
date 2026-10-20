import type { Node, NodeProps } from '@xyflow/react'
import { memo } from 'react'

export type FrameNode = Node<{ label: string; color: string }, 'rackFrame'>

/** Outline drawn behind the devices mounted in the same rack. */
function RackFrameView({ data }: NodeProps<FrameNode>) {
  return (
    <div className="rack-frame" style={{ ['--frame' as string]: data.color }}>
      <div className="frame-head" title="Glisser pour déplacer tout le rack">▦ {data.label}</div>
    </div>
  )
}

export default memo(RackFrameView)
