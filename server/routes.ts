import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generateSQL, generateInsightFromData } from "./services/openai";
import { setRLSClaims } from "./services/supabase";
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
      try { await setRLSClaims(req.user.orgId, 'authenticated'); } catch (_) {}
    }
    
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

// Temporary storage for magic link tokens
const magicLinkTokens = new Map<string, { email: string; expires: number }>();

export async function registerRoutes(app: Express): Promise<Server> {
  
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

      // Generate JWT
      const accessToken = jwt.sign(
        { userId: user.id, email: user.email, org_id: user.id.split('-')[0] || 'org-demo' },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

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

      // Generate JWT
      const accessToken = jwt.sign(
        { userId: user.id, email: user.email, org_id: user.id.split('-')[0] || 'org-demo' },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

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

  // Dashboard routes
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
        1. orders: id, location_id, order_number, channel, order_type, subtotal, discount_amount, tax_amount, total_amount, refund_amount, net_amount, customer_name, customer_email, status, created_at, completed_at
        2. order_items: id, order_id, product_id, quantity, unit_price, total_price, discount_amount, net_price
        3. products: id, name, category, price, cost, active, created_at
        4. locations: id, name, address, city, state, country, timezone, created_at
        
        Key relationships:
        - orders.location_id -> locations.id
        - order_items.order_id -> orders.id
        - order_items.product_id -> products.id
        
        Important notes:
        - Use net_amount for revenue calculations (excludes refunds)
        - Filter by orders.status = 'completed' for sales data
        - Use created_at for date filtering
        - All monetary values are in AUD
      `;

      // Generate SQL using OpenAI
      const sqlResult = await generateSQL({
        query: aiRequest.query,
        schema: schemaDescription,
        dateRange: aiRequest.dateRange,
        locationIds: aiRequest.locationIds,
        channel: aiRequest.channel,
        orderType: aiRequest.orderType,
      });

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

      const response: AIQueryResponse = {
        answer: insight,
        sql: sqlResult.sql,
        data: queryData,
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
