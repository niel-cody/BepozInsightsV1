import { useState } from "react";
import { CalendarIcon, MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export function SlicersPanel() {
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [selectedPeriod, setSelectedPeriod] = useState("30d");
  const [customDateRange, setCustomDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: undefined,
    to: undefined,
  });
  const [showCustomDate, setShowCustomDate] = useState(false);

  const locations = [
    { id: "all", name: "All Locations" },
    { id: "loc-1", name: "Main Street" },
    { id: "loc-2", name: "Mall Plaza" },
    { id: "loc-3", name: "Downtown" },
  ];

  const periods = [
    { value: "7d", label: "Last 7 days" },
    { value: "30d", label: "Last 30 days" },
    { value: "90d", label: "Last 90 days" },
    { value: "6m", label: "Last 6 months" },
    { value: "1y", label: "Last year" },
    { value: "custom", label: "Custom range" },
  ];

  const handlePeriodChange = (value: string) => {
    setSelectedPeriod(value);
    if (value === "custom") {
      setShowCustomDate(true);
    } else {
      setShowCustomDate(false);
      setCustomDateRange({ from: undefined, to: undefined });
    }
  };

  return (
    <Card className="p-4">
      <div className="flex items-center gap-6">
        {/* Location Filter */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <MapPin className="w-4 h-4" />
            Location:
          </div>
          <Select value={selectedLocation} onValueChange={setSelectedLocation}>
            <SelectTrigger className="w-48" data-testid="select-dashboard-location">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {locations.map((location) => (
                <SelectItem key={location.id} value={location.id}>
                  {location.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Period Filter */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <CalendarIcon className="w-4 h-4" />
            Period:
          </div>
          <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
            <SelectTrigger className="w-48" data-testid="select-dashboard-period">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {periods.map((period) => (
                <SelectItem key={period.value} value={period.value}>
                  {period.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Custom Date Range */}
        {showCustomDate && (
          <div className="flex items-center gap-3">
            <div className="text-sm font-medium text-gray-700">Custom Range:</div>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-60 justify-start text-left font-normal",
                    !customDateRange.from && "text-muted-foreground"
                  )}
                  data-testid="button-custom-date-range"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {customDateRange.from ? (
                    customDateRange.to ? (
                      <>
                        {format(customDateRange.from, "LLL dd, y")} -{" "}
                        {format(customDateRange.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(customDateRange.from, "LLL dd, y")
                    )
                  ) : (
                    <span>Pick a date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={customDateRange.from}
                  selected={customDateRange}
                  onSelect={setCustomDateRange}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>
        )}

        {/* Apply Button */}
        <Button 
          className="ml-auto"
          data-testid="button-apply-filters"
        >
          Apply Filters
        </Button>
      </div>
    </Card>
  );
}