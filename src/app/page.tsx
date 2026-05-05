"use client"

import { useState, useEffect } from "react"

// ── Color System — matches Agent Hub institutional aesthetic ───────
const C = {
  bg: "#0a0f1a",
  wire: "#2a3a55",
  tint: "#141e2e",
  row: "rgba(26,39,64,0.35)",
  section: "#1a2740",
  lbl: "#64748b",
  val: "#f1f5f9",
  hi: "#f1f5f9",
  olive: "#7c8c6a",
  amber: "#c9956a",
  slate: "#8b9fc7",
  coral: "#c9726a",
  lavender: "#9b8ab8",
}

// ── Rule name lookup ──────────────────────────────────────────────
const RULE_NAMES: Record<string, string> = {
  "LZ-EPH-002": "Confidence Must Match Evidence",
  "LZ-EPH-003": "The Speculation Cap (3+ Assumptions)",
  "LZ-RC-001": "Correlation Is Not Causation",
  "LZ-RC-002": "A Single Data Point Is Not a Trend",
  "LZ-RC-003": "Absence of Evidence Is Informationally Neutral",
  "LZ-RC-005": "Predictions ≠ Measurements",
  "LZ-CC-001": "Coherence Without Anchoring Is Fiction",
  "LZ-EH-005": "Equal-Weight Contradictions Get Flagged",
  "LZ-EPH-001": "\"I Don't Know\" Is High-Quality Output",
  "LZ-RC-004": "Test the Simple Explanation First",
  "LZ-MR-003": "Simultaneous vs. Staggered Measurement",
  "LZ-EH-004": "Anomalous Data = Check the Sensor First",
  "LZ-EH-003": "Actions Outweigh Statements",
  "LZ-EH-002": "Primary Sources Outweigh Secondhand Reports",
  "LZ-EH-001": "Multiple Sources Beat Single Sources",
  "LZ-MR-002": "Recency Affects Relevance, Not Accuracy",
  "LZ-MR-001": "Multi-Timeframe Trends Are More Significant",
}

// ── Category labels ───────────────────────────────────────────────
const CAT_LABELS: Record<string, string> = {
  EH: "Evidence Hierarchy",
  RC: "Reasoning Constraints",
  CC: "Coherence Controls",
  MR: "Measurement Rules",
  EPH: "Epistemic Honesty",
  OTHER: "Other",
}

// ── Gate labels ───────────────────────────────────────────────────
const GATE_LABELS: Record<string, string> = {
  perception: "PERCEPTION",
  contextualization: "CONTEXTUALIZATION",
  inference: "INFERENCE",
  judgment: "JUDGMENT",
}

// ── Interfaces ────────────────────────────────────────────────────
interface SeverityData {
  count: number
  pct: number
}

interface RuleData {
  rule_id: string
  category: string
  count: number
  pct: number
}

interface GateData {
  count: number
  pct: number
}

interface CategoryData {
  name: string
  count: number
  pct: number
}

interface RunData {
  run_timestamp: string
  total: number
  serious: number
  moderate: number
  minor: number
  signal_count: number
}

interface SummaryData {
  total_violations: number
  total_runs: number
  avg_per_run: number
  by_severity: Record<string, SeverityData>
  by_gate: Record<string, GateData>
  by_rule_category: Record<string, CategoryData>
  by_rule: RuleData[]
  by_gate_and_severity: Record<string, Record<string, number>>
  trend: RunData[]
}

// ── Stat Card ─────────────────────────────────────────────────────
function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div
      style={{
        background: C.tint,
        border: `1px solid ${C.wire}`,
        borderRadius: 6,
        padding: "16px 20px",
      }}
    >
      <div
        className="text-[9px] tracking-[2px] font-bold"
        style={{ color: C.lbl }}
      >
        {label}
      </div>
      <div
        className="text-2xl font-bold mt-1"
        style={{ color: C.hi, fontFamily: "monospace" }}
      >
        {value}
      </div>
      {sub && (
        <div className="text-[10px] mt-0.5" style={{ color: C.lbl }}>
          {sub}
        </div>
      )}
    </div>
  )
}

