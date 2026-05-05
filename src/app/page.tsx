"use client"

import { useState, useEffect, useRef } from "react"

const C = {
  bg: "#0a0f1a",
  wire: "#2a3a55",
  tint: "#1a2538",
  row: "rgba(26,39,64,0.35)",
  lbl: "#8b9bb5",
  val: "#f1f5f9",
  hi: "#f1f5f9",
  olive: "#7c8c6a",
  amber: "#c9956a",
  slate: "#8b9fc7",
  coral: "#c9726a",
  lavender: "#9b8ab8",
}

const RULE_NAMES: Record<string, string> = {
  "LZ-EPH-002": "Confidence Must Match Evidence",
  "LZ-EPH-003": "The Speculation Cap (3+ Assumptions)",
  "LZ-RC-001": "Correlation Is Not Causation",
  "LZ-RC-002": "A Single Data Point Is Not a Trend",
  "LZ-RC-003": "Absence of Evidence Is Neutral",
  "LZ-RC-005": "Predictions ≠ Measurements",
  "LZ-CC-001": "Coherence Without Anchoring Is Fiction",
  "LZ-EH-005": "Equal-Weight Contradictions Flagged",
  "LZ-EPH-001": "\"I Don't Know\" Is High-Quality Output",
  "LZ-RC-004": "Test the Simple Explanation First",
  "LZ-MR-003": "Simultaneous vs. Staggered Measurement",
  "LZ-EH-004": "Check the Sensor First",
  "LZ-EH-003": "Actions Outweigh Statements",
  "LZ-EH-002": "Primary Sources Outweigh Secondhand",
  "LZ-EH-001": "Multiple Sources Beat Single Sources",
  "LZ-MR-002": "Recency ≠ Accuracy",
  "LZ-MR-001": "Multi-Timeframe Trends Matter More",
}

const RULE_EXPLANATIONS: Record<string, string> = {
  "LZ-EPH-002": "You can't be 90% sure based on one article from an unnamed source. Even if you turn out to be right, the confidence was wrong. Being right by accident is luck, not analysis.",
  "LZ-EPH-003": "Each unproven assumption is another guess stacked on a guess. Three or more and you're writing fiction. Hard code-enforced: 75% weight discount.",
  "LZ-RC-001": "Two things happening at the same time doesn't mean one caused the other. Ice cream sales and drowning deaths both rise in summer — temperature caused both.",
  "LZ-RC-002": "One bad day is not a collapse. One good day is not a breakout. You need multiple readings to call a direction.",
  "LZ-RC-003": "\"No reports of fire\" doesn't mean no fire. It also doesn't mean there IS a fire being hidden. It means you don't know yet.",
  "LZ-RC-005": "\"It handled 50M transactions last month\" is verifiable. \"It will handle 500M next quarter\" is a guess. Don't treat them the same.",
  "LZ-CC-001": "Just because a story makes sense doesn't mean it's true. A great theory with no hard data behind it is creative writing, not intelligence. This is what hallucination IS.",
  "LZ-EH-005": "Two equally reliable witnesses with different stories means you don't have an answer yet. Don't force a verdict.",
  "LZ-EPH-001": "Saying \"I don't have enough information\" is a good answer. Making something up and getting it wrong is a system failure.",
  "LZ-RC-004": "Before you decide it's arson, rule out electrical first. Patient has a headache — start with dehydration before ordering a brain scan.",
  "LZ-MR-003": "Check price at 9 AM and volume at 3 PM, and you're comparing apples and oranges. Things changed between those hours.",
  "LZ-EH-004": "If the thermal imager says 2000 degrees in a room that isn't on fire, the batteries are dead. A wild lab result means rerun the test before diagnosing.",
  "LZ-EH-003": "Watch what they do, not what they say. A country announcing peace while moving troops. A patient saying \"I'm fine\" while their vitals crash.",
  "LZ-EH-002": "Go to the source. The filing beats the news article about the filing. The patient's chart vs. what the nurse told the next shift.",
  "LZ-EH-001": "Don't trust one witness. Three independent sources saying the same thing is worth more than one source saying it three times.",
  "LZ-MR-002": "Yesterday's data is more relevant to today's decision, but last month's data was accurate when it was measured. Don't throw it out.",
  "LZ-MR-001": "A pattern on the daily AND weekly AND monthly chart is more real than one on the 5-minute chart.",
}

