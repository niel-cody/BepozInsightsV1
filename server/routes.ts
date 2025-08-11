import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generateSQL, generateInsightFromData, runAgentQuery } from "./services/openai";
import { setRLSClaims } from "./services/supabase";
import { db } from "./services/supabase";
import { sql } from "drizzle-orm";
import { aiResponseCache } from "./services/cache";
import { z } from "zod";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { insertUserSchema, type AIQueryRequest, type AIQueryResponse } from "@shared/schema";

const JWT_SECRET = process.env.JWT_SECRET || "bepoz-ai-secret-key";

// Authentication middleware
interface AuthenticatedRequest extends Express.Request {
  user?: {
    id: string;
    email: string;
    role: string;
    orgId?: string;
    locationAccess: string[];
  };
}

const authenticateToken = async (req: AuthenticatedRequest, res: Express.Response, next: Express.NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = await storage.getUser(decoded.userId);
    
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Invalid or inactive user' });
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      orgId: (decoded as any).org_id,
      locationAccess: user.locationAccess || [],
    };
    // Best-effort: attach org_id to DB session for RLS
    if (req.user.orgId) {
      try { await setRLSClaims(req.user.orgId, 'authenticated', req.user.email || req.user.id); } catch (_) {}
    }
    
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

// Temporary storage for magic link tokens
const magicLinkTokens = new Map<string, { email: string; expires: number }>();

export async function registerRoutes(app: Express): Promise<Server> {
  // Simple in-memory rate limiter (per user + route key)
  const rateBuckets = new Map<string, { count: number; resetAt: number }>();
  const checkRateLimit = (key: string, limit = 5, windowMs = 60_000): boolean => {
    const now = Date.now();
    const bucket = rateBuckets.get(key);
    if (!bucket || now > bucket.resetAt) {
      rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
      return true;
    }
    if (bucket.count < limit) {
      bucket.count += 1;
      return true;
    }
    return false;
  };
  // Helper: get default org for a user (is_default true else first active)
  const getDefaultOrgIdForUser = async (userId: string): Promise<string | undefined> => {
    try {
      const result: any = await db.execute(sql`
        select uo.organization_id
        from public.user_organizations uo
        join public.organizations o on o.id = uo.organization_id
        where uo.user_id = ${userId} and o.is_active = true
        order by uo.is_default desc, o.name asc
        limit 1
      `);
      const row = Array.isArray(result) ? result[0] : (result as any).rows?.[0];
      return row?.organization_id ?? undefined;
    } catch (_) {
      return undefined;
    }
  };

  // Ensure demo user is mapped to all active orgs
  const ensureDemoMemberships = async (userId: string, email: string) => {
    if (email !== 'demo@bepoz.com') return;
    try {
      await db.execute(sql`
        insert into public.user_organizations (user_id, organization_id, role, is_default)
        select ${userId}::text, o.id, 'manager', false
        from public.organizations o
        where o.is_active = true
          and not exists (
            select 1 from public.user_organizations uo
            where uo.user_id = ${userId}::text and uo.organization_id = o.id
          );
      `);
    } catch (e) {
      console.error('Ensure demo memberships failed:', e);
    }
  };
  
  // Auth routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email } = z.object({ email: z.string().email() }).parse(req.body);
      
      // Check if user exists, create if not (for demo purposes)
      let user = await storage.getUserByEmail(email);
      
      if (!user) {
        // Create new user for this demo
        user = await storage.createUser({
          email,
          name: email.split('@')[0],
          role: 'manager',
          locationAccess: ["loc-1", "loc-2", "loc-3"], // Give access to all locations for demo
        });
      }

      // Update last login
      await storage.updateUserLastLogin(user.id);

      // If demo user, map to all orgs
      await ensureDemoMemberships(user.id, email);

      // Determine default org
      const defaultOrgId = await getDefaultOrgIdForUser(user.id);
      // Generate JWT
      const payload: any = { userId: user.id, email: user.email };
      if (defaultOrgId) payload.org_id = defaultOrgId;
      const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

      res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          locationAccess: user.locationAccess || [],
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
      
      // Check if user exists
      let user = await storage.getUserByEmail(email);
      
      if (!user) {
        // Create new user for this demo
        user = await storage.createUser({
          email,
          name: email.split('@')[0],
          role: 'manager',
          locationAccess: [], // Will be set based on business logic
        });
      }

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

      const user = await storage.getUserByEmail(tokenData.email);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Update last login
      await storage.updateUserLastLogin(user.id);

      // If demo user, map to all orgs
      await ensureDemoMemberships(user.id, user.email);

      // Determine default org
      const defaultOrgId = await getDefaultOrgIdForUser(user.id);
      // Generate JWT
      const payload: any = { userId: user.id, email: user.email };
      if (defaultOrgId) payload.org_id = defaultOrgId;
      const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

      // Clean up used token
      magicLinkTokens.delete(token);

      res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          locationAccess: user.locationAccess || [],
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

  // Organization selection: validate membership and issue new token with org_id
  app.post("/api/orgs/select", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const rlKey = `${req.user!.id}:orgs.select`;
      if (!checkRateLimit(rlKey, 5, 60_000)) {
        return res.status(429).json({ message: 'Too many org switch attempts, please try again shortly' });
      }
      const { organizationId } = z.object({ organizationId: z.string().uuid() }).parse(req.body);

      // Validate membership
      const membership: any = await db.execute(sql`
        select 1 from public.user_organizations
        where user_id = ${req.user!.id} and organization_id = ${organizationId}::uuid
        limit 1
      `);
      const isMember = Array.isArray(membership) ? membership.length > 0 : (membership as any).rows?.length > 0;
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
      const result: any = await db.execute(sql`
        select o.id, o.name, o.slug, uo.role, uo.is_default
        from public.user_organizations uo
        join public.organizations o on o.id = uo.organization_id
        where uo.user_id = ${req.user!.id} and o.is_active = true
        order by uo.is_default desc, o.name asc
      `);
      const rows = Array.isArray(result) ? result : (result as any).rows;
      console.log('[ORG][list]', { userId: req.user?.id, count: rows?.length || 0, latencyMs: Date.now() - startedAt });
      res.json(rows || []);
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