// ── Bar component ─────────────────────────────────────────────────
function HBar({
  label,
  pct,
  count,
  color,
  maxPct,
}: {
  label: string
  pct: number
  count: number
  color: string
  maxPct: number
}) {
  const width = (pct / maxPct) * 100
  return (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1">
        <span className="text-[10px] tracking-[1px] font-semibold" style={{ color: C.lbl }}>
          {label}
        </span>
        <span className="text-[10px] font-bold" style={{ color }}>
          {count.toLocaleString()} ({pct}%)
        </span>
      </div>
      <div
        style={{
          background: `${color}15`,
          borderRadius: 3,
          height: 8,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            background: color,
            width: `${width}%`,
            height: "100%",
            borderRadius: 3,
            transition: "width 0.8s ease-out",
          }}
        />
      </div>
    </div>
  )
}

// ── Section Header ────────────────────────────────────────────────
function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-4">
      <div
        className="text-[10px] tracking-[3px] font-bold"
        style={{ color: C.amber }}
      >
        {title}
      </div>
      {sub && (
        <div className="text-[10px] mt-1" style={{ color: C.lbl }}>
          {sub}
        </div>
      )}
      <div
        className="mt-2"
        style={{ borderBottom: `1px solid ${C.wire}` }}
      />
    </div>
  )
}

