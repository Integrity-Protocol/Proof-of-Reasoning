import { paymentProxy, x402ResourceServer } from "@x402/next"
import { HTTPFacilitatorClient } from "@x402/core/server"
import { ExactEvmScheme } from "@x402/evm/exact/server"
import { createPaywall } from "@x402/paywall"
import { evmPaywall } from "@x402/paywall/evm"

const facilitatorClient = new HTTPFacilitatorClient({ url: "https://x402.org/facilitator" })
const resourceServer = new x402ResourceServer(facilitatorClient)
resourceServer.register("eip155:84532", new ExactEvmScheme())

const paywall = createPaywall()
  .withNetwork(evmPaywall)
  .withConfig({
    appName: "Proof of Reasoning",
    testnet: true,
  })
  .build()

export const proxy = paymentProxy(
  {
    "/trace/:path*": {
      accepts: {
        scheme: "exact",
        price: "$0.001",
        network: "eip155:84532",
        payTo: "0xf8c4Be305969A821A581D8098D97E3E8a457Ea80",
      },
      description: "Access cognitive trace — Integrity Protocol",
    },
  },
  resourceServer,
  undefined,
  paywall,
)

export const config = {
  matcher: ["/trace/:path*"],
}

export const middleware = proxy
