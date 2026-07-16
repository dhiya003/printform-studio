import React, { useMemo, useRef, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Text, RoundedBox, Environment, Grid } from '@react-three/drei'
import * as THREE from 'three'
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js'
import './styles.css'

type ProductType = 'magnet' | 'keychain'
type ShapeType = 'rounded' | 'circle'

type Params = {
  product: ProductType
  shape: ShapeType
  width: number
  height: number
  thickness: number
  cornerRadius: number
  text: string
  textHeight: number
  holeDiameter: number
  magnetDiameter: number
  magnetDepth: number
}

const DEFAULTS: Params = {
  product: 'magnet',
  shape: 'rounded',
  width: 70,
  height: 50,
  thickness: 2.4,
  cornerRadius: 5,
  text: 'DIVYAAAA',
  textHeight: 1.2,
  holeDiameter: 5,
  magnetDiameter: 10,
  magnetDepth: 2,
}

function Model({ p, rootRef }: { p: Params; rootRef: React.MutableRefObject<THREE.Group | null> }) {
  const fontSize = Math.min(p.width, p.height) * 0.18
  const keychainHoleX = p.width / 2 - Math.max(6, p.holeDiameter)

  return (
    <group ref={rootRef} rotation={[-0.15, 0.25, 0]}>
      {p.shape === 'rounded' ? (
        <RoundedBox args={[p.width, p.height, p.thickness]} radius={Math.min(p.cornerRadius, p.height / 3)} smoothness={8}>
          <meshStandardMaterial color="#e6c8a5" roughness={0.55} metalness={0.05} />
        </RoundedBox>
      ) : (
        <mesh>
          <cylinderGeometry args={[p.width / 2, p.width / 2, p.thickness, 96]} />
          <meshStandardMaterial color="#e6c8a5" roughness={0.55} metalness={0.05} />
        </mesh>
      )}

      <Text
        position={[0, 0, p.thickness / 2 + p.textHeight / 2]}
        fontSize={fontSize}
        maxWidth={p.width * 0.78}
        anchorX="center"
        anchorY="middle"
        depthOffset={-1}
      >
        {p.text || 'TEXT'}
        <meshStandardMaterial color="#4c2f24" />
      </Text>

      {p.product === 'keychain' && p.shape === 'rounded' && (
        <mesh position={[keychainHoleX, p.height / 2 - Math.max(6, p.holeDiameter), p.thickness / 2 + 0.2]}>
          <torusGeometry args={[p.holeDiameter / 2 + 1.2, 1.2, 18, 48]} />
          <meshStandardMaterial color="#4c2f24" />
        </mesh>
      )}

      {p.product === 'magnet' && (
        <mesh position={[0, 0, -p.thickness / 2 - 0.05]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[p.magnetDiameter / 2, p.magnetDiameter / 2, Math.min(p.magnetDepth, p.thickness - 0.4), 48]} />
          <meshStandardMaterial color="#777" />
        </mesh>
      )}
    </group>
  )
}

function NumberInput({ label, value, min, max, step = 0.1, onChange }: { label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void }) {
  return (
    <label className="field">
      <span>{label}</span>
      <div className="number-wrap">
        <input type="number" value={value} min={min} max={max} step={step} onChange={(e) => onChange(Number(e.target.value))} />
        <em>mm</em>
      </div>
    </label>
  )
}

