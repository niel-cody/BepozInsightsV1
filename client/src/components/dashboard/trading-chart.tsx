import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect, useRef } from "react";
import type { SalesChartData } from "@shared/schema";

export function TradingChart() {
  const [period, setPeriod] = useState("30D");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<any>(null);

  const { data: chartData, isLoading, error } = useQuery<SalesChartData[]>({
    queryKey: ["/api/dashboard/sales-chart", period],
  });

  // Dynamically import Chart.js to avoid SSR issues
  useEffect(() => {
    const loadChart = async () => {
      if (!chartData || !canvasRef.current) return;

      // Destroy existing chart
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }

      // Dynamic import of Chart.js
      const { Chart, registerables } = await import('chart.js');
      Chart.register(...registerables);

      const ctx = canvasRef.current.getContext('2d');
      if (!ctx) return;

      chartInstanceRef.current = new Chart(ctx, {
        type: 'line',
        data: {
          labels: chartData.map(item => {
            const date = new Date(item.date);
            return date.toLocaleDateString('en-AU', { 
              month: 'short', 
              day: 'numeric' 
            });
          }),
          datasets: [{
            label: 'Net Sales',
            data: chartData.map(item => item.netSales),
            borderColor: 'hsl(214.3, 83.2%, 51.0%)',
            backgroundColor: 'hsla(214.3, 83.2%, 51.0%, 0.1)',
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: 'hsl(214.3, 83.2%, 51.0%)',
            pointBorderColor: 'white',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              mode: 'index',
              intersect: false,
              backgroundColor: 'white',
              titleColor: 'hsl(222.2, 84%, 4.9%)',
              bodyColor: 'hsl(222.2, 84%, 4.9%)',
              borderColor: 'hsl(214.3, 31.8%, 91.4%)',
              borderWidth: 1,
              cornerRadius: 8,
              displayColors: false,
              callbacks: {
                title: function(context) {
                  return `Sales on ${context[0].label}`;
                },
                label: function(context) {
                  return `$${context.parsed.y.toLocaleString()}`;
                }
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              grid: {
                color: 'hsl(214.3, 31.8%, 91.4%)',
                drawBorder: false,
              },
              border: {
                display: false,
              },
              ticks: {
                color: 'hsl(215.4, 16.3%, 46.9%)',
                font: {
                  size: 12,
                },
                callback: function(value) {
                  return '$' + (value as number).toLocaleString();
                }
              }
            },
            x: {
              grid: {
                display: false
              },
              border: {
                display: false,
              },
              ticks: {
                color: 'hsl(215.4, 16.3%, 46.9%)',
                font: {
                  size: 12,
                },
              }
            }
          },
          interaction: {
            mode: 'index',
            intersect: false,
          },
          elements: {
            line: {
              tension: 0.4
            }
          }
        }
      });
    };

    loadChart();

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }
    };
  }, [chartData]);

  if (error) {
    return (
      <Card className="xl:col-span-2 border border-red-200">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center h-80">
            <p className="text-red-600">Failed to load sales chart data</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="xl:col-span-2">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-slate-900" data-testid="text-chart-title">Net Sales Trend</h3>
            <p className="text-sm text-slate-500">Daily performance over selected period</p>
          </div>
          <div className="flex items-center gap-2">
            {["7D", "30D", "90D"].map((p) => (
              <Button
                key={p}
                variant={period === p ? "default" : "outline"}
                size="sm"
                onClick={() => setPeriod(p)}
                className="text-sm"
                data-testid={`button-period-${p.toLowerCase()}`}
              >
                {p}
              </Button>
            ))}
          </div>
        </div>
        
        <div className="h-80 relative">
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="space-y-4 w-full">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </div>
          ) : (
            <canvas
              ref={canvasRef}
              className="w-full h-full"
              data-testid="canvas-sales-chart"
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
