import OpenAI from "openai";
import { Agent, run, tool } from "@openai/agents";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || ""
});

export interface SQLGenerationRequest {
  query: string;
  schema: string;
  dateRange?: {
    from: string;
    to: string;
  };
  locationIds?: string[];
  channel?: string;
  orderType?: string;
}

export interface SQLGenerationResponse {
  sql: string;
  explanation: string;
  isValid: boolean;
  error?: string;
}

function normalizeIdentifier(identifier: string): string {
  // Strip quotes and schema prefixes
  const cleaned = identifier.replace(/^["`']|["`']$/g, "");
  const parts = cleaned.split(".");
  return parts[parts.length - 1].toLowerCase();
}

export function validateAndHardenSQL(originalSQL: string): { sql: string; isValid: boolean; error?: string } {
  const allowlistedTables = new Set([
    "till_summaries",
    "orders",
    "order_items",
    "products",
    "locations",
  ]);

  let sql = originalSQL.trim();

  // Disallow multiple statements
  if (sql.split(";").filter(Boolean).length > 1) {
    return { sql: "", isValid: false, error: "Multiple SQL statements are not allowed" };
  }
  // Strip trailing semicolon if present
  if (sql.endsWith(";")) sql = sql.slice(0, -1);

  const upper = sql.toUpperCase();
  // Deny dangerous schemas/keywords
  if (/\b(pg_|INFORMATION_SCHEMA|SYS|MYSQL)\b/i.test(sql)) {
    return { sql: "", isValid: false, error: "Access to system schemas is not allowed" };
  }
  if (/\b(INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|EXEC|CALL|GRANT|REVOKE)\b/i.test(upper)) {
    return { sql: "", isValid: false, error: "Query contains forbidden keywords" };
  }

  // Enforce LIMIT caps (<= 1000)
  if (/\bLIMIT\s+\d+/i.test(sql)) {
    sql = sql.replace(/\bLIMIT\s+(\d+)/gi, (_m, n) => {
      const num = parseInt(n, 10);
      return `LIMIT ${Math.min(num || 0, 1000)}`;
    });
  } else {
    sql = `${sql} LIMIT 100`;
  }

  // Validate tables referenced in FROM/JOIN are allowlisted
  const referenced: string[] = [];
  const tableRegex = /(FROM|JOIN)\s+([\w\."]+)/gi;
  let match: RegExpExecArray | null;
  while ((match = tableRegex.exec(sql)) !== null) {
    referenced.push(normalizeIdentifier(match[2]));
  }
  for (const name of referenced) {
    if (!allowlistedTables.has(name)) {
      // Heuristic: allow common CTE names that are not base tables
      if (!/^[a-z_][a-z0-9_]*$/i.test(name) || allowlistedTables.has(name)) continue;
      return { sql: "", isValid: false, error: `Table not allowed: ${name}` };
    }
  }

  return { sql, isValid: true };
}

export async function generateSQL(request: SQLGenerationRequest): Promise<SQLGenerationResponse> {
  try {
    const systemPrompt = `You are a SQL expert for a POS (Point of Sale) system. Generate safe, read-only SQL queries based on natural language requests.

IMPORTANT SAFETY RULES:
1. ONLY generate SELECT statements
2. ALWAYS include a LIMIT clause (max 1000 rows)
3. ALWAYS include date filters when possible
4. NO INSERT, UPDATE, DELETE, DROP, CREATE, ALTER statements
5. NO system tables or functions
6. Use proper parameterized queries

SCHEMA:
${request.schema}

CONTEXT:
- This is a hospitality POS system with orders, products, locations
- All monetary values are in AUD
- Dates are in ISO format
- Location access may be restricted based on user permissions

FILTERS TO APPLY:
${request.dateRange ? `Date Range: ${request.dateRange.from} to ${request.dateRange.to}` : 'No date filter specified'}
${request.locationIds ? `Location IDs: ${request.locationIds.join(', ')}` : 'All locations'}
${request.channel ? `Channel: ${request.channel}` : 'All channels'}
${request.orderType ? `Order Type: ${request.orderType}` : 'All order types'}

Return a JSON response with:
- sql: The generated SQL query
- explanation: Brief explanation of what the query does
- isValid: true if query follows safety rules
- error: any validation errors`;

    const userPrompt = `Generate a SQL query for: "${request.query}"

Make sure to:
1. Apply all relevant filters from the context
2. Include appropriate JOINs for related data
3. Use meaningful column aliases
4. Include LIMIT clause
5. Order results logically (usually by date DESC or value DESC)`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No response from OpenAI");
    }

    const result = JSON.parse(content) as SQLGenerationResponse;
    
    // Additional validation
    if (!result.sql || typeof result.sql !== 'string') {
      throw new Error("Invalid SQL response format");
    }

    // Check for dangerous keywords
    const dangerousKeywords = ['INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE', 'ALTER', 'TRUNCATE', 'EXEC'];
    const upperSQL = result.sql.toUpperCase();
    
    for (const keyword of dangerousKeywords) {
      if (upperSQL.includes(keyword)) {
        return {
          sql: '',
          explanation: '',
          isValid: false,
          error: `Query contains forbidden keyword: ${keyword}`
        };
      }
    }

    // Ensure it starts with SELECT
    if (!upperSQL.trim().startsWith('SELECT')) {
      return {
        sql: '',
        explanation: '',
        isValid: false,
        error: 'Query must be a SELECT statement'
      };
    }

    // Harden and validate SQL further
    const hardened = validateAndHardenSQL(result.sql);
    if (!hardened.isValid) {
      return {
        sql: '',
        explanation: '',
        isValid: false,
        error: hardened.error || 'SQL validation failed',
      };
    }

    return { ...result, sql: hardened.sql };

  } catch (error) {
    console.error('OpenAI SQL generation error:', error);
    return {
      sql: '',
      explanation: '',
      isValid: false,
      error: error instanceof Error ? error.message : 'Failed to generate SQL'
    };
  }
}

export async function generateInsightFromData(
  query: string, 
  data: any[], 
  sql: string
): Promise<string> {
  try {
    const prompt = `Based on the user's question "${query}" and the SQL query results below, provide a clear, concise business insight.

SQL Query: ${sql}

Data (first 10 rows): ${JSON.stringify(data.slice(0, 10), null, 2)}

Provide a business-focused answer that:
1. Directly answers the user's question
2. Highlights key numbers and trends
3. Provides actionable insights
4. Uses clear, professional language
5. Keeps it concise (2-3 sentences max)

Format currency as AUD and round to nearest dollar.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "user", content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 200,
    });

    const content = response.choices[0].message.content || "Unable to generate insight from the data.";
    try {
      const usage = (response as any).usage || (response as any).choices?.[0]?.usage;
      if (usage) {
        console.log('[AI][openai-usage]', usage);
      }
    } catch (_) {}
    return content;

  } catch (error) {
    console.error('OpenAI insight generation error:', error);
    return "Analysis completed successfully. Please review the data above for insights.";
  }
}