function App() {
  const [p, setP] = useState<Params>(DEFAULTS)
  const rootRef = useRef<THREE.Group | null>(null)

  const warnings = useMemo(() => {
    const list: string[] = []
    if (p.thickness < 1.6) list.push('Base thickness is fragile; use at least 1.6 mm.')
    if (p.textHeight < 0.6) list.push('Raised text may not print cleanly below 0.6 mm.')
    if (p.product === 'magnet' && p.magnetDepth > p.thickness - 0.4) list.push('Magnet recess is too deep for the selected base thickness.')
    if (p.width > 256 || p.height > 256) list.push('Model may exceed the Bambu P1S build plate.')
    if (p.shape === 'circle' && Math.abs(p.width - p.height) > 0.1) list.push('Circle mode uses width as the diameter; height is ignored.')
    return list
  }, [p])

  const update = <K extends keyof Params>(key: K, value: Params[K]) => setP((prev) => ({ ...prev, [key]: value }))

  const exportStl = () => {
    const source = rootRef.current
    if (!source) return
    source.updateMatrixWorld(true)
    const clone = source.clone(true)
    clone.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry = obj.geometry.clone()
        obj.geometry.applyMatrix4(obj.matrixWorld)
        obj.position.set(0, 0, 0)
        obj.rotation.set(0, 0, 0)
        obj.scale.set(1, 1, 1)
        obj.updateMatrix()
      }
    })
    const exporter = new STLExporter()
    const result = exporter.parse(clone, { binary: true }) as DataView
    const bytes = new Uint8Array(result.buffer as ArrayBuffer, result.byteOffset, result.byteLength)
    const blob = new Blob([bytes], { type: 'model/stl' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${p.product}-${p.text || 'model'}.stl`.replace(/\s+/g, '-').toLowerCase()
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="app-shell">
      <header>
        <div>
          <span className="eyebrow">3D PRINTING MODEL GENERATOR</span>
          <h1>PrintForm Studio</h1>
          <p>Create simple printable products without traditional CAD.</p>
        </div>
        <button className="primary" onClick={exportStl}>Export STL</button>
      </header>

      <main>
        <aside className="panel controls">
          <section>
            <h2>Product</h2>
            <div className="segmented">
              <button className={p.product === 'magnet' ? 'active' : ''} onClick={() => update('product', 'magnet')}>Fridge Magnet</button>
              <button className={p.product === 'keychain' ? 'active' : ''} onClick={() => update('product', 'keychain')}>Keychain</button>
            </div>
          </section>

          <section>
            <h2>Shape</h2>
            <div className="segmented">
              <button className={p.shape === 'rounded' ? 'active' : ''} onClick={() => update('shape', 'rounded')}>Rounded</button>
              <button className={p.shape === 'circle' ? 'active' : ''} onClick={() => update('shape', 'circle')}>Circle</button>
            </div>
          </section>

          <section className="grid-fields">
            <NumberInput label="Width" value={p.width} min={20} max={256} onChange={(v) => update('width', v)} />
            <NumberInput label="Height" value={p.height} min={20} max={256} onChange={(v) => update('height', v)} />
            <NumberInput label="Base thickness" value={p.thickness} min={1} max={10} onChange={(v) => update('thickness', v)} />
            <NumberInput label="Corner radius" value={p.cornerRadius} min={0} max={25} onChange={(v) => update('cornerRadius', v)} />
          </section>

          <section>
            <label className="field">
              <span>Raised text</span>
              <input type="text" value={p.text} maxLength={24} onChange={(e) => update('text', e.target.value)} />
            </label>
            <NumberInput label="Text height" value={p.textHeight} min={0.4} max={5} onChange={(v) => update('textHeight', v)} />
          </section>

          {p.product === 'magnet' ? (
            <section className="grid-fields">
              <NumberInput label="Magnet diameter" value={p.magnetDiameter} min={4} max={30} onChange={(v) => update('magnetDiameter', v)} />
              <NumberInput label="Magnet depth" value={p.magnetDepth} min={0.5} max={5} onChange={(v) => update('magnetDepth', v)} />
            </section>
          ) : (
            <section>
              <NumberInput label="Keyring hole" value={p.holeDiameter} min={3} max={12} onChange={(v) => update('holeDiameter', v)} />
            </section>
          )}

          <section className="preset-row">
            <button onClick={() => setP(DEFAULTS)}>Reset</button>
            <button onClick={() => setP({ ...DEFAULTS, product: 'keychain', width: 75, height: 28, text: 'SASHVIN' })}>Keychain preset</button>
          </section>
        </aside>

        <section className="workspace">
          <div className="canvas-card">
            <Canvas camera={{ position: [95, 80, 110], fov: 36 }} shadows>
              <ambientLight intensity={1.3} />
              <directionalLight position={[50, 80, 50]} intensity={2.2} castShadow />
              <Model p={p} rootRef={rootRef} />
              <Grid args={[300, 300]} cellSize={10} sectionSize={50} fadeDistance={280} fadeStrength={1} infiniteGrid />
              <OrbitControls makeDefault minDistance={60} maxDistance={300} />
              <Environment preset="studio" />
            </Canvas>
            <div className="hint">Drag to rotate · Scroll to zoom</div>
          </div>

          <div className="info-grid">
            <article className="panel stat">
              <span>Model size</span>
              <strong>{p.width} × {p.shape === 'circle' ? p.width : p.height} × {(p.thickness + p.textHeight).toFixed(1)} mm</strong>
            </article>
            <article className="panel stat">
              <span>Suggested nozzle</span>
              <strong>{p.textHeight < 0.8 ? '0.2 mm' : '0.4 mm'}</strong>
            </article>
            <article className="panel warnings">
              <span>Printability check</span>
              {warnings.length ? warnings.map((w) => <p key={w}>⚠ {w}</p>) : <p className="ok">✓ Basic checks passed</p>}
            </article>
          </div>
        </section>
      </main>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><App /></React.StrictMode>
)
