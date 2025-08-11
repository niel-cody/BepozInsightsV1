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
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email } = z.object({ email: z.string().email() }).parse(req.body);
      
      // App trusts email-based identity and org membership via user_organizations
      const userId = email; // use email as stable user identifier
      // Determine default org
      const defaultOrgId = await getDefaultOrgIdForUser(userId);
      // Generate JWT
      const payload: any = { userId, email };
      if (defaultOrgId) payload.org_id = defaultOrgId;
      const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

      res.json({
        user: {
          id: userId,
          email,
          name: email.split('@')[0],
          role: 'manager',
          locationAccess: [],
          // Include orgId when available so the client can skip org selection
          ...(defaultOrgId ? { orgId: defaultOrgId } : {}),
        },
        accessToken,
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : 'Login failed' 
      });
    }
  });

  app.post("/api/auth/magic-link", async (req, res) => {
    try {
      const { email } = z.object({ email: z.string().email() }).parse(req.body);
      
      const userId = email;

      // Generate magic link token
      const token = crypto.randomBytes(32).toString('hex');
      const expires = Date.now() + 15 * 60 * 1000; // 15 minutes
      
      magicLinkTokens.set(token, { email, expires });

      // In a real app, you would send this via email
      console.log(`Magic link for ${email}: ${req.protocol}://${req.get('host')}/auth/verify?token=${token}`);
      
      res.json({ 
        success: true, 
        message: 'Magic link sent to your email',
        // For demo purposes, include the token
        ...(process.env.NODE_ENV === 'development' && { token })
      });
    } catch (error) {
      console.error('Magic link error:', error);
      res.status(400).json({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Invalid request' 
      });
    }
  });

  app.post("/api/auth/verify", async (req, res) => {
    try {
      const { token } = z.object({ token: z.string() }).parse(req.body);
      
      const tokenData = magicLinkTokens.get(token);
      if (!tokenData || tokenData.expires < Date.now()) {
        return res.status(400).json({ message: 'Invalid or expired token' });
      }

      const userId = tokenData.email;

      // Determine default org
      const defaultOrgId = await getDefaultOrgIdForUser(userId);
      // Generate JWT
      const payload: any = { userId, email: tokenData.email };
      if (defaultOrgId) payload.org_id = defaultOrgId;
      const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

      // Clean up used token
      magicLinkTokens.delete(token);

      res.json({
        user: {
          id: userId,
          email: tokenData.email,
          name: tokenData.email.split('@')[0],
          role: 'manager',
          locationAccess: [],
          ...(defaultOrgId ? { orgId: defaultOrgId } : {}),
        },
        accessToken,
      });
    } catch (error) {
      console.error('Token verification error:', error);
      res.status(400).json({ message: 'Invalid request' });
    }
  });

  app.get("/api/auth/me", authenticateToken, async (req: AuthenticatedRequest, res) => {
    res.json(req.user);
  });

  app.post("/api/auth/signout", authenticateToken, async (req, res) => {
    // In a real app, you might invalidate the token in a blacklist
    res.json({ message: 'Signed out successfully' });
  });

  // Diagnostics: helps confirm the running server sees Supabase
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

  // Organization selection: validate membership and issue new token with org_id
  app.post("/api/orgs/select", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const rlKey = `${req.user!.id}:orgs.select`;
      if (!checkRateLimit(rlKey, 5, 60_000)) {
        return res.status(429).json({ message: 'Too many org switch attempts, please try again shortly' });
      }
      const { organizationId } = z.object({ organizationId: z.string() }).parse(req.body);
      // Validate membership
      const membership: any = await withTimeout(db.execute(sql`
        select 1 from public.user_organizations
        where (user_id = ${req.user!.id} or user_id = ${req.user!.email}) and organization_id = ${organizationId}::uuid
        limit 1
      `), DB_TIMEOUT_MS);
      let isMember = Array.isArray(membership) ? membership.length > 0 : (membership as any).rows?.length > 0;
      if (!isMember) {
        return res.status(403).json({ message: 'Not a member of this organization' });
      }

      // Update is_default flags
      await db.execute(sql`
        update public.user_organizations set is_default = false where user_id = ${req.user!.id};
        update public.user_organizations set is_default = true where user_id = ${req.user!.id} and organization_id = ${organizationId}::uuid;
      `);

      // Issue new JWT with org_id
      const newToken = jwt.sign({ userId: req.user!.id, email: req.user!.email, org_id: organizationId }, JWT_SECRET, { expiresIn: '7d' });

      // Attach RLS claims immediately for this request
      await setRLSClaims(organizationId, 'authenticated', req.user!.id);

      console.log('[ORG][select]', { userId: req.user!.id, organizationId });
      res.json({ accessToken: newToken, organizationId });
    } catch (error) {
      return res.status(400).json({ message: error instanceof Error ? error.message : 'Invalid request' });
    }
  });

  // Dashboard routes
  app.get("/api/orgs", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const startedAt = Date.now();
      const result: any = await withTimeout(db.execute(sql`
        select o.id, o.name, o.slug, uo.role, uo.is_default
        from public.user_organizations uo
        join public.organizations o on o.id = uo.organization_id
        where (uo.user_id = ${req.user!.id} or uo.user_id = ${req.user!.email}) and o.is_active = true
        order by uo.is_default desc, o.name asc
      `), DB_TIMEOUT_MS);
      const rows = Array.isArray(result) ? result : (result as any).rows;
      console.log('[ORG][list]', { userId: req.user?.id, count: rows?.length || 0, latencyMs: Date.now() - startedAt });
      res.json(rows);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch organizations' });
    }
  });
  app.get("/api/locations", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const locations = req.user?.role === 'admin' 
        ? await storage.getLocations()
        : await storage.getLocationsByUser(req.user!.id);
      
      res.json(locations);
    } catch (error) {
      console.error('Get locations error:', error);
      res.status(500).json({ message: 'Failed to fetch locations' });
    }
  });

  app.get("/api/dashboard/kpi", authenticateToken, async (req: AuthenticatedRequest, res) => {
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

  app.get("/api/dashboard/sales-chart", authenticateToken, async (req: AuthenticatedRequest, res) => {
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

  app.get("/api/dashboard/top-products", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const topProducts = await storage.getTopProducts();
      res.json(topProducts);
    } catch (error) {
      console.error('Get top products error:', error);
      res.status(500).json({ message: 'Failed to fetch top products data' });
    }
  });

  // AI Query route
  app.post("/api/ai/query", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const startedAt = Date.now();
      // Attach RLS claims for this request/session if available
      if (req.user?.orgId) {
        await setRLSClaims(req.user.orgId, 'authenticated');
      }
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
        orgId: req.user?.orgId,
        q: aiRequest.query?.trim(),
        dateRange: aiRequest.dateRange,
        locationIds: aiRequest.locationIds,
        channel: aiRequest.channel,
        orderType: aiRequest.orderType,
      });
      const cached = aiResponseCache.get(cacheKey);
      if (cached) {
        const latency = Date.now() - startedAt;
        console.log('[AI][cache-hit]', { userId: req.user?.id, orgId: req.user?.orgId, latencyMs: latency, qlen: aiRequest.query.length });
        return res.json(cached as AIQueryResponse);
      }

      // Generate SQL using Agents SDK (no feature flag in dev)
      const agentOut = await runAgentQuery({
        query: aiRequest.query,
        schema: schemaDescription,
        dateRange: aiRequest.dateRange,
        locationIds: aiRequest.locationIds,
        channel: aiRequest.channel,
        orderType: aiRequest.orderType,
      });
      const sqlResult = await generateSQL({
        query: aiRequest.query,
        schema: schemaDescription,
        dateRange: aiRequest.dateRange,
        locationIds: aiRequest.locationIds,
        channel: aiRequest.channel,
        orderType: aiRequest.orderType,
      });
      // Prefer agent SQL if present
      if (agentOut.sql && agentOut.sql.length > 0) {
        sqlResult.sql = agentOut.sql;
        sqlResult.isValid = true;
        sqlResult.explanation = agentOut.explanation;
      }

      if (!sqlResult.isValid || !sqlResult.sql) {
        return res.json({
          error: sqlResult.error || 'Failed to generate valid SQL',
          answer: 'Unable to process your query. Please try rephrasing your question.',
          sql: '',
        } as AIQueryResponse);
      }

      // Execute the SQL query
      let queryData: any[] = [];
      try {
        queryData = await storage.executeReadOnlySQL(sqlResult.sql);
      } catch (execError) {
        return res.json({
          error: `Query execution failed: ${execError instanceof Error ? execError.message : 'Unknown error'}`,
          answer: 'The generated query could not be executed. Please try a different question.',
          sql: sqlResult.sql,
        } as AIQueryResponse);
      }

      // Generate insight from the data
      const insight = await generateInsightFromData(
        aiRequest.query,
        queryData,
        sqlResult.sql
      );

      // Compute simple KPI callouts when columns available
      const firstRow = queryData?.[0] ?? {} as any;
      const kpi = {
        netSales: Number(firstRow.net_sales ?? firstRow.netamount ?? 0) || 0,
        grossSales: Number(firstRow.gross_sales ?? firstRow.totalamount ?? 0) || 0,
        transactions: Number(firstRow.qty_transactions ?? firstRow.order_count ?? 0) || 0,
        averageSale: Number(firstRow.average_sale ?? 0) || 0,
        profit: Number(firstRow.profit_amount ?? 0) || 0,
      };

      // Simple drivers: pick top 3 numeric columns that look like totals (excluding ids/counts) from aggregated results
      let drivers: { label: string; value: number }[] | undefined;
      if (queryData.length > 0) {
        const row = queryData[0] as Record<string, any>;
        const candidates = Object.entries(row)
          .filter(([k, v]) => typeof v === 'number' && !/id|count/i.test(k))
          .map(([k, v]) => ({ label: k, value: Number(v) }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 3);
        if (candidates.length > 0) drivers = candidates;
      }

      const response: AIQueryResponse = {
        answer: insight,
        sql: sqlResult.sql.replace(/([\w.+-]+)@([\w.-]+)\.(\w+)/g, '***@***.***'),
        data: queryData,
        kpis: kpi,
        drivers,
      };

      // Basic chart data generation based on query results
      if (queryData.length > 0) {
        const firstRow = queryData[0];
        const keys = Object.keys(firstRow);
        
        // Check if we have date and numeric data for a chart
        const dateKey = keys.find(k => k.toLowerCase().includes('date') || k.toLowerCase().includes('day'));
        const valueKeys = keys.filter(k => 
          typeof firstRow[k] === 'number' && 
          !k.toLowerCase().includes('id') &&
          !k.toLowerCase().includes('count') // Exclude count fields for revenue charts
        );

        if (dateKey && valueKeys.length > 0) {
          response.chartData = {
            type: 'line' as const,
            data: queryData.map(row => row[valueKeys[0]]),
            labels: queryData.map(row => row[dateKey]),
          };
        } else if (valueKeys.length > 0) {
          response.chartData = {
            type: 'bar' as const,
            data: queryData.slice(0, 10).map(row => row[valueKeys[0]]),
            labels: queryData.slice(0, 10).map((row, i) => 
              row.name || row.product_name || row.location_name || `Item ${i + 1}`
            ),
          };
        }
      }

      aiResponseCache.set(cacheKey, response, 15 * 60 * 1000);
      const latency = Date.now() - startedAt;
      console.log('[AI][answer]', {
        userId: req.user?.id,
        orgId: req.user?.orgId,
        latencyMs: latency,
        rows: Array.isArray(queryData) ? queryData.length : 0,
        sqlLen: response.sql?.length || 0,
      });
      res.json(response);
    } catch (error) {
      console.error('AI query error:', error);
      res.status(500).json({
        error: 'Internal server error while processing AI query',
        answer: 'Sorry, there was an error processing your request. Please try again.',
        sql: '',
      } as AIQueryResponse);
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
