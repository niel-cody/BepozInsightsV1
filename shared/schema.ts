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

// Till summaries (normalized mapping)
export const tillSummaries = pgTable("till_summaries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: text("org_id"),
  venueName: text("venue_name"),
  timeSpan: text("time_span"),
  qtyTransactions: integer("qty_transactions"),
  grossSales: decimal("gross_sales", { precision: 14, scale: 2 }),
  totalDiscount: decimal("total_discount", { precision: 14, scale: 2 }),
  netSales: decimal("net_sales", { precision: 14, scale: 2 }),
  netSalesExTax: decimal("net_sales_ex_tax", { precision: 14, scale: 2 }),
  paymentTotal: decimal("payment_total", { precision: 14, scale: 2 }),
  costOfSales: decimal("cost_of_sales", { precision: 14, scale: 2 }),
  profitAmount: decimal("profit_amount", { precision: 14, scale: 2 }),
  profitPercent: decimal("profit_percent", { precision: 5, scale: 2 }),
  firstTxnAt: timestamp("first_txn_at", { withTimezone: true }),
  lastTxnAt: timestamp("last_txn_at", { withTimezone: true }),
  lastOperator: text("last_operator"),
  averageSale: decimal("average_sale", { precision: 14, scale: 2 }),
  qtyCancelled: integer("qty_cancelled"),
  cancelledTotal: decimal("cancelled_total", { precision: 14, scale: 2 }),
  qtyReturns: integer("qty_returns"),
  returnsTotal: decimal("returns_total", { precision: 14, scale: 2 }),
  qtyTraining: integer("qty_training"),
  trainingTotal: decimal("training_total", { precision: 14, scale: 2 }),
  qtyNoSales: integer("qty_no_sales"),
  qtyNoSaleAfterCancel: integer("qty_no_sale_after_cancel"),
  noSaleAfterCancelTotal: decimal("no_sale_after_cancel_total", { precision: 14, scale: 2 }),
  qtyTableRefundAfterPrint: integer("qty_table_refund_after_print"),
  tableRefundAfterPrintTotal: decimal("table_refund_after_print_total", { precision: 14, scale: 2 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
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

export type TillSummary = typeof tillSummaries.$inferSelect;

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
