import { eq, desc, sum, sql, and, gte, lte, inArray, count } from "drizzle-orm";
import { db, schema } from "./services/supabase";
import { 
  type User, 
  type InsertUser, 
  type Location,
  type Product,
  type Order,
  type OrderItem,
  type KPIData,
  type SalesChartData,
  type TopProduct,
  users,
  locations,
  products,
  orders,
  orderItems
} from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserLastLogin(id: string): Promise<void>;

  // Locations
  getLocations(): Promise<Location[]>;
  getLocationsByUser(userId: string): Promise<Location[]>;

  // Products
  getProducts(): Promise<Product[]>;
  getTopProducts(dateRange?: { from: Date; to: Date }, locationIds?: string[]): Promise<TopProduct[]>;

  // Dashboard Analytics
  getKPIData(dateRange?: { from: Date; to: Date }, locationIds?: string[]): Promise<KPIData>;
  getSalesChartData(dateRange?: { from: Date; to: Date }, locationIds?: string[]): Promise<SalesChartData[]>;

  // AI Query Execution
  executeReadOnlySQL(sqlQuery: string): Promise<any[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  async updateUserLastLogin(id: string): Promise<void> {
    await db.update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, id));
  }

  async getLocations(): Promise<Location[]> {
    return await db.select().from(locations).orderBy(locations.name);
  }

  async getLocationsByUser(userId: string): Promise<Location[]> {
    const user = await this.getUser(userId);
    if (!user || !user.locationAccess) {
      return [];
    }

    return await db.select()
      .from(locations)
      .where(inArray(locations.id, user.locationAccess))
      .orderBy(locations.name);
  }

  async getProducts(): Promise<Product[]> {
    return await db.select()
      .from(products)
      .where(eq(products.active, true))
      .orderBy(products.name);
  }

  async getTopProducts(dateRange?: { from: Date; to: Date }, locationIds?: string[]): Promise<TopProduct[]> {
    let query = db
      .select({
        id: products.id,
        name: products.name,
        category: products.category,
        quantity: sum(orderItems.quantity).mapWith(Number),
        revenue: sum(orderItems.netPrice).mapWith(Number),
      })
      .from(orderItems)
      .innerJoin(products, eq(orderItems.productId, products.id))
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(eq(orders.status, 'completed'))
      .groupBy(products.id, products.name, products.category)
      .orderBy(desc(sum(orderItems.netPrice)))
      .limit(10);

    // Add date filter if provided
    if (dateRange) {
      query = query.where(and(
        eq(orders.status, 'completed'),
        gte(orders.createdAt, dateRange.from),
        lte(orders.createdAt, dateRange.to)
      ));
    }

    // Add location filter if provided
    if (locationIds && locationIds.length > 0) {
      query = query.where(and(
        eq(orders.status, 'completed'),
        inArray(orders.locationId, locationIds),
        ...(dateRange ? [gte(orders.createdAt, dateRange.from), lte(orders.createdAt, dateRange.to)] : [])
      ));
    }

    return await query;
  }

  async getKPIData(dateRange?: { from: Date; to: Date }, locationIds?: string[]): Promise<KPIData> {
    // Current period query
    let currentQuery = db
      .select({
        grossSales: sum(orders.totalAmount).mapWith(Number),
        netSales: sum(orders.netAmount).mapWith(Number),
        discounts: sum(orders.discountAmount).mapWith(Number),
        refunds: sum(orders.refundAmount).mapWith(Number),
        orderCount: count(orders.id).mapWith(Number),
      })
      .from(orders)
      .where(eq(orders.status, 'completed'));

    // Add filters
    const conditions = [eq(orders.status, 'completed')];
    
    if (dateRange) {
      conditions.push(gte(orders.createdAt, dateRange.from));
      conditions.push(lte(orders.createdAt, dateRange.to));
    }

    if (locationIds && locationIds.length > 0) {
      conditions.push(inArray(orders.locationId, locationIds));
    }

    if (conditions.length > 1) {
      currentQuery = currentQuery.where(and(...conditions));
    }

    const currentData = await currentQuery;
    const current = currentData[0] || {
      grossSales: 0,
      netSales: 0,
      discounts: 0,
      refunds: 0,
      orderCount: 0,
    };

    // Calculate AOV
    const aov = current.orderCount > 0 ? current.netSales / current.orderCount : 0;

    // For comparison period (previous period of same length)
    let previousQuery = currentQuery;
    if (dateRange) {
      const periodLength = dateRange.to.getTime() - dateRange.from.getTime();
      const previousFrom = new Date(dateRange.from.getTime() - periodLength);
      const previousTo = new Date(dateRange.to.getTime() - periodLength);

      const previousConditions = [eq(orders.status, 'completed')];
      previousConditions.push(gte(orders.createdAt, previousFrom));
      previousConditions.push(lte(orders.createdAt, previousTo));

      if (locationIds && locationIds.length > 0) {
        previousConditions.push(inArray(orders.locationId, locationIds));
      }

      previousQuery = db
        .select({
          grossSales: sum(orders.totalAmount).mapWith(Number),
          netSales: sum(orders.netAmount).mapWith(Number),
          discounts: sum(orders.discountAmount).mapWith(Number),
          refunds: sum(orders.refundAmount).mapWith(Number),
          orderCount: count(orders.id).mapWith(Number),
        })
        .from(orders)
        .where(and(...previousConditions));
    }

    const previousData = await previousQuery;
    const previous = previousData[0] || {
      grossSales: 0,
      netSales: 0,
      discounts: 0,
      refunds: 0,
      orderCount: 0,
    };

    const previousAov = previous.orderCount > 0 ? previous.netSales / previous.orderCount : 0;

    // Calculate percentage changes
    const calculateChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    return {
      grossSales: current.grossSales || 0,
      netSales: current.netSales || 0,
      discounts: current.discounts || 0,
      refunds: current.refunds || 0,
      aov,
      grossSalesChange: calculateChange(current.grossSales || 0, previous.grossSales || 0),
      netSalesChange: calculateChange(current.netSales || 0, previous.netSales || 0),
      discountsChange: calculateChange(current.discounts || 0, previous.discounts || 0),
      refundsChange: calculateChange(current.refunds || 0, previous.refunds || 0),
      aovChange: calculateChange(aov, previousAov),
    };
  }

  async getSalesChartData(dateRange?: { from: Date; to: Date }, locationIds?: string[]): Promise<SalesChartData[]> {
    let query = db
      .select({
        date: sql<string>`DATE(${orders.createdAt})`,
        netSales: sum(orders.netAmount).mapWith(Number),
      })
      .from(orders)
      .where(eq(orders.status, 'completed'))
      .groupBy(sql`DATE(${orders.createdAt})`)
      .orderBy(sql`DATE(${orders.createdAt})`);

    // Add filters
    const conditions = [eq(orders.status, 'completed')];
    
    if (dateRange) {
      conditions.push(gte(orders.createdAt, dateRange.from));
      conditions.push(lte(orders.createdAt, dateRange.to));
    }

    if (locationIds && locationIds.length > 0) {
      conditions.push(inArray(orders.locationId, locationIds));
    }

    if (conditions.length > 1) {
      query = query.where(and(...conditions));
    }

    return await query;
  }

  async executeReadOnlySQL(sqlQuery: string): Promise<any[]> {
    try {
      // Additional safety check
      const upperSQL = sqlQuery.toUpperCase().trim();
      if (!upperSQL.startsWith('SELECT')) {
        throw new Error('Only SELECT statements are allowed');
      }

      // Execute the query using raw SQL
      const result = await db.execute(sql.raw(sqlQuery));
      return result.rows || [];
    } catch (error) {
      console.error('SQL execution error:', error);
      throw new Error(`Query execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Always use database-backed storage
export const storage: IStorage = new DatabaseStorage();
