"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import type { TreeNode } from "./types";

type LayoutNode = TreeNode & { x: number; y: number; depth: number };

function layoutTree(nodes: TreeNode[], width: number, height: number): LayoutNode[] {
  if (nodes.length === 0) return [];

  const byId = new Map(nodes.map((n) => [n.id, n]));
  const byParent = new Map<string, TreeNode[]>();

  for (const n of nodes) {
    const key = n.parentId && byId.has(n.parentId) ? n.parentId : "__root__";
    const list = byParent.get(key) ?? [];
    list.push(n);
    byParent.set(key, list);
  }

  const roots = byParent.get("__root__") ?? [];
  const positioned: LayoutNode[] = [];

  const depthOf = (n: TreeNode): number => {
    let d = 0;
    let cur: TreeNode | undefined = n;
    const seen = new Set<string>();
    while (cur?.parentId && byId.has(cur.parentId) && !seen.has(cur.id)) {
      seen.add(cur.id);
      d++;
      cur = byId.get(cur.parentId);
    }
    return d;
  };

  const maxDepth = Math.max(0, ...nodes.map(depthOf));

  function place(node: TreeNode, depth: number, index: number, siblings: number) {
    const yPad = 56;
    const xPad = 80;
    const usableW = width - xPad * 2;
    const usableH = Math.max(160, height - yPad * 2 - 40);
    const x =
      siblings <= 1
        ? width / 2
        : xPad + (usableW * (index + 1)) / (siblings + 1);
    const y =
      maxDepth === 0
        ? height / 2 - 20
        : yPad + (usableH * depth) / Math.max(maxDepth, 1);

    positioned.push({ ...node, x, y, depth });
    const children = byParent.get(node.id) ?? [];
    children.forEach((child, i) => place(child, depth + 1, i, children.length));
  }

  roots.forEach((r, i) => place(r, 0, i, roots.length));

  // Safety: any node not placed (broken parent pointer) as extra roots
  const placed = new Set(positioned.map((p) => p.id));
  const missing = nodes.filter((n) => !placed.has(n.id));
  missing.forEach((n, i) => {
    positioned.push({
      ...n,
      x: 80 + ((width - 160) * (i + 1)) / (missing.length + 1),
      y: height - 70,
      depth: maxDepth + 1,
    });
  });

  return positioned;
}

