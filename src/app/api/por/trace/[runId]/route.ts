import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  try {
    const { runId } = await params

    const tracesDir = path.join(process.cwd(), "data", "traces")

    if (!fs.existsSync(tracesDir)) {
      return NextResponse.json(
        { error: "Traces directory not found. Copy trace files into data/traces/" },
        { status: 404 }
      )
    }

    const files = fs.readdirSync(tracesDir)
    const matching = files.filter(
      (f) => f.startsWith(`cognitive-trace-${runId}`) && f.endsWith(".json")
    )

    if (matching.length === 0) {
      return NextResponse.json(
        { error: `No trace found for run date: ${runId}` },
        { status: 404 }
      )
    }

    const tracePath = path.join(tracesDir, matching[0])
    const raw = fs.readFileSync(tracePath, "utf-8")
    const data = JSON.parse(raw)

    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json(
      { error: "Failed to load trace data", detail: e.message },
      { status: 500 }
    )
  }
}
