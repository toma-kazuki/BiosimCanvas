import { useEffect, useRef, useState } from "react";
import { MODULE_KNOWLEDGE } from "../../domain/moduleKnowledge";

interface Props {
  moduleType: string;
  children: React.ReactElement;
  /** Suppress the tooltip entirely (e.g. during drag or when node is selected). */
  suppress?: boolean;
}

/**
 * Wraps a single child element and shows a physics summary tooltip on hover
 * after a 300 ms delay. The tooltip is rendered into a portal-like fixed
 * positioned div so it is never clipped by overflow:hidden containers.
 *
 * Implements F-KNOW-1: physics tooltip on palette items and canvas nodes.
 */
export function PhysicsTooltip({ moduleType, children, suppress = false }: Props) {
  const entry = MODULE_KNOWLEDGE[moduleType];
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const show = (e: React.MouseEvent) => {
    if (suppress || !entry) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    // Position tooltip to the right of the hovered element; flip left near
    // the right edge.
    const tipX = rect.right + 8;
    const tipY = rect.top;
    setPos({ x: tipX, y: tipY });
    timerRef.current = setTimeout(() => setVisible(true), 300);
  };

  const hide = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
  };

  // Cancel on unmount
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  // Also hide when suppress flips true mid-hover
  useEffect(() => { if (suppress) hide(); }, [suppress]);

  if (!entry) return children;

  const consumers = entry.ports.filter((p) => p.direction === "consumer");
  const producers = entry.ports.filter((p) => p.direction === "producer");

  return (
    <div
      ref={wrapRef}
      style={{ display: "contents" }}
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      {children}
      {visible && (
        <div
          className="physics-tooltip"
          style={{ left: pos.x, top: pos.y }}
          // Prevent the tooltip itself from triggering the parent's mouse events
          onMouseEnter={(e) => e.stopPropagation()}
        >
          <div className="pt-title">{moduleType}</div>
          <div className="pt-summary">{entry.summary}</div>
          {consumers.length > 0 && (
            <div className="pt-row">
              <span className="pt-label">Consumes</span>
              <span>{consumers.map((p) => p.tag).join(", ")}</span>
            </div>
          )}
          {producers.length > 0 && (
            <div className="pt-row">
              <span className="pt-label">Produces</span>
              <span>{producers.map((p) => p.tag).join(", ")}</span>
            </div>
          )}
          <div className="pt-row pt-malf">
            <span className="pt-label">SEVERE malf</span>
            <span>{entry.malfunctionBehavior.severe}</span>
          </div>
        </div>
      )}
    </div>
  );
}
