import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const locations = pgTable("locations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  country: text("country").default("Australia"),
  timezone: text("timezone").default("Australia/Sydney"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  category: text("category"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  cost: decimal("cost", { precision: 10, scale: 2 }),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  locationId: varchar("location_id").references(() => locations.id).notNull(),
  orderNumber: text("order_number").notNull(),
  channel: text("channel").notNull(), // "dine_in", "takeaway", "delivery"
  orderType: text("order_type").notNull(), // "food", "beverage", "retail"
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }).default("0"),
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }).notNull(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  refundAmount: decimal("refund_amount", { precision: 10, scale: 2 }).default("0"),
  netAmount: decimal("net_amount", { precision: 10, scale: 2 }).notNull(),
  customerName: text("customer_name"),
  customerEmail: text("customer_email"),
  status: text("status").notNull().default("completed"), // "pending", "completed", "refunded", "cancelled"
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const orderItems = pgTable("order_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").references(() => orders.id).notNull(),
  productId: varchar("product_id").references(() => products.id).notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }).default("0"),
  netPrice: decimal("net_price", { precision: 10, scale: 2 }).notNull(),
});

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  name: text("name"),
  role: text("role").notNull().default("manager"), // "admin", "manager", "staff"
  locationAccess: text("location_access").array(), // array of location IDs user can access
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  lastLoginAt: timestamp("last_login_at"),
});

// Insert schemas
export const insertLocationSchema = createInsertSchema(locations).omit({
  id: true,
  createdAt: true,
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export const insertOrderItemSchema = createInsertSchema(orderItems).omit({
  id: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  lastLoginAt: true,
});

// Types
export type Location = typeof locations.$inferSelect;
export type InsertLocation = z.infer<typeof insertLocationSchema>;

export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;

export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;

export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

// API response types
export type KPIData = {
  grossSales: number;
  netSales: number;
  discounts: number;
  refunds: number;
  aov: number;
  grossSalesChange: number;
  netSalesChange: number;
  discountsChange: number;
  refundsChange: number;
  aovChange: number;
};

export type SalesChartData = {
  date: string;
  netSales: number;
};

export type TopProduct = {
  id: string;
  name: string;
  category: string;
  quantity: number;
  revenue: number;
};

export type AIQueryRequest = {
  query: string;
  dateRange?: {
    from: string;
    to: string;
  };
  locationIds?: string[];
  channel?: string;
  orderType?: string;
};

export type AIQueryResponse = {
  answer: string;
  sql: string;
  data?: any[];
  chartData?: {
    type: 'line' | 'bar' | 'pie';
    data: any[];
    labels: string[];
  };
  error?: string;
};
