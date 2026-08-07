import { BrowserRouter, Routes, Route } from "react-router";
import { Providers } from "./providers";
import { WalletProvider } from "./components/obulus/wallet";
import { TopNav } from "./components/obulus/top-nav";
import { Board } from "./components/obulus/board";
import { DealDetail } from "./components/obulus/deal-detail";
import { OffersPage, DealsPage, DisputesPage, DocsPage, NotFoundPage } from "./components/obulus/pages";
import { Toaster } from "./components/ui/sonner";

// Application shell: keep shared providers above the router so every route has access to wallet and transaction state.
export default function App() {
  return (
    <Providers>
    <WalletProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-obulus-bg text-obulus-ink">
          <TopNav />
          <main>
            {/* Route map for the current single-page DApp. Add future screens here rather than branching in page components. */}
            <Routes>
              <Route path="/" element={<Board />} />
              <Route path="/offers" element={<OffersPage />} />
              <Route path="/deals" element={<DealsPage />} />
              <Route path="/deals/:id" element={<DealDetail />} />
              <Route path="/disputes" element={<DisputesPage />} />
              <Route path="/docs" element={<DocsPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
      <Toaster position="bottom-right" />
    </WalletProvider>
    </Providers>
  );
}
