import type { 
  Location, 
  Product, 
  Order, 
  OrderItem, 
  User,
  KPIData,
  SalesChartData,
  TopProduct 
} from "@shared/schema";

// Sample locations
export const sampleLocations: Location[] = [
  {
    id: "loc-1",
    name: "Bondi Beach Cafe",
    address: "123 Campbell Parade",
    city: "Bondi Beach",
    state: "NSW",
    country: "Australia",
    timezone: "Australia/Sydney",
    createdAt: new Date("2024-01-01"),
  },
  {
    id: "loc-2", 
    name: "Surry Hills Bistro",
    address: "456 Crown Street",
    city: "Surry Hills",
    state: "NSW",
    country: "Australia",
    timezone: "Australia/Sydney",
    createdAt: new Date("2024-01-01"),
  },
  {
    id: "loc-3",
    name: "Circular Quay Express",
    address: "789 George Street",
    city: "Sydney",
    state: "NSW", 
    country: "Australia",
    timezone: "Australia/Sydney",
    createdAt: new Date("2024-01-01"),
  },
];

// Sample products
export const sampleProducts: Product[] = [
  {
    id: "prod-1",
    name: "Flat White",
    category: "beverage",
    price: "4.50",
    cost: "1.80",
    active: true,
    createdAt: new Date("2024-01-01"),
  },
  {
    id: "prod-2",
    name: "Avocado Toast",
    category: "food",
    price: "18.50",
    cost: "6.20",
    active: true,
    createdAt: new Date("2024-01-01"),
  },
  {
    id: "prod-3",
    name: "Acai Bowl",
    category: "food", 
    price: "16.00",
    cost: "5.50",
    active: true,
    createdAt: new Date("2024-01-01"),
  },
  {
    id: "prod-4",
    name: "Green Smoothie",
    category: "beverage",
    price: "12.00",
    cost: "4.00",
    active: true,
    createdAt: new Date("2024-01-01"),
  },
  {
    id: "prod-5",
    name: "Croissant",
    category: "bakery",
    price: "6.50",
    cost: "2.20",
    active: true,
    createdAt: new Date("2024-01-01"),
  },
];

// Sample users
export const sampleUsers: User[] = [
  {
    id: "user-1",
    email: "manager@bepoz.com",
    name: "Sarah Chen",
    role: "manager",
    locationAccess: ["loc-1", "loc-2"],
    isActive: true,
    createdAt: new Date("2024-01-01"),
    lastLoginAt: new Date(),
  },
  {
    id: "user-2",
    email: "admin@bepoz.com", 
    name: "Mike Johnson",
    role: "admin",
    locationAccess: ["loc-1", "loc-2", "loc-3"],
    isActive: true,
    createdAt: new Date("2024-01-01"),
    lastLoginAt: new Date(),
  },
];

// Helper function to generate sample orders
function generateSampleOrders(): Order[] {
  const orders: Order[] = [];
  const channels = ["dine_in", "takeaway", "delivery"];
  const orderTypes = ["food", "beverage"];
  
  // Generate orders for the last 30 days
  for (let i = 0; i < 30; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    // Generate 15-50 orders per day
    const ordersPerDay = Math.floor(Math.random() * 35) + 15;
    
    for (let j = 0; j < ordersPerDay; j++) {
      const locationId = sampleLocations[Math.floor(Math.random() * sampleLocations.length)].id;
      const channel = channels[Math.floor(Math.random() * channels.length)];
      const orderType = orderTypes[Math.floor(Math.random() * orderTypes.length)];
      
      // Generate random order values
      const subtotal = Math.floor(Math.random() * 80) + 20; // $20-$100
      const discountAmount = Math.random() < 0.3 ? Math.floor(subtotal * 0.1) : 0; // 30% chance of 10% discount
      const taxAmount = Math.floor(subtotal * 0.1); // 10% tax
      const totalAmount = subtotal + taxAmount;
      const refundAmount = Math.random() < 0.05 ? subtotal : 0; // 5% chance of refund
      const netAmount = totalAmount - refundAmount - discountAmount;
      
      const orderDate = new Date(date);
      orderDate.setHours(Math.floor(Math.random() * 12) + 6); // 6 AM to 6 PM
      orderDate.setMinutes(Math.floor(Math.random() * 60));
      
      orders.push({
        id: `order-${i}-${j}`,
        locationId,
        orderNumber: `ORD-${String(i * 100 + j).padStart(6, '0')}`,
        channel,
        orderType,
        subtotal: subtotal.toString(),
        discountAmount: discountAmount.toString(),
        taxAmount: taxAmount.toString(),
        totalAmount: totalAmount.toString(),
        refundAmount: refundAmount.toString(),
        netAmount: netAmount.toString(),
        customerName: Math.random() < 0.7 ? `Customer ${Math.floor(Math.random() * 1000)}` : undefined,
        customerEmail: Math.random() < 0.5 ? `customer${Math.floor(Math.random() * 1000)}@email.com` : undefined,
        status: refundAmount > 0 ? "refunded" : "completed",
        createdAt: orderDate,
        completedAt: orderDate,
      });
    }
  }
  
  return orders;
}