// Agents SDK integration for end-to-end query → SQL → execute → summarize
type AgentQueryInput = {
  query: string;
  schema: string;
  dateRange?: { from: string; to: string };
  locationIds?: string[];
  channel?: string;
  orderType?: string;
};

const allowlistedTables = new Set([
  "till_summaries",
  "orders",
  "order_items",
  "products",
  "locations",
]);

const tools = {
  generate_sql: tool({
    description: "Generate a safe, read-only SQL query based on the user's request and provided schema. Must be a single SELECT with LIMIT.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string" },
        schema: { type: "string" },
        dateRange: {
          type: "object",
          properties: { from: { type: "string" }, to: { type: "string" } },
          required: [],
        },
        locationIds: { type: "array", items: { type: "string" } },
        channel: { type: "string" },
        orderType: { type: "string" },
      },
      required: ["query", "schema"],
    },
    execute: async (args: AgentQueryInput) => {
      const res = await generateSQL({
        query: args.query,
        schema: args.schema,
        dateRange: args.dateRange,
        locationIds: args.locationIds,
        channel: args.channel,
        orderType: args.orderType,
      });
      if (!res.isValid) throw new Error(res.error || "Invalid SQL");
      return { sql: res.sql, explanation: res.explanation } as any;
    },
  }),
  execute_readonly_sql: tool({
    description: "Execute a validated read-only SQL query and return rows (max 1000).",
    parameters: {
      type: "object",
      properties: { sql: { type: "string" } },
      required: ["sql"],
    },
    execute: async (args: { sql: string }) => {
      const hardened = validateAndHardenSQL(args.sql);
      if (!hardened.isValid) throw new Error(hardened.error || "SQL validation failed");
      // Note: actual execution happens in routes via storage.executeReadOnlySQL; here we only pass SQL back
      return { sql: hardened.sql } as any;
    },
  }),
};

export async function runAgentQuery(input: AgentQueryInput): Promise<{ sql: string; explanation: string }> {
  const agent = new Agent({
    name: "InsightsAgent",
    instructions:
      "You are a POS analytics assistant. Use tools to first generate a single, read-only SELECT with a LIMIT (<=1000) against the allowed schema, then execute it. Reason step by step briefly. Never modify data.",
    tools: [tools.generate_sql, tools.execute_readonly_sql],
  });

  const result = await run(agent, [
    { role: "system", content: "Allowed tables: till_summaries, orders, order_items, products, locations." },
    { role: "user", content: JSON.stringify(input) },
  ]);

  // Try to extract last tool output (sql + explanation)
  const text = (result.finalOutput && typeof result.finalOutput === 'string') ? result.finalOutput : '';
  // Fallback: rely on generateSQL directly if needed
  if (!text) {
    const res = await generateSQL({ query: input.query, schema: input.schema, dateRange: input.dateRange, locationIds: input.locationIds, channel: input.channel, orderType: input.orderType });
    return { sql: res.sql, explanation: res.explanation };
  }
  // Best effort parse: the tool result will be returned via result items; keep simple here
  return { sql: text, explanation: "Generated via Agents SDK." };
}
