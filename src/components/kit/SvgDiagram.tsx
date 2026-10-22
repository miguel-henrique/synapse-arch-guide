import { useId, useState, type ReactNode } from 'react';
import './SvgDiagram.css';

// ─────────────────────────────────────────────────────────────────────────────
// A small, dependency-free architecture-diagram renderer.
//
// Nodes are rectangles placed on a fixed viewBox (so the drawing scales with
// the container). Edges are straight or gently curved arrows clipped to the
// node borders. Clicking a node highlights it plus its edges and opens a
// detail panel under the drawing (with the files that implement it).
// ─────────────────────────────────────────────────────────────────────────────

export interface DiagramNode {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  /** Second line(s); "\n" splits lines. */
  sub?: string;
  color: string;
  /** Shown in the detail panel when the node is clicked. */
  detail?: ReactNode;
  files?: string[];
  /** Visual style: solid (default), ghost (dashed, "proposed"), danger. */
  variant?: 'solid' | 'ghost' | 'danger';
}

export interface DiagramEdge {
  from: string;
  to: string;
  label?: string;
  dashed?: boolean;
  /** Perpendicular bend in viewBox units (0 = straight). */
  curve?: number;
  color?: string;
  /** Draw arrowheads on both ends. */
  both?: boolean;
}

export interface DiagramGroup {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  color: string;
}

interface Props {
  width: number;
  height: number;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  groups?: DiagramGroup[];
  /** Minimum rendered width in px before the drawing scrolls horizontally. */
  minWidth?: number;
  hint?: string;
  initial?: string | null;
  caption?: ReactNode;
}

type Pt = { x: number; y: number };

const DEFAULT_EDGE = 'var(--text-dim)';

function center(n: DiagramNode): Pt {
  return { x: n.x + n.w / 2, y: n.y + n.h / 2 };
}

/** Where the ray from the node centre towards `toward` leaves the rectangle. */
function clip(n: DiagramNode, toward: Pt, pad = 4): Pt {
  const c = center(n);
  const dx = toward.x - c.x;
  const dy = toward.y - c.y;
  if (dx === 0 && dy === 0) return c;
  const sx = dx === 0 ? Infinity : (n.w / 2 + pad) / Math.abs(dx);
  const sy = dy === 0 ? Infinity : (n.h / 2 + pad) / Math.abs(dy);
  const s = Math.min(sx, sy);
  return { x: c.x + dx * s, y: c.y + dy * s };
}

