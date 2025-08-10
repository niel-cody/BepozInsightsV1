import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, TrendingUp, Percent, RotateCcw, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";
import type { KPIData } from "@shared/schema";

export function KPICards() {
  const { data: kpiData, isLoading, error } = useQuery<KPIData>({
    queryKey: ["/api/dashboard/kpi"],
  });

  if (error) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="border border-red-200">
            <CardContent className="pt-6">
              <p className="text-sm text-red-600">Failed to load KPI data</p>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-8 w-24" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <Skeleton className="h-12 w-12 rounded-full" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const kpis = [
    {
      title: "Gross Sales",
      value: kpiData?.grossSales || 0,
      change: kpiData?.grossSalesChange || 0,
      icon: DollarSign,
      bgClass: "kpi-gradient-blue",
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
      testId: "kpi-gross-sales",
    },
    {
      title: "Net Sales",
      value: kpiData?.netSales || 0,
      change: kpiData?.netSalesChange || 0,
      icon: TrendingUp,
      bgClass: "kpi-gradient-emerald",
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
      testId: "kpi-net-sales",
    },
    {
      title: "Discounts",
      value: kpiData?.discounts || 0,
      change: kpiData?.discountsChange || 0,
      icon: Percent,
      bgClass: "kpi-gradient-amber",
      iconBg: "bg-amber-50",
      iconColor: "text-amber-600",
      testId: "kpi-discounts",
    },
    {
      title: "Refunds",
      value: kpiData?.refunds || 0,
      change: kpiData?.refundsChange || 0,
      icon: RotateCcw,
      bgClass: "kpi-gradient-red",
      iconBg: "bg-red-50",
      iconColor: "text-red-600",
      testId: "kpi-refunds",
    },
    {
      title: "AOV",
      value: kpiData?.aov || 0,
      change: kpiData?.aovChange || 0,
      icon: Receipt,
      bgClass: "kpi-gradient-purple",
      iconBg: "bg-purple-50",
      iconColor: "text-purple-600",
      testId: "kpi-aov",
    },
  ];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatChange = (change: number) => {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(1)}%`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6">
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        const isPositive = kpi.change >= 0;
        
        return (
          <Card key={kpi.title} className={cn("border border-slate-200", kpi.bgClass)}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">{kpi.title}</p>
                  <p className="text-2xl font-bold text-slate-900" data-testid={`${kpi.testId}-value`}>
                    {kpi.title === "AOV" ? formatCurrency(kpi.value) : formatCurrency(kpi.value)}
                  </p>
                  <p className={cn(
                    "text-sm mt-1 flex items-center gap-1",
                    isPositive ? "text-emerald-600" : "text-red-600"
                  )} data-testid={`${kpi.testId}-change`}>
                    <span className="text-xs">
                      {isPositive ? "↗" : "↘"}
                    </span>
                    {formatChange(kpi.change)}
                  </p>
                </div>
                <div className={cn("rounded-full p-3", kpi.iconBg)}>
                  <Icon className={cn("w-5 h-5", kpi.iconColor)} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
