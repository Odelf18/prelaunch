"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import type { TreeNode } from "./types";

type LayoutNode = TreeNode & { x: number; y: number; depth: number };

function layoutTree(nodes: TreeNode[], width: number, height: number): LayoutNode[] {
  if (nodes.length === 0) return [];

  const byParent = new Map<string | null, TreeNode[]>();
  for (const n of nodes) {
    const key = n.parentId;
    const list = byParent.get(key) ?? [];
    list.push(n);
    byParent.set(key, list);
  }

  const roots = byParent.get(null) ?? nodes.filter((n) => !n.parentId);
  const positioned: LayoutNode[] = [];
  const maxDepth = Math.max(
    1,
    ...nodes.map((n) => {
      let d = 0;
      let cur: TreeNode | undefined = n;
      const seen = new Set<string>();
      while (cur?.parentId && !seen.has(cur.id)) {
        seen.add(cur.id);
        d++;
        cur = nodes.find((x) => x.id === cur!.parentId);
      }
      return d;
    }),
  );

  function place(node: TreeNode, depth: number, index: number, siblings: number) {
    const yPad = 48;
    const xPad = 40;
    const usableW = width - xPad * 2;
    const usableH = height - yPad * 2;
    const x =
      siblings <= 1
        ? width / 2
        : xPad + (usableW * (index + 1)) / (siblings + 1);
    const y =
      maxDepth === 0
        ? height / 2
        : yPad + (usableH * depth) / Math.max(maxDepth, 1);

    positioned.push({ ...node, x, y, depth });
    const children = byParent.get(node.id) ?? [];
    children.forEach((child, i) => place(child, depth + 1, i, children.length));
  }

  // If multiple roots, place them as siblings at depth 0
  roots.forEach((r, i) => place(r, 0, i, roots.length));

  // Any orphaned nodes (parent missing) — place at bottom
  const placed = new Set(positioned.map((p) => p.id));
  const orphans = nodes.filter((n) => !placed.has(n.id));
  orphans.forEach((n, i) => {
    positioned.push({
      ...n,
      x: 40 + ((width - 80) * (i + 1)) / (orphans.length + 1),
      y: height - 36,
      depth: maxDepth + 1,
    });
  });

  return positioned;
}

export function ReferralTree({
  nodes,
  highlightId,
}: {
  nodes: TreeNode[];
  highlightId?: string | null;
}) {
  const width = 640;
  const height = 360;
  const laid = useMemo(() => layoutTree(nodes, width, height), [nodes]);
  const byId = useMemo(() => new Map(laid.map((n) => [n.id, n])), [laid]);

  const edges = laid
    .filter((n) => n.parentId && byId.has(n.parentId))
    .map((n) => {
      const parent = byId.get(n.parentId!)!;
      return { from: parent, to: n };
    });

  return (
    <div className="panel relative h-full min-h-[320px] overflow-hidden rounded-2xl p-3">
      <div className="mb-2 flex items-center justify-between px-2">
        <div>
          <p className="mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">
            Referral integrity tree
          </p>
          <p className="text-sm text-[var(--muted)]">
            Hash-chained nodes · who referred whom
          </p>
        </div>
        <span className="mono text-xs text-[var(--accent)]">{nodes.length} nodes</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[300px] w-full md:h-[340px]">
        <defs>
          <linearGradient id="edgeGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(61,222,168,0.5)" />
            <stop offset="100%" stopColor="rgba(126,182,255,0.35)" />
          </linearGradient>
        </defs>
        {edges.map((e) => (
          <motion.path
            key={`${e.from.id}-${e.to.id}`}
            d={`M ${e.from.x} ${e.from.y + 18} C ${e.from.x} ${(e.from.y + e.to.y) / 2}, ${e.to.x} ${(e.from.y + e.to.y) / 2}, ${e.to.x} ${e.to.y - 18}`}
            fill="none"
            stroke="url(#edgeGrad)"
            strokeWidth={1.5}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.6 }}
          />
        ))}
        {laid.map((n) => {
          const active = n.id === highlightId;
          return (
            <motion.g
              key={n.id}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
            >
              <circle
                cx={n.x}
                cy={n.y}
                r={active ? 22 : 18}
                fill={active ? "rgba(61,222,168,0.25)" : "rgba(12,18,28,0.95)"}
                stroke={active ? "var(--accent)" : "rgba(120,160,200,0.35)"}
                strokeWidth={active ? 2 : 1}
              />
              <text
                x={n.x}
                y={n.y + 4}
                textAnchor="middle"
                className="fill-[var(--text)]"
                style={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
              >
                {n.label.slice(0, 6)}
              </text>
              <text
                x={n.x}
                y={n.y + 36}
                textAnchor="middle"
                className="fill-[var(--muted)]"
                style={{ fontSize: 9, fontFamily: "var(--font-mono)" }}
              >
                {n.referralCode}
              </text>
              {n.nodeHash && (
                <text
                  x={n.x}
                  y={n.y + 48}
                  textAnchor="middle"
                  className="fill-[var(--accent)]"
                  style={{ fontSize: 8, fontFamily: "var(--font-mono)", opacity: 0.7 }}
                >
                  {n.nodeHash.slice(0, 8)}…
                </text>
              )}
            </motion.g>
          );
        })}
      </svg>
    </div>
  );
}