export default function SvgDiagram({
  width,
  height,
  nodes,
  edges,
  groups = [],
  minWidth = 720,
  hint = 'Click any box to see what it is and where it lives in the code.',
  initial = null,
  caption,
}: Props) {
  const uid = useId().replace(/:/g, '');
  const [sel, setSel] = useState<string | null>(initial);
  const byId = new Map(nodes.map(n => [n.id, n]));
  const selected = sel ? byId.get(sel) : undefined;
  const colors = Array.from(new Set(edges.map(e => e.color ?? DEFAULT_EDGE)));

  function edgeGeom(e: DiagramEdge) {
    const a = byId.get(e.from);
    const b = byId.get(e.to);
    if (!a || !b) return null;
    const ca = center(a);
    const cb = center(b);
    const bend = e.curve ?? 0;
    // control point: perpendicular offset from the midpoint
    const mx = (ca.x + cb.x) / 2;
    const my = (ca.y + cb.y) / 2;
    const len = Math.hypot(cb.x - ca.x, cb.y - ca.y) || 1;
    const nx = -(cb.y - ca.y) / len;
    const ny = (cb.x - ca.x) / len;
    const ctrl = { x: mx + nx * bend, y: my + ny * bend };
    const p0 = clip(a, bend ? ctrl : cb);
    const p1 = clip(b, bend ? ctrl : ca);
    const d = bend
      ? `M ${p0.x} ${p0.y} Q ${ctrl.x} ${ctrl.y} ${p1.x} ${p1.y}`
      : `M ${p0.x} ${p0.y} L ${p1.x} ${p1.y}`;
    const mid = bend
      ? { x: 0.25 * p0.x + 0.5 * ctrl.x + 0.25 * p1.x, y: 0.25 * p0.y + 0.5 * ctrl.y + 0.25 * p1.y }
      : { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };
    return { d, mid };
  }

  const isLit = (e: DiagramEdge) => !sel || e.from === sel || e.to === sel;

  const nodesLayer = nodes.map(n => {
            const lines = n.sub ? n.sub.split('\n') : [];
            const active = sel === n.id;
            const dim = sel && !active && !edges.some(e => (e.from === sel && e.to === n.id) || (e.to === sel && e.from === n.id));
            const totalLines = 1 + lines.length;
            const startY = n.y + n.h / 2 - ((totalLines - 1) * 15) / 2 + 5;
            // Shrink text that would overflow the box (monospace ≈ 0.62em/char).
            const subLen = Math.max(1, ...lines.map(l => l.length));
            const subSize = Math.min(11, (n.w - 14) / (subLen * 0.62));
            const labelSize = Math.min(13.5, (n.w - 14) / (n.label.length * 0.58));
            return (
              <g
                key={n.id}
                className={`svgd__node svgd__node--${n.variant ?? 'solid'} ${active ? 'svgd__node--active' : ''} ${dim ? 'svgd__node--dim' : ''}`}
                onClick={() => setSel(s => (s === n.id ? null : n.id))}
                tabIndex={0}
                role="button"
                aria-label={n.label}
                onKeyDown={ev => { if (ev.key === 'Enter' || ev.key === ' ') setSel(s => (s === n.id ? null : n.id)); }}
              >
                <rect
                  x={n.x}
                  y={n.y}
                  width={n.w}
                  height={n.h}
                  rx={10}
                  style={{ stroke: n.color, fill: n.color }}
                  className="svgd__node-rect"
                />
                <text x={n.x + n.w / 2} y={startY} textAnchor="middle" className="svgd__node-label" style={{ fontSize: labelSize }}>{n.label}</text>
                {lines.map((l, i) => (
                  <text key={i} x={n.x + n.w / 2} y={startY + 15 * (i + 1)} textAnchor="middle" className="svgd__node-sub" style={{ fontSize: subSize }}>{l}</text>
                ))}
              </g>
            );
          });

  return (
    <div className="svgd">
      <div className="svgd__scroll">
        <svg
          className="svgd__svg"
          viewBox={`0 0 ${width} ${height}`}
          style={{ minWidth }}
          role="img"
          aria-label="Architecture diagram"
        >
          <defs>
            {colors.map((c, i) => (
              <marker key={c} id={`arrow-${uid}-${i}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" style={{ fill: c }} />
              </marker>
            ))}
          </defs>

          {groups.map(g => (
            <g key={g.id}>
              <rect x={g.x} y={g.y} width={g.w} height={g.h} rx={16} className="svgd__group" style={{ stroke: g.color }} />
              <text x={g.x + 14} y={g.y + 22} className="svgd__group-label" style={{ fill: g.color }}>{g.label}</text>
            </g>
          ))}

          {edges.map((e, i) => {
            const geo = edgeGeom(e);
            if (!geo) return null;
            const lit = isLit(e);
            const color = e.color ?? DEFAULT_EDGE;
            const marker = `url(#arrow-${uid}-${colors.indexOf(color)})`;
            return (
              <g key={i} className={`svgd__edge ${lit ? '' : 'svgd__edge--dim'}`}>
                <path
                  d={geo.d}
                  fill="none"
                  stroke={color}
                  strokeWidth={sel && lit ? 2.4 : 1.6}
                  strokeDasharray={e.dashed ? '6 5' : undefined}
                  markerEnd={marker}
                  markerStart={e.both ? marker : undefined}
                />
              </g>
            );
          })}

          {nodesLayer}

          {edges.map((e, i) => {
            const geo = edgeGeom(e);
            if (!geo || !e.label) return null;
            const lit = isLit(e);
            const color = e.color ?? DEFAULT_EDGE;
            return (
              <g key={`l${i}`} className={`svgd__edge ${lit ? '' : 'svgd__edge--dim'}`} pointerEvents="none">
                {e.label && (
                  <g>
                    <rect
                      x={geo.mid.x - (e.label.length * 6.3) / 2 - 6}
                      y={geo.mid.y - 10}
                      width={e.label.length * 6.3 + 12}
                      height={19}
                      rx={9}
                      className="svgd__edge-label-bg"
                    />
                    <text x={geo.mid.x} y={geo.mid.y + 4} textAnchor="middle" className="svgd__edge-label" style={{ fill: color }}>
                      {e.label}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

        </svg>
      </div>

      {caption && <div className="svgd__caption">{caption}</div>}

      <div className={`svgd__detail ${selected ? 'svgd__detail--open' : ''}`} style={{ '--sd-color': selected?.color ?? 'var(--border2)' } as React.CSSProperties}>
        {selected ? (
          <>
            <div className="svgd__detail-title">
              {selected.label}
              {selected.sub && <span className="svgd__detail-sub"> · {selected.sub.replace(/\n/g, ' ')}</span>}
            </div>
            {selected.detail && <div className="svgd__detail-body">{selected.detail}</div>}
            {selected.files && selected.files.length > 0 && (
              <ul className="svgd__files">
                {selected.files.map(f => <li key={f}><code>{f}</code></li>)}
              </ul>
            )}
          </>
        ) : (
          <div className="svgd__hint">👆 {hint}</div>
        )}
      </div>
    </div>
  );
}
