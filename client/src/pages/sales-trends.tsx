import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, CalendarDays, ChevronDown, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { AuthGuard } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { FilterBar } from "@/components/sales-trends/filter-bar";

// Mock data for the calendar and analytics
const generateCalendarData = () => {
  const data = [];
  const startDate = new Date(2024, 7, 1); // August 2024
  const endDate = new Date(2025, 7, 31); // August 2025
  
  let currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const dayOfWeek = currentDate.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    // Generate sales data with some patterns
    let salesAmount = Math.random() * 50000 + 10000;
    if (isWeekend) salesAmount *= 0.7; // Lower weekend sales
    
    // Create intensity levels for heatmap
    let intensity = 0;
    if (salesAmount > 45000) intensity = 5;
    else if (salesAmount > 35000) intensity = 4;
    else if (salesAmount > 25000) intensity = 3;
    else if (salesAmount > 15000) intensity = 2;
    else intensity = 1;
    
    data.push({
      date: new Date(currentDate),
      sales: Math.round(salesAmount),
      intensity
    });
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return data;
};

const calendarData = generateCalendarData();

const monthlyData = [
  { month: "Jan", total: "$12,976,094", daily: "$4,463", yoy: "+5%" },
  { month: "Feb", total: "$10,407,962", daily: "$3,727", yoy: "+8%" },
  { month: "Mar", total: "$16,591,692", daily: "$5,335", yoy: "+12%" },
  { month: "Apr", total: "$16,115,110", daily: "$5,597", yoy: "+7%" },
  { month: "May", total: "$19,726,354", daily: "$6,549", yoy: "+15%" },
  { month: "Jun", total: "$20,412,965", daily: "$7,165", yoy: "+18%" },
  { month: "Jul", total: "$21,503,517", daily: "$7,609", yoy: "+22%" },
  { month: "Aug", total: "$5,415,988", daily: "$6,795", yoy: "+9%" },
];

const recentDays = [
  { day: "Today", total: "$31,365", vsWeek: "+6.3%", vsYear: "+0.0%" },
  { day: "Yesterday", total: "", vsWeek: "", vsYear: "" },
  { day: "Sat, Aug 9", total: "", vsWeek: "", vsYear: "" },
  { day: "Fri, Aug 8", total: "$31,365", vsWeek: "+6.3%", vsYear: "+0.0%" },
  { day: "Thu, Aug 7", total: "$26,872", vsWeek: "-9.7%", vsYear: "+0.0%" },
  { day: "Wed, Aug 6", total: "$26,709", vsWeek: "-8.9%", vsYear: "+0.0%" },
  { day: "Tue, Aug 5", total: "$29,715", vsWeek: "+25.4%", vsYear: "+0.0%" },
];

const categoriesData = [
  { name: "Beverages", percentage: 20, color: "bg-purple-500" },
  { name: "Accessories", percentage: 25, color: "bg-purple-400" },
  { name: "Food", percentage: 25, color: "bg-purple-300" },
  { name: "Services", percentage: 10, color: "bg-purple-600" },
  { name: "Merchandise", percentage: 20, color: "bg-purple-200" },
];

