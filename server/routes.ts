import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generateSQL, generateInsightFromData } from "./services/openai";
import { setRLSClaims } from "./services/supabase";
import { db } from "./services/supabase";
import { sql } from "drizzle-orm";
import { aiResponseCache } from "./services/cache";
import { z } from "zod";
import { type AIQueryRequest, type AIQueryResponse } from "@shared/schema";

// Simple request interface for demo mode
interface DemoRequest extends Express.Request {
  selectedOrgId?: string;
}

export async function registerRoutes(app: Express): Promise<Server> {
  const DB_TIMEOUT_MS = 2000;

  async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => setTimeout(() => reject(new Error('DB timeout')), ms)) as Promise<T>,
    ]);
  }

  // Middleware to set org context from session storage
  const setOrgContext = async (req: DemoRequest, res: Express.Response, next: Express.NextFunction) => {
    const orgId = req.headers['x-org-id'] as string;
    if (orgId) {
      req.selectedOrgId = orgId;
      // Set RLS claims for database queries
      try { 
        await setRLSClaims(orgId, 'authenticated'); 
      } catch (_) {}
    }
    next();
  };

  // Demo routes - no authentication required
  
  // Get available organizations for selection
  app.get("/api/orgs", async (req, res) => {
    try {
      const result: any = await withTimeout(db.execute(sql`
        select id, name, slug
        from public.organizations 
        where is_active = true
        order by name asc
      `), DB_TIMEOUT_MS);
      const rows = Array.isArray(result) ? result : (result as any).rows;
      console.log('[ORG][list]', { count: rows?.length || 0 });
      res.json(rows || []);
    } catch (error) {
      console.error('Failed to fetch organizations:', error);
      res.status(500).json({ message: 'Failed to fetch organizations' });
    }
  });

  // Set the selected organization (no auth needed in demo)
  app.post("/api/orgs/select", async (req: DemoRequest, res) => {
    try {
      const { organizationId } = z.object({ organizationId: z.string() }).parse(req.body);
      
      // Set RLS claims for this organization
      await setRLSClaims(organizationId, 'authenticated');
      
      console.log('[ORG][select]', { organizationId });
      res.json({ success: true, organizationId });
    } catch (error) {
      console.error('Failed to select organization:', error);
      res.status(400).json({ message: error instanceof Error ? error.message : 'Invalid request' });
    }
  });

  // Diagnostics: helps confirm the running server sees database
  app.get('/api/diag', async (_req, res) => {
    const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);
    let orgCount: number | null = null;
    try {
      const result: any = await db.execute(sql`select count(*)::int as c from public.organizations`);
      const row = Array.isArray(result) ? result[0] : (result as any).rows?.[0];
      orgCount = row?.c ?? null;
    } catch (_) {
      orgCount = null;
    }
    res.json({ hasDatabaseUrl, orgCount });
  });

  // Dashboard routes (with org context middleware)
  app.get("/api/locations", setOrgContext, async (req: DemoRequest, res) => {
    try {
      const locations = await storage.getLocations();
      res.json(locations);
    } catch (error) {
      console.error('Get locations error:', error);
      res.status(500).json({ message: 'Failed to fetch locations' });
    }
  });

  app.get("/api/dashboard/kpi", setOrgContext, async (req: DemoRequest, res) => {
    try {
      const { dateRange, locationIds } = req.query;
      
      let parsedDateRange;
      if (dateRange && typeof dateRange === 'string') {
        const days = parseInt(dateRange.replace('d', ''));
        if (!isNaN(days)) {
          const to = new Date();
          const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
          parsedDateRange = { from, to };
        }
      }

      let parsedLocationIds;
      if (locationIds && typeof locationIds === 'string' && locationIds !== 'all') {
        parsedLocationIds = locationIds.split(',');
      }

      const kpiData = await storage.getKPIData(parsedDateRange, parsedLocationIds);
      res.json(kpiData);
    } catch (error) {
      console.error('Get KPI data error:', error);
      res.status(500).json({ message: 'Failed to fetch KPI data' });
    }
  });

  app.get("/api/dashboard/sales-chart", setOrgContext, async (req: DemoRequest, res) => {
    try {
      const { period } = req.query;
      
      let dateRange;
      if (period && typeof period === 'string') {
        const days = parseInt(period.replace('D', ''));
        if (!isNaN(days)) {
          const to = new Date();
          const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
          dateRange = { from, to };
        }
      }

      const chartData = await storage.getSalesChartData(dateRange);
      res.json(chartData);
    } catch (error) {
      console.error('Get sales chart error:', error);
      res.status(500).json({ message: 'Failed to fetch sales chart data' });
    }
  });

  app.get("/api/dashboard/top-products", setOrgContext, async (req: DemoRequest, res) => {
    try {
      const topProducts = await storage.getTopProducts();
      res.json(topProducts);
    } catch (error) {
      console.error('Get top products error:', error);
      res.status(500).json({ message: 'Failed to fetch top products data' });
    }
  });

  // AI Query route
  app.post("/api/ai/query", setOrgContext, async (req: DemoRequest, res) => {
    try {
      const startedAt = Date.now();
      
      const aiRequest = req.body as AIQueryRequest;
      
      if (!aiRequest.query || !aiRequest.query.trim()) {
        return res.status(400).json({ 
          error: 'Query is required',
          answer: '',
          sql: ''
        } as AIQueryResponse);
      }

      // Generate schema description for OpenAI
      const schemaDescription = `
Tables:
1. till_summaries: id, org_id, venue_name, time_span, first_txn_at, last_txn_at, qty_transactions, average_sale, gross_sales, total_discount, net_sales, net_sales_ex_tax, payment_total, cost_of_sales, profit_amount, profit_percent, qty_cancelled, cancelled_total, qty_returns, returns_total, qty_training, training_total, qty_no_sales, qty_no_sale_after_cancel, no_sale_after_cancel_total, qty_table_refund_after_print, table_refund_after_print_total, created_at, updated_at
   - Uniqueness: (org_id, time_span, venue_name)
2. orders: id, location_id, order_number, channel, order_type, subtotal, discount_amount, tax_amount, total_amount, refund_amount, net_amount, customer_name, customer_email, status, created_at, completed_at
3. order_items: id, order_id, product_id, quantity, unit_price, total_price, discount_amount, net_price
4. products: id, name, category, price, cost, active, created_at
5. locations: id, name, address, city, state, country, timezone, created_at

Key relationships:
- orders.location_id -> locations.id
- order_items.order_id -> orders.id
- order_items.product_id -> products.id

Important notes:
- For high-level daily KPIs, prefer till_summaries
- Use orders.net_amount for revenue when querying raw orders (excludes refunds)
- Filter by orders.status = 'completed' for sales data
- Use created_at for date filtering on orders; use time_span for daily rollups
- All monetary values are in AUD
`;

      // Try cache first
      const cacheKey = JSON.stringify({
        orgId: req.selectedOrgId,
        q: aiRequest.query?.trim(),
        dateRange: aiRequest.dateRange,
        locationIds: aiRequest.locationIds,
        channel: aiRequest.channel,
        orderType: aiRequest.orderType,
      });
      const cached = aiResponseCache.get(cacheKey);
      if (cached) {
        const latency = Date.now() - startedAt;
        console.log('[AI][cache-hit]', { orgId: req.selectedOrgId, latencyMs: latency, qlen: aiRequest.query.length });
        return res.json(cached as AIQueryResponse);
      }

      // Generate SQL using OpenAI
      const sqlQuery = await generateSQL(aiRequest.query, schemaDescription, aiRequest);
      
      if (!sqlQuery || !sqlQuery.trim()) {
        return res.status(400).json({
          error: 'Could not generate valid SQL query',
          answer: 'I was unable to generate a valid SQL query for your request. Please try rephrasing your question.',
          sql: ''
        } as AIQueryResponse);
      }

      // Execute the SQL query
      let queryResults: any[] = [];
      try {
        queryResults = await storage.executeReadOnlySQL(sqlQuery);
      } catch (error) {
        console.error('[AI][SQL-error]', { sqlQuery, error });
        return res.status(400).json({
          error: 'SQL execution failed',
          answer: 'There was an error executing your query. Please try a different question.',
          sql: sqlQuery
        } as AIQueryResponse);
      }

      // Generate insights from the data
      const insights = await generateInsightFromData(aiRequest.query, queryResults, sqlQuery);

      const response: AIQueryResponse = {
        answer: insights.answer,
        sql: sqlQuery,
        data: queryResults,
        ...(insights.chartData && { chartData: insights.chartData }),
        ...(insights.kpis && { kpis: insights.kpis }),
        ...(insights.drivers && { drivers: insights.drivers })
      };

      // Cache the response
      aiResponseCache.set(cacheKey, response);

      const latency = Date.now() - startedAt;
      console.log('[AI][complete]', { 
        orgId: req.selectedOrgId, 
        latencyMs: latency, 
        qlen: aiRequest.query.length,
        resultCount: queryResults.length
      });

      res.json(response);
    } catch (error) {
      console.error('AI query error:', error);
      res.status(500).json({
        error: 'Internal server error',
        answer: 'An unexpected error occurred while processing your request.',
        sql: ''
      } as AIQueryResponse);
    }
  });

  return createServer(app);
}