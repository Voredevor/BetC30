import { Chain, getDefaultConfig } from "@rainbow-me/rainbowkit";
import {
  arbitrum,
  base,
  mainnet,
  optimism,
  polygon,
  sepolia,
} from "wagmi/chains";
import { bsc } from "viem/chains";

// export const bscTestnet = {
//   id: 97,
//   name: "bscTestnet",
//   // iconUrl: 'https://s2.coinmarketcap.com/static/img/coins/64x64/5805.png',
//   iconBackground: "#fff",
//   nativeCurrency: { name: "Avalanche", symbol: "BNB", decimals: 18 },
//   rpcUrls: {
//     default: { http: ["https://bsc-testnet-rpc.publicnode.com"] },
//   },
//   // contracts: {
//   //   multicall3: {
//   //     address: '0xca11bde05977b3631167028862be2a173976ca11',
//   //     blockCreated: 11_907_934,
//   //   },
//   // },
// } as const satisfies Chain;

export const config = getDefaultConfig({
  appName: "RainbowKit App",
  projectId: "YOUR_PROJECT_ID",
  chains: [
    bsc,
    // mainnet,
    // polygon,
    // optimism,
    // arbitrum,
    // base,
    // ...(process.env.NEXT_PUBLIC_ENABLE_TESTNETS === 'true' ? [sepolia] : []),
  ],
  ssr: true,
});