const CalendarHeatmap = ({ data }: { data: any[] }) => {
  const months = [
    "August 2024", "September 2024", "October 2024", "November 2024", 
    "December 2024", "January 2025", "February 2025", "March 2025",
    "April 2025", "May 2025", "June 2025", "July 2025", "August 2025"
  ];
  
  const weekDays = ["S", "M", "T", "W", "T", "F", "S"];
  
  const getIntensityColor = (intensity: number) => {
    switch (intensity) {
      case 5: return "bg-purple-600";
      case 4: return "bg-purple-500";
      case 3: return "bg-purple-400";
      case 2: return "bg-purple-300";
      case 1: return "bg-purple-200";
      default: return "bg-gray-100";
    }
  };
  
  return (
    <div className="space-y-4">
      {months.map((month, monthIndex) => {
        const monthData = data.filter(d => {
          const monthYear = d.date.toLocaleString('default', { month: 'long', year: 'numeric' });
          return monthYear === month;
        });
        
        if (monthData.length === 0) return null;
        
        // Create calendar grid
        const firstDay = new Date(monthData[0].date.getFullYear(), monthData[0].date.getMonth(), 1);
        const startDay = firstDay.getDay();
        const daysInMonth = new Date(monthData[0].date.getFullYear(), monthData[0].date.getMonth() + 1, 0).getDate();
        
        return (
          <div key={month} className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700">{month}</h4>
            <div className="grid grid-cols-7 gap-1 text-xs">
              {weekDays.map((day, index) => (
                <div key={`weekday-${index}`} className="text-center text-gray-500 text-xs p-1 font-medium">
                  {day}
                </div>
              ))}
              
              {/* Empty cells for days before month starts */}
              {Array.from({ length: startDay }).map((_, i) => (
                <div key={`empty-${monthIndex}-${i}`} className="h-6"></div>
              ))}
              
              {/* Days of the month */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dayData = monthData.find(d => d.date.getDate() === day);
                const intensity = dayData?.intensity || 0;
                
                return (
                  <div
                    key={`day-${monthIndex}-${day}`}
                    className={`h-6 w-6 rounded-sm flex items-center justify-center text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity ${
                      getIntensityColor(intensity)
                    } ${intensity > 2 ? 'text-white' : 'text-gray-700'}`}
                    title={dayData ? `${dayData.date.toLocaleDateString()}: $${dayData.sales.toLocaleString()}` : ''}
                  >
                    {day}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default function SalesTrendsPage() {
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [selectedChannel, setSelectedChannel] = useState("all");
  const [selectedType, setSelectedType] = useState("all");

  return (
    <AuthGuard>
      <div className="min-h-screen bg-slate-50">
        <Sidebar />
        
        <main className="lg:ml-64">
          <Header 
            title="Sales Trends" 
            subtitle="Analyze sales patterns and performance trends over time" 
          />
          
          <div className="p-6">
            {/* Filter Bar */}
            <FilterBar />
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Calendar Heatmap */}
              <div className="lg:col-span-2">
                <Card className="h-full">
                  <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-white border-purple-200 text-purple-600"
                      data-testid="button-sales-overview"
                    >
                      Sales Overview
                    </Button>
                    <Button variant="ghost" size="sm" data-testid="button-trade-lens">
                      Trade Lens
                    </Button>
                  </div>
                  <Select defaultValue="net-sales">
                    <SelectTrigger className="w-32" data-testid="select-metric">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="net-sales">Net Sales</SelectItem>
                      <SelectItem value="gross-sales">Gross Sales</SelectItem>
                      <SelectItem value="transactions">Transactions</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="text-sm text-gray-600">
                  Rolling 12-Month Net Sales Trends • All Locations & Channels • Aug 2024 to Aug 2025
                </div>
                <div className="text-xs text-gray-500">(Monthly View)</div>
                  </CardHeader>
                  <CardContent>
                    <div className="max-h-96 overflow-y-auto">
                      <CalendarHeatmap data={calendarData} />
                    </div>
                    
                    {/* Legend */}
                    <div className="flex items-center justify-center mt-4 gap-2">
                      <span className="text-xs text-gray-500">Less</span>
                      <div className="flex gap-1">
                        <div className="w-3 h-3 bg-gray-100 rounded-sm"></div>
                        <div className="w-3 h-3 bg-purple-200 rounded-sm"></div>
                        <div className="w-3 h-3 bg-purple-300 rounded-sm"></div>
                        <div className="w-3 h-3 bg-purple-400 rounded-sm"></div>
                        <div className="w-3 h-3 bg-purple-500 rounded-sm"></div>
                        <div className="w-3 h-3 bg-purple-600 rounded-sm"></div>
                      </div>
                      <span className="text-xs text-gray-500">More</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right sidebar */}
              <div className="space-y-6">
                {/* Recent Days */}
                <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <CalendarDays className="w-4 h-4" />
                  Recent Days
                </CardTitle>
                <p className="text-xs text-gray-500">
                  Rolling 7-day view with vs last week & vs last year
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <div className="grid grid-cols-4 gap-2 text-xs font-medium text-gray-600 pb-2 border-b">
                    <span>Day</span>
                    <span>Total</span>
                    <span>vs week</span>
                    <span>vs year</span>
                  </div>
                  {recentDays.map((day, index) => (
                    <div key={index} className="grid grid-cols-4 gap-2 text-xs py-1">
                      <span className="text-gray-900">{day.day}</span>
                      <span className="font-medium">{day.total}</span>
                      <span className={`flex items-center gap-1 ${
                        day.vsWeek.includes('+') ? 'text-green-600' : 
                        day.vsWeek.includes('-') ? 'text-red-600' : 'text-gray-500'
                      }`}>
                        {day.vsWeek && (
                          <>
                            {day.vsWeek.includes('+') ? (
                              <TrendingUp className="w-3 h-3" />
                            ) : day.vsWeek.includes('-') ? (
                              <TrendingDown className="w-3 h-3" />
                            ) : null}
                            {day.vsWeek}
                          </>
                        )}
                      </span>
                      <span className={`${
                        day.vsYear.includes('+') ? 'text-green-600' : 
                        day.vsYear.includes('-') ? 'text-red-600' : 'text-gray-500'
                      }`}>
                        {day.vsYear}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

                {/* Net Sales Distribution */}
                <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">Net Sales Distribution</CardTitle>
                  <Select defaultValue="categories">
                    <SelectTrigger className="w-24 h-6 text-xs" data-testid="select-distribution">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="categories">Categories</SelectItem>
                      <SelectItem value="locations">Locations</SelectItem>
                      <SelectItem value="channels">Channels</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {categoriesData.map((category, index) => (
                    <div key={index} className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-white">{category.name}</span>
                        <span className="text-sm font-bold text-white">{category.percentage}%</span>
                      </div>
                      <div className="h-8 bg-gray-200 rounded overflow-hidden">
                        <div 
                          className={`h-full ${category.color} flex items-center justify-center`}
                          style={{ width: `${category.percentage * 4}%` }}
                        >
                          <span className="text-sm font-medium text-white">{category.name}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

                {/* Monthly Analytics */}
                <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  Monthly Analytics
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                    +783% YoY
                  </span>
                </CardTitle>
                <p className="text-xs text-gray-500">
                  Track past monthly performance & YoY growth
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <div className="grid grid-cols-4 gap-2 text-xs font-medium text-gray-600 pb-2 border-b">
                    <span>Month</span>
                    <span>Total</span>
                    <span>Daily Avg</span>
                    <span>YoY</span>
                  </div>
                  {monthlyData.map((month, index) => (
                    <div key={index} className="grid grid-cols-4 gap-2 text-xs py-1">
                      <span className="text-gray-900">{month.month}</span>
                      <span className="font-medium">{month.total}</span>
                      <span>{month.daily}</span>
                      <span className="text-green-600 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        {month.yoy}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}