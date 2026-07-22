import { useEffect, useRef } from 'react'

export function useAutoRefresh(callback: () => void, intervalSec: number) {
  const savedCallback = useRef(callback)
  const busy = useRef(false)

  useEffect(() => {
    savedCallback.current = callback
  }, [callback])

  useEffect(() => {
    if (intervalSec <= 0) return
    const id = setInterval(() => {
      if (busy.current) return
      busy.current = true
      Promise.resolve(savedCallback.current()).finally(() => { busy.current = false })
    }, intervalSec * 1000)
    return () => clearInterval(id)
  }, [intervalSec])
}
