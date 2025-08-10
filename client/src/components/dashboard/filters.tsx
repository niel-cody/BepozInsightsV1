import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import type { Location } from "@shared/schema";

export function Filters() {
  const [dateRange, setDateRange] = useState("7d");
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [channel, setChannel] = useState("all");

  const { data: locations } = useQuery<Location[]>({
    queryKey: ["/api/locations"],
  });

  return (
    <div className="flex items-center gap-3">
      {/* Date Range Filter */}
      <Select value={dateRange} onValueChange={setDateRange}>
        <SelectTrigger className="w-[140px]" data-testid="select-date-range">
          <SelectValue placeholder="Date range" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="7d">Last 7 days</SelectItem>
          <SelectItem value="30d">Last 30 days</SelectItem>
          <SelectItem value="90d">Last 90 days</SelectItem>
          <SelectItem value="custom">Custom range</SelectItem>
        </SelectContent>
      </Select>
      
      {/* Location Filter */}
      <Select value={selectedLocation} onValueChange={setSelectedLocation}>
        <SelectTrigger className="w-[160px]" data-testid="select-location">
          <SelectValue placeholder="All Locations" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Locations</SelectItem>
          {locations?.map((location) => (
            <SelectItem key={location.id} value={location.id}>
              {location.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Channel Filter */}
      <Select value={channel} onValueChange={setChannel}>
        <SelectTrigger className="w-[140px]" data-testid="select-channel">
          <SelectValue placeholder="All Channels" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Channels</SelectItem>
          <SelectItem value="dine_in">Dine In</SelectItem>
          <SelectItem value="takeaway">Takeaway</SelectItem>
          <SelectItem value="delivery">Delivery</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
