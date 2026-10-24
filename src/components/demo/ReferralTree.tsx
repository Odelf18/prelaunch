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
    0,
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
    const yPad = 70;
    const xPad = 70;
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

  roots.forEach((r, i) => place(r, 0, i, roots.length));

  const placed = new Set(positioned.map((p) => p.id));
  const orphans = nodes.filter((n) => !placed.has(n.id));
  orphans.forEach((n, i) => {
    positioned.push({
      ...n,
      x: 70 + ((width - 140) * (i + 1)) / (orphans.length + 1),
      y: height - 50,
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
  const width = 960;
  const height = 520;
  const laid = useMemo(() => layoutTree(nodes, width, height), [nodes]);
  const byId = useMemo(() => new Map(laid.map((n) => [n.id, n])), [laid]);

  const edges = laid
    .filter((n) => n.parentId && byId.has(n.parentId))
    .map((n) => {
      const parent = byId.get(n.parentId!)!;
      return { from: parent, to: n };
    });

  return (
    <div className="panel relative overflow-hidden rounded-3xl p-5 md:p-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3 px-1">
        <div>
          <p className="mono text-xs uppercase tracking-[0.28em] text-[var(--muted)]">
            Referral integrity tree
          </p>
          <p className="mt-1 text-base text-[var(--muted)] md:text-lg">
            Who referred whom · hash trail under each node
          </p>
        </div>
        <span className="mono text-base text-[var(--accent)]">
          {nodes.length} {nodes.length === 1 ? "node" : "nodes"}
        </span>
      </div>

      {nodes.length === 0 ? (
        <div className="flex h-[360px] items-center justify-center rounded-2xl border border-dashed border-[var(--line)] bg-black/20 md:h-[440px]">
          <p className="max-w-md px-6 text-center text-lg text-[var(--muted)]">
            Tree is empty. The first signup becomes the root. Each referred
            signup grows a new branch.
          </p>
        </div>
      ) : (
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-[380px] w-full md:h-[480px]"
        >
          <defs>
            <linearGradient id="edgeGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(61,222,168,0.65)" />
              <stop offset="100%" stopColor="rgba(126,182,255,0.45)" />
            </linearGradient>
            <filter id="nodeGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {edges.map((e) => (
            <motion.path
              key={`${e.from.id}-${e.to.id}`}
              d={`M ${e.from.x} ${e.from.y + 28} C ${e.from.x} ${(e.from.y + e.to.y) / 2}, ${e.to.x} ${(e.from.y + e.to.y) / 2}, ${e.to.x} ${e.to.y - 28}`}
              fill="none"
              stroke="url(#edgeGrad)"
              strokeWidth={2.5}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.7 }}
            />
          ))}
          {laid.map((n) => {
            const active = n.id === highlightId;
            return (
              <motion.g
                key={n.id}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 220, damping: 18 }}
                style={{ transformOrigin: `${n.x}px ${n.y}px` }}
              >
                <circle
                  cx={n.x}
                  cy={n.y}
                  r={active ? 34 : 28}
                  fill={active ? "rgba(61,222,168,0.28)" : "rgba(12,18,28,0.98)"}
                  stroke={active ? "var(--accent)" : "rgba(120,160,200,0.45)"}
                  strokeWidth={active ? 3 : 1.5}
                  filter={active ? "url(#nodeGlow)" : undefined}
                />
                <text
                  x={n.x}
                  y={n.y + 5}
                  textAnchor="middle"
                  fill="var(--text)"
                  style={{ fontSize: 14, fontFamily: "var(--font-mono)", fontWeight: 600 }}
                >
                  {n.label.slice(0, 8)}
                </text>
                <text
                  x={n.x}
                  y={n.y + 52}
                  textAnchor="middle"
                  fill="var(--muted)"
                  style={{ fontSize: 13, fontFamily: "var(--font-mono)" }}
                >
                  {n.referralCode}
                </text>
                <text
                  x={n.x}
                  y={n.y + 70}
                  textAnchor="middle"
                  fill="var(--accent)"
                  style={{ fontSize: 12, fontFamily: "var(--font-mono)", opacity: 0.85 }}
                >
                  {n.city ?? "—"} · +{n.coins}c
                </text>
                {n.nodeHash && (
                  <text
                    x={n.x}
                    y={n.y + 88}
                    textAnchor="middle"
                    fill="rgba(139,155,176,0.9)"
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
