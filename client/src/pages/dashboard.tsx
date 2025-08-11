import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { SlicersPanel } from "@/components/dashboard/slicers-panel";
import { KPICards } from "@/components/dashboard/kpi-cards";
import { TradingChart } from "@/components/dashboard/trading-chart";
import { TopProducts } from "@/components/dashboard/top-products";

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      
      <main className="lg:ml-64">
        <Header 
          title="Dashboard" 
          subtitle="Welcome back, let's analyze your sales data" 
        />
        
        <div className="p-6 space-y-6">
          {/* Slicers Panel */}
          <SlicersPanel />
          
          {/* KPI Cards */}
          <KPICards />

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Trading Chart */}
            <TradingChart />

            {/* Top Products */}
            <TopProducts />
          </div>
        </div>
      </main>
    </div>
  );
}
