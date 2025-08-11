import type { IStorage } from "../storage";
import type { 
  User, 
  InsertUser, 
  Location,
  Product,
  KPIData,
  SalesChartData,
  TopProduct 
} from "@shared/schema";

// Sample data for demonstration
const sampleLocations: Location[] = [
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

const sampleProducts: Product[] = [
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

let users: User[] = [
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
];

export class MemoryStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    return users.find(u => u.id === id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return users.find(u => u.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const newUser: User = {
      id: `user-${Date.now()}`,
      ...insertUser,
      locationAccess: ["loc-1", "loc-2", "loc-3"], // Give access to all locations for demo
      isActive: true,
      createdAt: new Date(),
      lastLoginAt: undefined,
    };
    users.push(newUser);
    return newUser;
  }

  async updateUserLastLogin(id: string): Promise<void> {
    const user = users.find(u => u.id === id);
    if (user) {
      user.lastLoginAt = new Date();
    }
  }

  async getLocations(): Promise<Location[]> {
    return [...sampleLocations];
  }

  async getLocationsByUser(userId: string): Promise<Location[]> {
    const user = await this.getUser(userId);
    if (!user || !user.locationAccess) {
      return [];
    }

    return sampleLocations.filter(loc => user.locationAccess?.includes(loc.id));
  }

  async getProducts(): Promise<Product[]> {
    return sampleProducts.filter(p => p.active);
  }

  async getTopProducts(): Promise<TopProduct[]> {
    // Generate realistic sample data
    return [
      {
        id: "prod-1",
        name: "Flat White",
        category: "beverage",
        quantity: 247,
        revenue: 1111.50,
      },
      {
        id: "prod-2", 
        name: "Avocado Toast",
        category: "food",
        quantity: 89,
        revenue: 1646.50,
      },
      {
        id: "prod-3",
        name: "Acai Bowl", 
        category: "food",
        quantity: 76,
        revenue: 1216.00,
      },
      {
        id: "prod-4",
        name: "Green Smoothie",
        category: "beverage", 
        quantity: 98,
        revenue: 1176.00,
      },
      {
        id: "prod-5",
        name: "Croissant",
        category: "bakery",
        quantity: 156,
        revenue: 1014.00,
      },
    ];
  }

  async getKPIData(): Promise<KPIData> {
    return {
      grossSales: 28750,
      netSales: 26890,
      discounts: 1420,
      refunds: 440,
      aov: 47.85,
      grossSalesChange: 12.3,
      netSalesChange: 8.7,
      discountsChange: -5.2,
      refundsChange: 15.8,
      aovChange: 3.4,
    };
  }

  async getSalesChartData(): Promise<SalesChartData[]> {
    const data: SalesChartData[] = [];
    
    // Generate last 30 days of data
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      // Generate realistic daily sales with some variance
      const baseSales = 850;
      const variance = (Math.random() - 0.5) * 400; // ±$200 variance
      const weekendBonus = [0, 6].includes(date.getDay()) ? 200 : 0; // Weekend boost
      const netSales = Math.round(baseSales + variance + weekendBonus);
      
      data.push({
        date: dateStr,
        netSales,
      });
    }
    
    return data;
  }

  async executeReadOnlySQL(sqlQuery: string): Promise<any[]> {
    // For demo purposes, return sample query results based on common queries
    const query = sqlQuery.toLowerCase();
    
    if (query.includes('top') && query.includes('product')) {
      return [
        { product_name: "Flat White", total_sales: 1111.50, quantity_sold: 247 },
        { product_name: "Avocado Toast", total_sales: 1646.50, quantity_sold: 89 },
        { product_name: "Acai Bowl", total_sales: 1216.00, quantity_sold: 76 },
      ];
    }
    
    if (query.includes('sales') && query.includes('location')) {
      return [
        { location_name: "Bondi Beach Cafe", total_sales: 15250.00 },
        { location_name: "Surry Hills Bistro", total_sales: 8940.00 },
        { location_name: "Circular Quay Express", total_sales: 2700.00 },
      ];
    }
    
    if (query.includes('sales') && query.includes('day')) {
      return [
        { date: "2024-08-09", net_sales: 920.50 },
        { date: "2024-08-08", net_sales: 865.75 },
        { date: "2024-08-07", net_sales: 1150.25 },
      ];
    }
    
    // Default response for any other query
    return [
      { message: "Query executed successfully", result_count: 3 },
    ];
  }
}