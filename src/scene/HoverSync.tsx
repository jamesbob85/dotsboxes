import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'

// When the set of mounted meshes changes (e.g., the bot just drew a line, so
// one UndrawnLine unmounted and possibly a different one is now under the
// cursor), R3F's pointer system doesn't re-fire enter events on a stationary
// cursor. Calling events.update() re-raycasts at the current pointer
// position and fires the appropriate enter/leave events.
export default function HoverSync({ trigger }: { trigger: unknown }) {
  const events = useThree((s) => s.events)
  useEffect(() => {
    if (events && typeof events.update === 'function') {
      events.update()
    }
  }, [trigger, events])
  return null
}