// ── Emergent Learning Metric ──────────────────────────────────────
function LearningMetric({
  label,
  before,
  after,
  direction,
  color,
}: {
  label: string
  before: string
  after: string
  direction: "up" | "down"
  color: string
}) {
  return (
    <div
      className="py-3 px-4"
      style={{
        background: `${color}08`,
        border: `1px solid ${color}20`,
        borderRadius: 6,
      }}
    >
      <div className="text-[9px] tracking-[1.5px] font-bold" style={{ color: C.lbl }}>
        {label}
      </div>
      <div className="flex items-center gap-2 mt-1">
        <span className="text-[11px] font-mono" style={{ color: C.lbl }}>
          {before}
        </span>
        <span className="text-[11px]" style={{ color }}>
          {direction === "up" ? "→" : "→"}
        </span>
        <span className="text-sm font-bold font-mono" style={{ color }}>
          {after}
        </span>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────
export default function ProofOfReasoning() {
  const [data, setData] = useState<SummaryData | null>(null)
  const [selectedRun, setSelectedRun] = useState<RunData | null>(null)
  const [traceLoading, setTraceLoading] = useState(false)
  const [traceData, setTraceData] = useState<any>(null)
  const [traceError, setTraceError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/por/summary")
      .then((r) => r.json())
      .then(setData)
      .catch((e) => console.error("Failed to load summary:", e))
  }, [])

  const handleRunClick = (run: RunData) => {
    setSelectedRun(run)
    setTraceData(null)
    setTraceError(null)
  }

  const handleTraceAccess = async () => {
    if (!selectedRun) return
    setTraceLoading(true)
    setTraceError(null)
    try {
      const runDate = selectedRun.run_timestamp.split("T")[0]
      const res = await fetch(`/api/por/trace/${runDate}`)
      if (!res.ok) {
        const err = await res.text()
        setTraceError(`Failed to load trace: ${err}`)
      } else {
        const trace = await res.json()
        setTraceData(trace)
      }
    } catch (e: any) {
      setTraceError(e.message || "Failed to load trace")
    } finally {
      setTraceLoading(false)
    }
  }

  if (!data) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: C.bg }}
      >
        <div className="text-[10px] tracking-[3px] font-bold" style={{ color: C.amber }}>
          LOADING PROOF OF REASONING...
        </div>
      </div>
    )
  }

  const severityColors: Record<string, string> = {
    SERIOUS: C.coral,
    MODERATE: C.amber,
    MINOR: C.slate,
  }

  const gateColors = [C.slate, C.lavender, C.amber, C.coral]
  const maxGatePct = Math.max(...Object.values(data.by_gate).map((g) => g.pct))
  const maxCatPct = Math.max(
    ...Object.values(data.by_rule_category).map((c) => c.pct)
  )

  return (
    <div className="min-h-screen" style={{ background: C.bg, width: "100%", maxWidth: "100vw", overflowX: "hidden" }}>
      {/* ── HEADER ─────────────────────────────────────────────── */}
      <div
        className="py-6 px-6"
        style={{ borderBottom: `1px solid ${C.wire}` }}
      >
        <div className="" style={{ maxWidth: 1100, marginLeft: "auto", marginRight: "auto", paddingLeft: 24, paddingRight: 24 }}>
          <div className="text-[9px] tracking-[3px] font-bold" style={{ color: C.amber }}>
            INTEGRITY PROTOCOL
          </div>
          <h1
            className="text-xl font-bold mt-1 tracking-tight"
            style={{ color: C.hi }}
          >
            Proof of Reasoning Terminal
          </h1>
          <div className="text-[10px] mt-1" style={{ color: C.lbl }}>
            Autonomous AI reasoning audit · {data.total_runs} pipeline runs · Feb–May 2026
          </div>
        </div>
      </div>

      <div className="py-8" style={{ maxWidth: 1100, marginLeft: "auto", marginRight: "auto", paddingLeft: 24, paddingRight: 24 }}>
        {/* ══════════════════════════════════════════════════════════
            SECTION 1: THE BILLBOARD
            ══════════════════════════════════════════════════════════ */}

        {/* ── Headline Stats ─────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <StatCard
            label="TOTAL VIOLATIONS"
            value={data.total_violations.toLocaleString()}
            sub="AI reasoning failures caught"
          />
          <StatCard
            label="AVG PER RUN"
            value={`~${data.avg_per_run}`}
            sub="violations per pipeline cycle"
          />
          <StatCard
            label="SERIOUS"
            value={data.by_severity.SERIOUS.count.toLocaleString()}
            sub={`${data.by_severity.SERIOUS.pct}% of all violations`}
          />
          <StatCard
            label="PIPELINE RUNS"
            value={data.total_runs.toString()}
            sub="autonomous cycles completed"
          />
        </div>

        {/* ── Severity Distribution ──────────────────────────────── */}
        <div
          className="p-5 mb-6"
          style={{
            background: C.tint,
            border: `1px solid ${C.wire}`,
            borderRadius: 6,
          }}
        >
          <SectionHeader title="SEVERITY DISTRIBUTION" />
          <div className="flex gap-1 mb-3" style={{ height: 32, borderRadius: 4, overflow: "hidden" }}>
            {Object.entries(data.by_severity).map(([sev, d]) => (
              <div
                key={sev}
                style={{
                  width: `${d.pct}%`,
                  background: severityColors[sev],
                  opacity: 0.85,
                }}
                title={`${sev}: ${d.count.toLocaleString()} (${d.pct}%)`}
              />
            ))}
          </div>
          <div className="flex gap-4">
            {Object.entries(data.by_severity).map(([sev, d]) => (
              <div key={sev} className="flex items-center gap-2">
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 2,
                    background: severityColors[sev],
                  }}
                />
                <span className="text-[10px] font-semibold" style={{ color: C.lbl }}>
                  {sev} {d.pct}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Gate Escalation + Rule Categories side by side ──────── */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Gate Escalation */}
          <div
            className="p-5"
            style={{
              background: C.tint,
              border: `1px solid ${C.wire}`,
              borderRadius: 6,
            }}
          >
            <SectionHeader
              title="GATE ESCALATION PATTERN"
              sub="Reasoning errors compound through layers"
            />
            {Object.entries(data.by_gate).map(([gate, d], i) => (
              <HBar
                key={gate}
                label={GATE_LABELS[gate] || gate.toUpperCase()}
                pct={d.pct}
                count={d.count}
                color={gateColors[i]}
                maxPct={maxGatePct}
              />
            ))}
          </div>

          {/* Rule Categories */}
          <div
            className="p-5"
            style={{
              background: C.tint,
              border: `1px solid ${C.wire}`,
              borderRadius: 6,
            }}
          >
            <SectionHeader
              title="RULE CATEGORIES"
              sub="RC + EPH = ~80% of all violations"
            />
            {Object.entries(data.by_rule_category)
              .filter(([k]) => k !== "OTHER")
              .map(([cat, d]) => (
                <HBar
                  key={cat}
                  label={CAT_LABELS[cat] || cat}
                  pct={d.pct}
                  count={d.count}
                  color={C.amber}
                  maxPct={maxCatPct}
                />
              ))}
          </div>
        </div>

        {/* ── Top 5 Most Violated Rules ──────────────────────────── */}
        <div
          className="p-5 mb-6"
          style={{
            background: C.tint,
            border: `1px solid ${C.wire}`,
            borderRadius: 6,
          }}
        >
          <SectionHeader title="TOP VIOLATED RULES" sub="Layer Zero epistemological rules — 17 rules enforced at every layer transition" />
          {data.by_rule.slice(0, 5).map((rule, i) => (
            <div
              key={rule.rule_id}
              className="flex items-center gap-4 py-3"
              style={{
                borderBottom: i < 4 ? `1px solid ${C.row}` : "none",
              }}
            >
              <span
                className="text-lg font-bold font-mono w-8 text-center"
                style={{ color: C.amber }}
              >
                {i + 1}
              </span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className="text-[10px] tracking-[1px] font-bold px-1.5 py-0.5"
                    style={{
                      color: C.amber,
                      border: `1px solid ${C.amber}40`,
                      borderRadius: 3,
                    }}
                  >
                    {rule.rule_id}
                  </span>
                  <span className="text-[10px] font-semibold" style={{ color: C.lbl }}>
                    {rule.category}
                  </span>
                </div>
                <div className="text-xs font-medium mt-1" style={{ color: C.val }}>
                  {RULE_NAMES[rule.rule_id] || rule.rule_id}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold font-mono" style={{ color: C.hi }}>
                  {rule.count.toLocaleString()}
                </div>
                <div className="text-[10px]" style={{ color: C.lbl }}>
                  {rule.pct}%
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Emergent Learning ───────────────────────────────────── */}
        <div
          className="p-5 mb-8"
          style={{
            background: C.tint,
            border: `1px solid ${C.wire}`,
            borderRadius: 6,
          }}
        >
          <SectionHeader
            title="EMERGENT LEARNING"
            sub="The base model never learns. The system learns around it."
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
            <LearningMetric
              label="CORRECTIONS DENSITY"
              before="1.62/signal"
              after="2.17/signal"
              direction="up"
              color={C.olive}
            />
            <LearningMetric
              label="SERIOUS VIOLATIONS"
              before="8.66%"
              after="4.61%"
              direction="down"
              color={C.coral}
            />
            <LearningMetric
              label="GATE RESCISSIONS"
              before="0"
              after="45"
              direction="up"
              color={C.lavender}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <LearningMetric
              label="L4 UNCHANGED RATE"
              before="63.81%"
              after="67.62%"
              direction="up"
              color={C.slate}
            />
            <LearningMetric
              label="L4 ADJUSTMENT MAGNITUDE"
              before="0.21 avg"
              after="0.36 avg"
              direction="up"
              color={C.amber}
            />
            <div
              className="py-3 px-4 flex items-center"
              style={{
                background: `${C.olive}08`,
                border: `1px solid ${C.olive}20`,
                borderRadius: 6,
              }}
            >
              <div>
                <div className="text-[9px] tracking-[1.5px] font-bold" style={{ color: C.lbl }}>
                  CORRECTION PERSISTENCE
                </div>
                <div className="text-[11px] mt-1" style={{ color: C.val }}>
                  38 unique corrections · oldest still firing at run 145
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════
            SECTION 2: THE RUN LEDGER
            ══════════════════════════════════════════════════════════ */}
        <div
          className="p-5 mb-6"
          style={{
            background: C.tint,
            border: `1px solid ${C.wire}`,
            borderRadius: 6,
            overflowX: "auto",
          }}
        >
          <SectionHeader
            title="RUN LEDGER"
            sub={`${data.total_runs} autonomous pipeline runs · Click any run to access its cognitive trace`}
          />

          {/* Column headers */}
          <div
            className="grid gap-2 py-2 mb-1"
            style={{
              gridTemplateColumns: "50px 80px 60px 65px 65px 75px",
              borderBottom: `1px solid ${C.wire}`,
            }}
          >
            {["RUN", "DATE", "SIGNALS", "TOTAL", "SERIOUS", "MOD/MIN"].map(
              (h) => (
                <span
                  key={h}
                  className="text-[9px] tracking-[1px] font-bold"
                  style={{ color: C.lbl }}
                >
                  {h}
                </span>
              )
            )}
          </div>

          {/* Run rows */}
          <div style={{ maxHeight: 400, overflowY: "auto" }}>
            {[...data.trend].reverse().map((run, i) => {
              const runNum = data.trend.length - i
              const date = new Date(run.run_timestamp)
              const dateStr = date.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })
              const isSelected =
                selectedRun?.run_timestamp === run.run_timestamp
              return (
                <div
                  key={run.run_timestamp}
                  className="grid gap-2 py-2 cursor-pointer transition-colors"
                  style={{
                    gridTemplateColumns: "50px 80px 60px 65px 65px 75px",
                    borderBottom: `1px solid ${C.row}`,
                    background: isSelected
                      ? `${C.amber}10`
                      : "transparent",
                  }}
                  onClick={() => handleRunClick(run)}
                >
                  <span
                    className="text-[11px] font-bold font-mono"
                    style={{ color: C.amber }}
                  >
                    #{runNum}
                  </span>
                  <span
                    className="text-[11px] font-mono"
                    style={{ color: C.lbl }}
                  >
                    {dateStr}
                  </span>
                  <span
                    className="text-[11px] font-mono"
                    style={{ color: C.val }}
                  >
                    {run.signal_count}
                  </span>
                  <span
                    className="text-[11px] font-bold font-mono"
                    style={{ color: C.val }}
                  >
                    {run.total}
                  </span>
                  <span
                    className="text-[11px] font-bold font-mono"
                    style={{ color: run.serious > 30 ? C.coral : C.val }}
                  >
                    {run.serious}
                  </span>
                  <span
                    className="text-[11px] font-mono"
                    style={{ color: C.lbl }}
                  >
                    {run.moderate}/{run.minor}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════
            SECTION 3: x402 GATE — TRACE ACCESS
            ══════════════════════════════════════════════════════════ */}
        {selectedRun && (
          <div
            className="p-5 mb-8"
            style={{
              background: C.tint,
              border: `1px solid ${C.amber}40`,
              borderRadius: 6,
            }}
          >
            <SectionHeader title="x402 COGNITIVE TRACE ACCESS" />

            <div className="mb-4">
              <div className="text-[11px]" style={{ color: C.val }}>
                Run #{data.trend.indexOf(selectedRun) + 1} ·{" "}
                {new Date(selectedRun.run_timestamp).toLocaleDateString(
                  "en-US",
                  { month: "long", day: "numeric", year: "numeric" }
                )}{" "}
                · {selectedRun.total} violations · {selectedRun.serious}{" "}
                SERIOUS
              </div>
              <div className="text-[10px] mt-2" style={{ color: C.lbl }}>
                The cognitive trace for this run is secured by x402
                verification on Base Sepolia. A micropayment logs that this
                trace was accessed and when. On-chain, permanent.
              </div>
            </div>

            {!traceData && !traceError && (
              <button
                onClick={handleTraceAccess}
                disabled={traceLoading}
                className="px-4 py-2 text-[10px] tracking-[2px] font-bold cursor-pointer transition-all"
                style={{
                  background: traceLoading ? C.section : `${C.amber}20`,
                  border: `1px solid ${C.amber}`,
                  borderRadius: 4,
                  color: C.amber,
                  opacity: traceLoading ? 0.5 : 1,
                }}
              >
                {traceLoading
                  ? "VERIFYING x402 PAYMENT..."
                  : "ACCESS TRACE — x402 MICROPAYMENT ON BASE"}
              </button>
            )}

            {traceError && (
              <div
                className="text-[11px] p-3 mt-3"
                style={{
                  color: C.coral,
                  background: `${C.coral}10`,
                  border: `1px solid ${C.coral}30`,
                  borderRadius: 4,
                }}
              >
                {traceError}
              </div>
            )}

            {traceData && (
              <div className="mt-4">
                <div
                  className="text-[9px] tracking-[2px] font-bold mb-3"
                  style={{ color: C.olive }}
                >
                  ✓ TRACE LOADED — x402 PAYMENT VERIFIED
                </div>
                <pre
                  className="text-[10px] p-4 overflow-auto"
                  style={{
                    background: C.bg,
                    border: `1px solid ${C.wire}`,
                    borderRadius: 4,
                    color: C.val,
                    maxHeight: 500,
                    fontFamily: "monospace",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {JSON.stringify(traceData, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* ── Footer ───────────────────────────────────────────────── */}
        <div
          className="py-4 mt-8 text-center"
          style={{ borderTop: `1px solid ${C.wire}` }}
        >
          <div className="text-[9px] tracking-[2px] font-bold" style={{ color: C.lbl }}>
            THE INTEGRITY PROTOCOL · PATENT PENDING · INTEGRITY AI LLC
          </div>
          <div className="text-[9px] mt-1" style={{ color: C.lbl }}>
            Built by Tim Wrenn · Fire Lieutenant · Zero Coding Background
          </div>
        </div>
      </div>
    </div>
  )
}
