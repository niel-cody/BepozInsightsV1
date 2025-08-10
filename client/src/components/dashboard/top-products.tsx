import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Coffee, Sandwich, Cookie, Salad, Soup } from "lucide-react";
import type { TopProduct } from "@shared/schema";

export function TopProducts() {
  const { data: topProducts, isLoading, error } = useQuery<TopProduct[]>({
    queryKey: ["/api/dashboard/top-products"],
  });

  // Icon mapping for different product categories
  const getCategoryIcon = (category?: string) => {
    switch (category?.toLowerCase()) {
      case 'beverage':
      case 'coffee':
        return Coffee;
      case 'food':
      case 'sandwich':
        return Sandwich;
      case 'bakery':
      case 'dessert':
        return Cookie;
      case 'salad':
        return Salad;
      default:
        return Soup;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (error) {
    return (
      <Card className="border border-red-200">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center h-80">
            <p className="text-red-600">Failed to load top products data</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-slate-900" data-testid="text-top-products-title">Top Products</h3>
            <p className="text-sm text-slate-500">Best performing items</p>
          </div>
          <Button variant="ghost" size="sm" className="text-primary hover:text-primary-700" data-testid="button-view-all-products">
            View all
          </Button>
        </div>
        
        <div className="space-y-4">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
                <Skeleton className="h-4 w-16" />
              </div>
            ))
          ) : topProducts && topProducts.length > 0 ? (
            topProducts.slice(0, 5).map((product, index) => {
              const Icon = getCategoryIcon(product.category);
              
              return (
                <div key={product.id} className="flex items-center justify-between" data-testid={`product-${index}`}>
                  <div className="flex items-center gap-3">
                    <div className="bg-slate-100 rounded-lg p-2">
                      <Icon className="text-slate-600 text-sm w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900" data-testid={`product-name-${index}`}>
                        {product.name}
                      </p>
                      <p className="text-sm text-slate-500" data-testid={`product-quantity-${index}`}>
                        {product.quantity} sold
                      </p>
                    </div>
                  </div>
                  <p className="font-semibold text-slate-900" data-testid={`product-revenue-${index}`}>
                    {formatCurrency(product.revenue)}
                  </p>
                </div>
              );
            })
          ) : (
            <div className="text-center py-8">
              <Soup className="mx-auto h-12 w-12 text-slate-400" />
              <h3 className="mt-2 text-sm font-medium text-slate-900">No products found</h3>
              <p className="mt-1 text-sm text-slate-500">
                No sales data available for the selected period.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
