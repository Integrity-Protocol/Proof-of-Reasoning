import { NextRequest, NextResponse } from "next/server"
import { withX402 } from "@x402/next"
import { x402ResourceServer, HTTPFacilitatorClient } from "@x402/core/server"
import { ExactEvmScheme } from "@x402/evm/exact/server"
import fs from "fs"
import path from "path"

const facilitatorClient = new HTTPFacilitatorClient({ url: "https://x402.org/facilitator" })
const server = new x402ResourceServer(facilitatorClient)
server.register("eip155:84532", new ExactEvmScheme())

const handler = async (
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) => {
  const { runId } = await params
  const tracesDir = path.join(process.cwd(), "data", "traces")

  if (!fs.existsSync(tracesDir)) {
    return NextResponse.json(
      { error: "Traces directory not found" },
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
}

export const GET = withX402(
  handler,
  {
    accepts: {
      scheme: "exact",
      price: "$0.001",
      network: "eip155:84532",
      payTo: "0xf8c4Be305969A821A581D8098D97E3E8a457Ea80",
    },
    description: "Access cognitive trace data from an autonomous AI pipeline run",
  },
  server,
)