export const sampleOrders = generateSampleOrders();

// Generate sample order items
export const sampleOrderItems: OrderItem[] = [];
sampleOrders.forEach(order => {
  const itemCount = Math.floor(Math.random() * 4) + 1; // 1-4 items per order
  const usedProducts = new Set<string>();
  
  for (let i = 0; i < itemCount; i++) {
    let product;
    do {
      product = sampleProducts[Math.floor(Math.random() * sampleProducts.length)];
    } while (usedProducts.has(product.id) && usedProducts.size < sampleProducts.length);
    
    usedProducts.add(product.id);
    
    const quantity = Math.floor(Math.random() * 3) + 1; // 1-3 quantity
    const unitPrice = parseFloat(product.price);
    const totalPrice = unitPrice * quantity;
    const discountAmount = parseFloat(order.discountAmount) > 0 ? totalPrice * 0.1 : 0;
    const netPrice = totalPrice - discountAmount;
    
    sampleOrderItems.push({
      id: `item-${order.id}-${i}`,
      orderId: order.id,
      productId: product.id,
      quantity,
      unitPrice: unitPrice.toString(),
      totalPrice: totalPrice.toString(),
      discountAmount: discountAmount.toString(),
      netPrice: netPrice.toString(),
    });
  }
});

// Calculate sample KPI data
export function getSampleKPIData(): KPIData {
  const completedOrders = sampleOrders.filter(o => o.status === "completed");
  const last7Days = completedOrders.filter(o => {
    const orderDate = new Date(o.createdAt);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return orderDate >= sevenDaysAgo;
  });
  
  const prev7Days = completedOrders.filter(o => {
    const orderDate = new Date(o.createdAt);
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return orderDate >= fourteenDaysAgo && orderDate < sevenDaysAgo;
  });
  
  const current = {
    grossSales: last7Days.reduce((sum, o) => sum + parseFloat(o.totalAmount), 0),
    netSales: last7Days.reduce((sum, o) => sum + parseFloat(o.netAmount), 0),
    discounts: last7Days.reduce((sum, o) => sum + parseFloat(o.discountAmount), 0),
    refunds: last7Days.reduce((sum, o) => sum + parseFloat(o.refundAmount), 0),
    orderCount: last7Days.length,
  };
  
  const previous = {
    grossSales: prev7Days.reduce((sum, o) => sum + parseFloat(o.totalAmount), 0),
    netSales: prev7Days.reduce((sum, o) => sum + parseFloat(o.netAmount), 0),
    discounts: prev7Days.reduce((sum, o) => sum + parseFloat(o.discountAmount), 0),
    refunds: prev7Days.reduce((sum, o) => sum + parseFloat(o.refundAmount), 0),
    orderCount: prev7Days.length,
  };
  
  const calculateChange = (curr: number, prev: number) => {
    if (prev === 0) return curr > 0 ? 100 : 0;
    return ((curr - prev) / prev) * 100;
  };
  
  return {
    grossSales: current.grossSales,
    netSales: current.netSales,
    discounts: current.discounts,
    refunds: current.refunds,
    aov: current.orderCount > 0 ? current.netSales / current.orderCount : 0,
    grossSalesChange: calculateChange(current.grossSales, previous.grossSales),
    netSalesChange: calculateChange(current.netSales, previous.netSales),
    discountsChange: calculateChange(current.discounts, previous.discounts),
    refundsChange: calculateChange(current.refunds, previous.refunds),
    aovChange: calculateChange(
      current.orderCount > 0 ? current.netSales / current.orderCount : 0,
      previous.orderCount > 0 ? previous.netSales / previous.orderCount : 0
    ),
  };
}

// Calculate sample sales chart data
export function getSampleSalesChartData(): SalesChartData[] {
  const last30Days: SalesChartData[] = [];
  
  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    const dayOrders = sampleOrders.filter(o => {
      const orderDate = new Date(o.createdAt);
      return orderDate.toISOString().split('T')[0] === dateStr && o.status === "completed";
    });
    
    const netSales = dayOrders.reduce((sum, o) => sum + parseFloat(o.netAmount), 0);
    
    last30Days.push({
      date: dateStr,
      netSales,
    });
  }
  
  return last30Days;
}

// Calculate sample top products
export function getSampleTopProducts(): TopProduct[] {
  const productStats = new Map<string, { quantity: number; revenue: number; name: string; category: string }>();
  
  sampleOrderItems.forEach(item => {
    const product = sampleProducts.find(p => p.id === item.productId);
    if (!product) return;
    
    const current = productStats.get(product.id) || { 
      quantity: 0, 
      revenue: 0, 
      name: product.name, 
      category: product.category || 'other' 
    };
    
    current.quantity += item.quantity;
    current.revenue += parseFloat(item.netPrice);
    
    productStats.set(product.id, current);
  });
  
  return Array.from(productStats.entries())
    .map(([id, stats]) => ({
      id,
      name: stats.name,
      category: stats.category,
      quantity: stats.quantity,
      revenue: stats.revenue,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);
}