const CAT_COLORS: Record<string, string> = { EPH: C.coral, RC: C.amber, CC: C.lavender, MR: C.olive, EH: C.slate }
const CAT_LABELS: Record<string, string> = { EH: "Evidence Hierarchy", RC: "Reasoning Constraints", CC: "Coherence Controls", MR: "Measurement Rules", EPH: "Epistemic Honesty" }
const GATE_LABELS: Record<string, string> = { perception: "PERCEPTION", contextualization: "CONTEXTUALIZATION", inference: "INFERENCE", judgment: "JUDGMENT" }

interface SeverityData { count: number; pct: number }
interface RuleData { rule_id: string; category: string; count: number; pct: number }
interface GateData { count: number; pct: number }
interface CategoryData { name: string; count: number; pct: number }
interface RunData { run_timestamp: string; total: number; serious: number; moderate: number; minor: number; signal_count: number }
interface SummaryData {
  total_violations: number; total_runs: number; avg_per_run: number
  by_severity: Record<string, SeverityData>
  by_gate: Record<string, GateData>
  by_rule_category: Record<string, CategoryData>
  by_rule: RuleData[]
  by_gate_and_severity: Record<string, Record<string, number>>
  trend: RunData[]
}

const SECTION = { padding: "24px 28px", background: C.tint, border: `1px solid ${C.wire}`, borderRadius: 4, marginBottom: 24 } as const

/* ── Components ── */

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{ background: C.tint, border: `1px solid ${C.amber}`, borderRadius: 4, padding: "20px 24px" }}>
      <div className="text-[10px] tracking-[2px] font-bold" style={{ color: C.lbl }}>{label}</div>
      <div className="text-3xl font-bold mt-2" style={{ color: C.hi, fontFamily: "monospace" }}>{value}</div>
      {sub && <div className="text-[11px] mt-1" style={{ color: C.lbl }}>{sub}</div>}
    </div>
  )
}

function HBar({ label, pct, count, color, maxPct }: { label: string; pct: number; count: number; color: string; maxPct: number }) {
  const width = (pct / maxPct) * 100
  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-[11px] tracking-[1px] font-semibold" style={{ color: C.lbl }}>{label}</span>
        <span className="text-[11px] font-bold font-mono" style={{ color }}>{count.toLocaleString()} ({pct}%)</span>
      </div>
      <div style={{ background: `${color}15`, borderRadius: 2, height: 10, overflow: "hidden" }}>
        <div style={{ background: color, width: `${width}%`, height: "100%", borderRadius: 2, transition: "width 0.8s ease-out" }} />
      </div>
    </div>
  )
}

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-6">
      <div className="text-[11px] tracking-[3px] font-bold" style={{ color: C.amber }}>{title}</div>
      {sub && <div className="text-[11px] mt-1.5 leading-relaxed" style={{ color: C.lbl }}>{sub}</div>}
      <div className="mt-3" style={{ borderBottom: `1px solid ${C.wire}` }} />
    </div>
  )
}

function LearningMetric({ label, before, after, color }: { label: string; before: string; after: string; direction: "up" | "down"; color: string }) {
  return (
    <div style={{ padding: "16px 20px", background: `${color}08`, border: `1px solid ${color}20`, borderRadius: 4 }}>
      <div className="text-[10px] tracking-[1.5px] font-bold" style={{ color: C.lbl }}>{label}</div>
      <div className="flex items-center gap-3 mt-2">
        <span className="text-[12px] font-mono" style={{ color: C.lbl }}>{before}</span>
        <span className="text-[12px]" style={{ color }}>→</span>
        <span className="text-base font-bold font-mono" style={{ color }}>{after}</span>
      </div>
    </div>
  )
}

