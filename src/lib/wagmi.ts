import { http, createConfig } from "wagmi";
import { injected, walletConnect } from "wagmi/connectors";
import { appConfig } from "./config";
import { activeChain, rpcUrl } from "./chains";

export const wagmiConfig = createConfig({
  chains: [activeChain],
  connectors: [
    injected(),
    // WalletConnect is opt-in: its SDK is only reached for when a project id is configured.
    ...(appConfig.walletConnectProjectId
      ? [walletConnect({ projectId: appConfig.walletConnectProjectId })]
      : []),
  ],
  transports: {
    [activeChain.id]: http(rpcUrl),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
