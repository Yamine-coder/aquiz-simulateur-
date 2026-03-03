'use client'

import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useEffect, useRef, useState } from 'react'

export default function TestMapPage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [log, setLog] = useState<string[]>([])

  const addLog = (msg: string) => {
    console.log('[TestMap]', msg)
    setLog(prev => [...prev, `${new Date().toLocaleTimeString()} — ${msg}`])
  }

  useEffect(() => {
    if (!containerRef.current) {
      addLog('ERROR: containerRef is null')
      return
    }

    const rect = containerRef.current.getBoundingClientRect()
    addLog(`Container: ${rect.width}x${rect.height} at (${rect.left},${rect.top})`)

    if (rect.width === 0 || rect.height === 0) {
      addLog('ERROR: Container has zero dimensions!')
      return
    }

    addLog('Creating map...')

    let map: maplibregl.Map
    try {
      map = new maplibregl.Map({
        container: containerRef.current,
        style: {
          version: 8,
          sources: {
            carto: {
              type: 'raster',
              tiles: ['https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png'],
              tileSize: 256,
            },
          },
          layers: [{ id: 'carto', type: 'raster', source: 'carto' }],
        },
        center: [2.35, 48.86],
        zoom: 10,
      })
    } catch (err) {
      addLog(`ERROR creating map: ${err}`)
      return
    }

    addLog('Map created, waiting for events...')

    map.on('load', () => addLog('✅ EVENT: load'))
    map.on('style.load', () => addLog('✅ EVENT: style.load'))
    map.on('render', () => addLog('✅ EVENT: first render'))
    map.once('idle', () => addLog('✅ EVENT: idle'))
    map.on('error', (e) => addLog(`❌ ERROR: ${e.error?.message || JSON.stringify(e)}`))

    return () => {
      addLog('Cleanup: removing map')
      map.remove()
    }
  }, [])

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: 12, background: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
        <h1 style={{ fontSize: 16, fontWeight: 700 }}>Test MapLibre GL — Diagnostic</h1>
      </div>
      <div style={{ flex: 1, position: 'relative' }}>
        <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
      </div>
      <div style={{ maxHeight: 200, overflow: 'auto', padding: 8, background: '#1e293b', color: '#94a3b8', fontFamily: 'monospace', fontSize: 11 }}>
        {log.length === 0 && <p>Waiting...</p>}
        {log.map((l, i) => (
          <p key={i} style={{ margin: '2px 0', color: l.includes('ERROR') ? '#ef4444' : l.includes('✅') ? '#22c55e' : '#94a3b8' }}>{l}</p>
        ))}
      </div>
    </div>
  )
}
