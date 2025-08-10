import { AuthGuard } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { KPICards } from "@/components/dashboard/kpi-cards";
import { TradingChart } from "@/components/dashboard/trading-chart";
import { TopProducts } from "@/components/dashboard/top-products";
import { AIQueryPanel } from "@/components/dashboard/ai-query-panel";

export default function DashboardPage() {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-slate-50">
        <Sidebar />
        
        <main className="lg:ml-64">
          <Header 
            title="Dashboard" 
            subtitle="Welcome back, let's analyze your sales data" 
          />
          
          <div className="p-6 space-y-6">
            {/* KPI Cards */}
            <KPICards />

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* Trading Chart */}
              <TradingChart />

              {/* Top Products */}
              <TopProducts />
            </div>

            {/* AI Query Panel */}
            <AIQueryPanel />
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