function edgePath(from: LayoutNode, to: LayoutNode) {
  const x1 = from.x;
  const y1 = from.y + 32;
  const x2 = to.x;
  const y2 = to.y - 32;
  const midY = (y1 + y2) / 2;
  return `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;
}

export function ReferralTree({
  nodes,
  highlightId,
}: {
  nodes: TreeNode[];
  highlightId?: string | null;
}) {
  const width = 960;
  const height = 560;
  const laid = useMemo(() => layoutTree(nodes, width, height), [nodes]);
  const byId = useMemo(() => new Map(laid.map((n) => [n.id, n])), [laid]);

  const edges = laid
    .filter((n) => n.parentId && byId.has(n.parentId))
    .map((n) => {
      const parent = byId.get(n.parentId!)!;
      return {
        id: `${parent.id}->${n.id}`,
        from: parent,
        to: n,
        label: parent.referralCode,
        d: edgePath(parent, n),
        midX: (parent.x + n.x) / 2,
        midY: (parent.y + n.y) / 2,
      };
    });

  return (
    <div className="panel relative overflow-hidden rounded-3xl p-5 md:p-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3 px-1">
        <div>
          <p className="mono text-xs uppercase tracking-[0.28em] text-[var(--muted)]">
            Referral integrity tree
          </p>
          <p className="mt-1 text-base text-[var(--muted)] md:text-lg">
            Nodes = users · lines = referred-via link · hash under each node
          </p>
        </div>
        <span className="mono text-base text-[var(--accent)]">
          {nodes.length} {nodes.length === 1 ? "node" : "nodes"} · {edges.length}{" "}
          {edges.length === 1 ? "link" : "links"}
        </span>
      </div>

      {nodes.length === 0 ? (
        <div className="flex h-[360px] items-center justify-center rounded-2xl border border-dashed border-[var(--line)] bg-black/20 md:h-[440px]">
          <p className="max-w-md px-6 text-center text-lg text-[var(--muted)]">
            Tree is empty. The first signup becomes the root. Each referred
            signup draws a link from parent → child.
          </p>
        </div>
      ) : (
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-[400px] w-full md:h-[520px]"
          role="img"
          aria-label="Referral tree with parent-child links"
        >
          <defs>
            <linearGradient id="edgeGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3ddea8" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#7eb6ff" stopOpacity="0.85" />
            </linearGradient>
            <marker
              id="edgeArrow"
              markerWidth="10"
              markerHeight="10"
              refX="8"
              refY="3"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <path d="M0,0 L0,6 L9,3 z" fill="#7eb6ff" />
            </marker>
            <filter id="nodeGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Edges first (under nodes) - solid stroke, no pathLength (was invisible) */}
          {edges.map((e) => (
            <g key={e.id}>
              <motion.path
                d={e.d}
                fill="none"
                stroke="rgba(61,222,168,0.25)"
                strokeWidth={8}
                strokeLinecap="round"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
              />
              <motion.path
                d={e.d}
                fill="none"
                stroke="url(#edgeGrad)"
                strokeWidth={3}
                strokeLinecap="round"
                markerEnd="url(#edgeArrow)"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.45, delay: 0.05 }}
              />
              {/* Referral code badge on the link */}
              <motion.g
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.15 }}
              >
                <rect
                  x={e.midX - 46}
                  y={e.midY - 12}
                  width={92}
                  height={24}
                  rx={8}
                  fill="rgba(7,11,18,0.92)"
                  stroke="rgba(61,222,168,0.45)"
                  strokeWidth={1}
                />
                <text
                  x={e.midX}
                  y={e.midY + 5}
                  textAnchor="middle"
                  fill="#3ddea8"
                  style={{ fontSize: 12, fontFamily: "var(--font-mono)", fontWeight: 600 }}
                >
                  via {e.label}
                </text>
              </motion.g>
            </g>
          ))}

          {laid.map((n) => {
            const active = n.id === highlightId;
            return (
              <motion.g
                key={n.id}
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 240, damping: 20 }}
                style={{ transformOrigin: `${n.x}px ${n.y}px` }}
              >
                <circle
                  cx={n.x}
                  cy={n.y}
                  r={active ? 34 : 28}
                  fill={active ? "rgba(61,222,168,0.28)" : "rgba(12,18,28,0.98)"}
                  stroke={active ? "#3ddea8" : "rgba(120,160,200,0.55)"}
                  strokeWidth={active ? 3 : 1.75}
                  filter={active ? "url(#nodeGlow)" : undefined}
                />
                <text
                  x={n.x}
                  y={n.y + 5}
                  textAnchor="middle"
                  fill="#e8eef6"
                  style={{ fontSize: 14, fontFamily: "var(--font-mono)", fontWeight: 600 }}
                >
                  {n.label.slice(0, 8)}
                </text>
                <text
                  x={n.x}
                  y={n.y + 52}
                  textAnchor="middle"
                  fill="#8b9bb0"
                  style={{ fontSize: 13, fontFamily: "var(--font-mono)" }}
                >
                  {n.referralCode}
                </text>
                <text
                  x={n.x}
                  y={n.y + 70}
                  textAnchor="middle"
                  fill="#3ddea8"
                  style={{ fontSize: 12, fontFamily: "var(--font-mono)", opacity: 0.9 }}
                >
                  {n.city ?? "-"} · +{n.coins}c
                </text>
                {n.nodeHash && (
                  <text
                    x={n.x}
                    y={n.y + 88}
                    textAnchor="middle"
                    fill="rgba(139,155,176,0.95)"
                    style={{ fontSize: 11, fontFamily: "var(--font-mono)" }}
                  >
                    #{n.nodeHash.slice(0, 10)}
                  </text>
                )}
              </motion.g>
            );
          })}
        </svg>
      )}
    </div>
  );
}