/* ── Diagnostic Matrix Block ── */
function RuleBlock({ rule, maxCount, isExpanded, onToggle }: { rule: RuleData; maxCount: number; isExpanded: boolean; onToggle: () => void }) {
  const catColor = CAT_COLORS[rule.category] || C.lbl
  const intensity = Math.max(0.2, rule.count / maxCount)
  const name = RULE_NAMES[rule.rule_id] || rule.rule_id
  const explanation = RULE_EXPLANATIONS[rule.rule_id]

  return (
    <div style={{ gridColumn: isExpanded ? "1 / -1" : undefined }}>
      <div
        onClick={onToggle}
        style={{
          background: isExpanded ? `${catColor}12` : C.tint,
          border: `1px solid ${isExpanded ? catColor : C.wire}`,
          borderRadius: 4,
          padding: "16px 20px",
          cursor: "pointer",
          transition: "border-color 0.15s, background 0.15s",
          position: "relative",
          overflow: "hidden",
          minHeight: 80,
        }}
        onMouseEnter={(e) => { if (!isExpanded) e.currentTarget.style.borderColor = `${catColor}60` }}
        onMouseLeave={(e) => { if (!isExpanded) e.currentTarget.style.borderColor = C.wire }}
      >
        <div style={{ position: "absolute", bottom: 0, left: 0, width: "100%", height: 3, background: catColor, opacity: intensity }} />
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="text-[10px] tracking-[1px] font-bold" style={{ color: catColor }}>{rule.rule_id}</div>
            <div className="text-[13px] font-semibold mt-2 leading-snug" style={{ color: C.val }}>{name}</div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-lg font-bold font-mono" style={{ color: C.hi }}>{rule.count.toLocaleString()}</div>
            <div className="text-[10px] font-mono" style={{ color: C.lbl }}>{rule.pct}%</div>
          </div>
        </div>
        {isExpanded && explanation && (
          <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${catColor}25` }}>
            <div className="text-[13px] leading-relaxed" style={{ color: "#c0cde0" }}>{explanation}</div>
            <div className="mt-3">
              <span className="text-[10px] tracking-[1px] font-bold px-2 py-1" style={{ color: catColor, background: `${catColor}12`, borderRadius: 3 }}>
                {CAT_LABELS[rule.category] || rule.category}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Severity Heatmap ── */
function SeverityHeatmap({ runs }: { runs: RunData[] }) {
  const [hoveredRun, setHoveredRun] = useState<{ run: RunData; index: number; x: number; y: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  function getRunColor(run: RunData) {
    const seriousRatio = run.serious / Math.max(run.total, 1)
    if (seriousRatio > 0.15) return C.coral
    if (seriousRatio > 0.08) return C.amber
    if (run.total > 600) return C.amber
    return C.slate
  }

  function getRunOpacity(run: RunData) {
    return Math.max(0.35, Math.min(1, run.total / 800))
  }

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <div className="flex flex-wrap" style={{ gap: 4 }}>
        {runs.map((run, i) => {
          const color = getRunColor(run)
          const opacity = getRunOpacity(run)
          return (
            <div
              key={run.run_timestamp}
              style={{
                width: 28,
                height: 28,
                background: color,
                opacity,
                borderRadius: 2,
                border: `1px solid ${color}40`,
                cursor: "pointer",
                transition: "transform 0.1s, box-shadow 0.1s",
                boxShadow: hoveredRun?.index === i ? `0 0 0 2px ${C.amber}, 0 0 12px ${C.amber}30` : "none",
                transform: hoveredRun?.index === i ? "scale(1.25)" : "scale(1)",
              }}
              onClick={() => window.open(`/trace/${run.run_timestamp.split("T")[0]}`, "_blank")}
              onMouseEnter={(e) => {
                const rect = e.currentTarget.getBoundingClientRect()
                const cr = containerRef.current?.getBoundingClientRect()
                setHoveredRun({ run, index: i, x: rect.left - (cr?.left || 0) + rect.width / 2, y: rect.top - (cr?.top || 0) })
              }}
              onMouseLeave={() => setHoveredRun(null)}
            />
          )
        })}
      </div>

      {hoveredRun && (
        <div style={{
          position: "absolute",
          left: Math.min(hoveredRun.x, (containerRef.current?.clientWidth || 600) - 180),
          top: hoveredRun.y - 10,
          transform: "translateY(-100%)",
          background: "#0d1420",
          border: `1px solid ${C.amber}40`,
          borderRadius: 4,
          padding: "10px 14px",
          pointerEvents: "none",
          zIndex: 10,
          whiteSpace: "nowrap",
        }}>
          <div className="text-[11px] font-bold font-mono" style={{ color: C.amber }}>
            Run #{hoveredRun.index + 1} · {new Date(hoveredRun.run.run_timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </div>
          <div className="text-[11px] font-mono mt-1.5" style={{ color: C.val }}>
            {hoveredRun.run.signal_count} signals · {hoveredRun.run.total} violations
          </div>
          <div className="text-[11px] font-mono mt-0.5">
            <span style={{ color: C.coral }}>{hoveredRun.run.serious} serious</span>
            <span style={{ color: C.lbl }}> · {hoveredRun.run.moderate} mod · {hoveredRun.run.minor} minor</span>
          </div>
          <div className="text-[10px] font-bold tracking-[1px] mt-2" style={{ color: C.amber }}>CLICK TO ACCESS TRACE →</div>
        </div>
      )}

      <div className="flex items-center gap-5 mt-4 pt-3" style={{ borderTop: `1px solid ${C.row}` }}>
        <div className="flex items-center gap-2">
          <div style={{ width: 12, height: 12, background: C.slate, opacity: 0.5, borderRadius: 2, border: `1px solid ${C.slate}40` }} />
          <span className="text-[10px] font-semibold" style={{ color: C.lbl }}>Normal</span>
        </div>
        <div className="flex items-center gap-2">
          <div style={{ width: 12, height: 12, background: C.amber, borderRadius: 2, border: `1px solid ${C.amber}40` }} />
          <span className="text-[10px] font-semibold" style={{ color: C.lbl }}>Elevated</span>
        </div>
        <div className="flex items-center gap-2">
          <div style={{ width: 12, height: 12, background: C.coral, borderRadius: 2, border: `1px solid ${C.coral}40` }} />
          <span className="text-[10px] font-semibold" style={{ color: C.lbl }}>Critical</span>
        </div>
      </div>
    </div>
  )
}

/* ── Filter Badge ── */
function FilterBadge({ label, color, active, onClick }: { label: string; color: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      background: active ? color : "transparent",
      color: active ? C.bg : color,
      border: `1px solid ${color}`,
      borderRadius: 4,
      padding: "5px 12px",
      cursor: "pointer",
      transition: "all 0.15s",
      fontWeight: 700,
      fontSize: 10,
      letterSpacing: 1,
    }}>
      {label}
    </button>
  )
}

/* ── Main Page ── */
export default function ProofOfReasoning() {
  const [data, setData] = useState<SummaryData | null>(null)
  const [expandedRule, setExpandedRule] = useState<string | null>(null)
  const [severityFilter, setSeverityFilter] = useState<string | null>(null)
  const [dateFilter, setDateFilter] = useState("")

  useEffect(() => {
    fetch("/api/por/summary").then((r) => r.json()).then(setData).catch((e) => console.error("Failed to load summary:", e))
  }, [])

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: C.bg }}>
        <div className="text-[11px] tracking-[3px] font-bold" style={{ color: C.amber }}>LOADING PROOF OF REASONING...</div>
      </div>
    )
  }

  const severityColors: Record<string, string> = { SERIOUS: C.coral, MODERATE: C.amber, MINOR: C.slate }
  const gateColors = [C.slate, C.lavender, C.amber, C.coral]
  const maxGatePct = Math.max(...Object.values(data.by_gate).map((g) => g.pct))
  const maxCatPct = Math.max(...Object.values(data.by_rule_category).map((c) => c.pct))
  const lzRules = data.by_rule.filter((r) => r.rule_id.startsWith("LZ-"))
  const maxRuleCount = Math.max(...lzRules.map((r) => r.count), 1)

  // Filtered runs
  const reversedRuns = [...data.trend].reverse()
  const filteredRuns = reversedRuns.filter((run) => {
    if (severityFilter === "SERIOUS" && run.serious === 0) return false
    if (severityFilter === "MODERATE" && run.moderate === 0) return false
    if (severityFilter === "MINOR" && run.minor === 0) return false
    if (dateFilter) {
      const runDate = run.run_timestamp.split("T")[0]
      if (runDate !== dateFilter) return false
    }
    return true
  })

  return (
    <div className="min-h-screen" style={{ background: C.bg, width: "100%", maxWidth: "100vw", overflowX: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "28px 32px", borderBottom: `1px solid ${C.wire}` }}>
        <div style={{ maxWidth: 1100, marginLeft: "auto", marginRight: "auto" }}>
          <div className="text-[10px] tracking-[3px] font-bold" style={{ color: C.amber }}>INTEGRITY PROTOCOL</div>
          <h1 className="text-2xl font-bold mt-1 tracking-tight" style={{ color: C.hi }}>Proof of Reasoning Terminal</h1>
          <div className="text-[12px] mt-1" style={{ color: C.lbl }}>Autonomous AI reasoning audit · {data.total_runs} pipeline runs · Feb–May 2026</div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, marginLeft: "auto", marginRight: "auto", padding: "36px 32px" }}>

        {/* Stat Cards — amber border */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4" style={{ marginBottom: 28 }}>
          <StatCard label="TOTAL VIOLATIONS" value={data.total_violations.toLocaleString()} sub="AI reasoning failures caught" />
          <StatCard label="AVG PER RUN" value={`~${data.avg_per_run}`} sub="violations per pipeline cycle" />
          <StatCard label="SERIOUS" value={data.by_severity.SERIOUS.count.toLocaleString()} sub={`${data.by_severity.SERIOUS.pct}% of all violations`} />
          <StatCard label="PIPELINE RUNS" value={data.total_runs.toString()} sub="autonomous cycles completed" />
        </div>

        {/* Severity Distribution */}
        <div style={SECTION}>
          <SectionHeader title="SEVERITY DISTRIBUTION" />
          <div className="flex gap-1 mb-4" style={{ height: 36, borderRadius: 2, overflow: "hidden" }}>
            {Object.entries(data.by_severity).map(([sev, d]) => (
              <div key={sev} style={{ width: `${d.pct}%`, background: severityColors[sev], opacity: 0.85 }} />
            ))}
          </div>
          <div className="flex gap-6">
            {Object.entries(data.by_severity).map(([sev, d]) => (
              <div key={sev} className="flex items-center gap-2">
                <div style={{ width: 10, height: 10, borderRadius: 2, background: severityColors[sev] }} />
                <span className="text-[11px] font-semibold" style={{ color: C.lbl }}>{sev}</span>
                <span className="text-[11px] font-bold font-mono" style={{ color: C.val }}>{d.count.toLocaleString()}</span>
                <span className="text-[11px]" style={{ color: C.lbl }}>({d.pct}%)</span>
              </div>
            ))}
          </div>
        </div>

        {/* Gate Escalation + Rule Categories */}
        <div className="grid md:grid-cols-2 gap-6" style={{ marginBottom: 24 }}>
          <div style={{ padding: "24px 28px", background: C.tint, border: `1px solid ${C.wire}`, borderRadius: 4 }}>
            <SectionHeader title="GATE ESCALATION PATTERN" sub="Reasoning errors compound through layers" />
            {Object.entries(data.by_gate).map(([gate, d], i) => (
              <HBar key={gate} label={GATE_LABELS[gate] || gate.toUpperCase()} pct={d.pct} count={d.count} color={gateColors[i]} maxPct={maxGatePct} />
            ))}
          </div>
          <div style={{ padding: "24px 28px", background: C.tint, border: `1px solid ${C.wire}`, borderRadius: 4 }}>
            <SectionHeader title="RULE CATEGORIES" sub="RC + EPH = ~80% of all violations" />
            {Object.entries(data.by_rule_category).filter(([k]) => k !== "OTHER").map(([cat, d]) => (
              <HBar key={cat} label={CAT_LABELS[cat] || cat} pct={d.pct} count={d.count} color={CAT_COLORS[cat] || C.amber} maxPct={maxCatPct} />
            ))}
          </div>
        </div>

        {/* Emergent Learning */}
        <div style={SECTION}>
          <SectionHeader title="EMERGENT LEARNING" sub="The base model never learns. The system learns around it." />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <LearningMetric label="CORRECTIONS DENSITY" before="1.62/signal" after="2.17/signal" direction="up" color={C.olive} />
            <LearningMetric label="SERIOUS VIOLATIONS" before="8.66%" after="4.61%" direction="down" color={C.coral} />
            <LearningMetric label="GATE RESCISSIONS" before="0" after="45" direction="up" color={C.lavender} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <LearningMetric label="L4 UNCHANGED RATE" before="63.81%" after="67.62%" direction="up" color={C.slate} />
            <LearningMetric label="L4 ADJUSTMENT MAGNITUDE" before="0.21 avg" after="0.36 avg" direction="up" color={C.amber} />
            <div style={{ padding: "16px 20px", background: `${C.olive}08`, border: `1px solid ${C.olive}20`, borderRadius: 4, display: "flex", alignItems: "center" }}>
              <div>
                <div className="text-[10px] tracking-[1.5px] font-bold" style={{ color: C.lbl }}>CORRECTION PERSISTENCE</div>
                <div className="text-[12px] mt-1.5" style={{ color: C.val }}>38 unique corrections · oldest still firing at run 145</div>
              </div>
            </div>
          </div>
        </div>

        {/* Severity Heatmap + Run Ledger */}
        <div style={SECTION}>
          <SectionHeader title="SEVERITY HEATMAP" sub={`${data.total_runs} autonomous pipeline runs — color-coded by severity concentration`} />
          <SeverityHeatmap runs={data.trend} />

          {/* Run Ledger */}
          <div className="mt-8 pt-6" style={{ borderTop: `1px solid ${C.wire}` }}>
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <div className="text-[11px] tracking-[3px] font-bold" style={{ color: C.amber }}>RUN LEDGER</div>
              <div className="flex items-center gap-3 flex-wrap">
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  style={{
                    background: C.bg,
                    border: `1px solid ${C.wire}`,
                    borderRadius: 4,
                    padding: "5px 10px",
                    color: C.val,
                    fontSize: 11,
                    fontFamily: "monospace",
                    outline: "none",
                    colorScheme: "dark",
                  }}
                />
                {dateFilter && (
                  <button
                    onClick={() => setDateFilter("")}
                    style={{ background: "transparent", border: `1px solid ${C.wire}`, borderRadius: 4, padding: "5px 10px", color: C.lbl, fontSize: 10, cursor: "pointer", fontWeight: 700 }}
                  >
                    CLEAR
                  </button>
                )}
                <FilterBadge label="SERIOUS" color={C.coral} active={severityFilter === "SERIOUS"} onClick={() => setSeverityFilter(severityFilter === "SERIOUS" ? null : "SERIOUS")} />
                <FilterBadge label="MODERATE" color={C.amber} active={severityFilter === "MODERATE"} onClick={() => setSeverityFilter(severityFilter === "MODERATE" ? null : "MODERATE")} />
                <FilterBadge label="MINOR" color={C.slate} active={severityFilter === "MINOR"} onClick={() => setSeverityFilter(severityFilter === "MINOR" ? null : "MINOR")} />
              </div>
            </div>

            {/* Ledger Header */}
            <div className="grid py-2" style={{ gridTemplateColumns: "50px 90px 70px 70px 70px 80px", borderBottom: `1px solid ${C.wire}` }}>
              {["RUN", "DATE", "SIGNALS", "TOTAL", "SERIOUS", "MOD/MIN"].map((h) => (
                <span key={h} className="text-[10px] tracking-[1px] font-bold" style={{ color: C.lbl }}>{h}</span>
              ))}
            </div>

            {/* Ledger Rows */}
            <div style={{ maxHeight: 320, overflowY: "auto" }}>
              {filteredRuns.length === 0 ? (
                <div className="py-4 text-center text-[11px]" style={{ color: C.lbl }}>No runs match the current filters.</div>
              ) : (
                filteredRuns.map((run) => {
                  const origIdx = data.trend.indexOf(run)
                  const runNum = origIdx + 1
                  const dateStr = new Date(run.run_timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                  return (
                    <div
                      key={run.run_timestamp}
                      className="grid py-2 cursor-pointer"
                      style={{ gridTemplateColumns: "50px 90px 70px 70px 70px 80px", borderBottom: `1px solid ${C.row}` }}
                      onClick={() => window.open(`/trace/${run.run_timestamp.split("T")[0]}`, "_blank")}
                      onMouseEnter={(e) => { e.currentTarget.style.background = `${C.amber}08` }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent" }}
                    >
                      <span className="text-[11px] font-bold font-mono" style={{ color: C.amber }}>#{runNum}</span>
                      <span className="text-[11px] font-mono" style={{ color: C.lbl }}>{dateStr}</span>
                      <span className="text-[11px] font-mono" style={{ color: C.val }}>{run.signal_count}</span>
                      <span className="text-[11px] font-bold font-mono" style={{ color: C.val }}>{run.total}</span>
                      <span className="text-[11px] font-bold font-mono" style={{ color: run.serious > 30 ? C.coral : C.val }}>{run.serious}</span>
                      <span className="text-[11px] font-mono" style={{ color: C.lbl }}>{run.moderate}/{run.minor}</span>
                    </div>
                  )
                })
              )}
            </div>

            {(severityFilter || dateFilter) && (
              <div className="mt-2 text-[10px]" style={{ color: C.lbl }}>
                Showing {filteredRuns.length} of {data.total_runs} runs
              </div>
            )}
          </div>
        </div>

        {/* Diagnostic Matrix — 17 LZ Rules */}
        <div style={SECTION}>
          <SectionHeader title="DIAGNOSTIC MATRIX" sub="17 Layer Zero epistemological rules — click any rule for details" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            {lzRules.map((rule) => (
              <RuleBlock
                key={rule.rule_id}
                rule={rule}
                maxCount={maxRuleCount}
                isExpanded={expandedRule === rule.rule_id}
                onToggle={() => setExpandedRule(expandedRule === rule.rule_id ? null : rule.rule_id)}
              />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="py-6 mt-4 text-center" style={{ borderTop: `1px solid ${C.wire}` }}>
          <div className="text-[10px] tracking-[2px] font-bold" style={{ color: C.lbl }}>THE INTEGRITY PROTOCOL · PATENT PENDING · INTEGRITY AI LLC</div>
          <div className="text-[10px] mt-1.5" style={{ color: C.lbl }}>Built by Tim Wrenn · Fire Lieutenant · Zero Coding Background</div>
        </div>
      </div>
    </div>
  )
}
