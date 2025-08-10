import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Bot, Send, MessageCircle, Copy, BarChart3, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { AIQueryRequest, AIQueryResponse } from "@shared/schema";

export function AIQueryPanel() {
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState<AIQueryResponse | null>(null);
  const { toast } = useToast();

  const aiQueryMutation = useMutation({
    mutationFn: async (queryData: AIQueryRequest): Promise<AIQueryResponse> => {
      const res = await apiRequest("POST", "/api/ai/query", queryData);
      return res.json();
    },
    onSuccess: (data) => {
      setResponse(data);
      if (data.error) {
        toast({
          title: "Query Error",
          description: data.error,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Query Complete",
          description: "AI analysis generated successfully",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process AI query",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    aiQueryMutation.mutate({
      query: query.trim(),
      // TODO: Add filters from context when implemented
    });
  };

  const handleQuickQuestion = (question: string) => {
    setQuery(question);
    aiQueryMutation.mutate({ query: question });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Copied",
        description: "SQL query copied to clipboard",
      });
    });
  };

  const quickQuestions = [
    "What were the top-selling items this week?",
    "Show me sales by location for yesterday",
    "What are our peak hours today?",
    "Which products have declining sales trends?",
  ];

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="bg-primary rounded-lg p-2">
              <Bot className="text-white text-lg" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900" data-testid="text-ai-panel-title">AI Insights</h3>
              <p className="text-sm text-slate-500">Ask questions about your sales data in natural language</p>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          {/* Query Input */}
          <form onSubmit={handleSubmit} className="flex gap-3 mb-6">
            <div className="flex-1">
              <Textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask me anything about your sales data... (e.g., 'What were the top-selling items last weekend at Bondi?')"
                rows={2}
                className="resize-none"
                disabled={aiQueryMutation.isPending}
                data-testid="textarea-ai-query"
              />
            </div>
            <Button
              type="submit"
              disabled={aiQueryMutation.isPending || !query.trim()}
              className="px-6 py-3 flex items-center gap-2"
              data-testid="button-ask-ai"
            >
              {aiQueryMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Ask AI
            </Button>
          </form>

          {/* Quick Questions */}
          <div className="mb-6">
            <p className="text-sm font-medium text-slate-700 mb-3">Quick questions:</p>
            <div className="flex flex-wrap gap-2">
              {quickQuestions.map((question, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickQuestion(question)}
                  disabled={aiQueryMutation.isPending}
                  className="text-sm text-primary bg-primary-50 hover:bg-primary-100 border-primary-200"
                  data-testid={`button-quick-question-${index}`}
                >
                  {question}
                </Button>
              ))}
            </div>
          </div>

          {/* AI Response Area */}
          {response ? (
            <div className="bg-slate-50 rounded-lg p-6 space-y-4 ai-response" data-testid="ai-response-container">
              {/* AI Answer */}
              <div className="bg-white rounded-lg p-4 border border-slate-200">
                <div className="flex items-start gap-3">
                  <div className="bg-primary/10 rounded-full p-2">
                    <Bot className="text-primary w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900 mb-2">AI Analysis</p>
                    <p className="text-sm text-slate-700" data-testid="ai-answer">
                      {response.answer}
                    </p>
                  </div>
                </div>
              </div>

              {/* Generated SQL */}
              {response.sql && (
                <div className="bg-slate-900 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-slate-200">Generated SQL</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(response.sql)}
                      className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1"
                      data-testid="button-copy-sql"
                    >
                      <Copy className="h-3 w-3" />
                      Copy
                    </Button>
                  </div>
                  <pre className="text-xs text-green-400 font-mono overflow-x-auto" data-testid="sql-query">
                    {response.sql}
                  </pre>
                </div>
              )}

              {/* Chart Data (if applicable) */}
              {response.chartData && (
                <div className="bg-white rounded-lg p-4 border border-slate-200">
                  <p className="text-sm font-medium text-slate-900 mb-3">Visual Data</p>
                  <div className="h-48 bg-slate-50 rounded-lg flex items-center justify-center" data-testid="chart-placeholder">
                    <div className="text-center text-slate-500">
                      <BarChart3 className="mx-auto h-8 w-8 mb-2" />
                      <p className="text-sm">Chart visualization would be rendered here</p>
                      <p className="text-xs text-slate-400 mt-1">
                        {response.chartData.type} chart with {response.chartData.data?.length || 0} data points
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Data Table (if applicable) */}
              {response.data && response.data.length > 0 && (
                <div className="bg-white rounded-lg p-4 border border-slate-200">
                  <p className="text-sm font-medium text-slate-900 mb-3">Query Results</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm" data-testid="results-table">
                      <thead>
                        <tr className="border-b border-slate-200">
                          {Object.keys(response.data[0]).map((key) => (
                            <th key={key} className="text-left py-2 px-3 font-medium text-slate-700">
                              {key}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {response.data.slice(0, 10).map((row, index) => (
                          <tr key={index} className="border-b border-slate-100">
                            {Object.values(row).map((value, i) => (
                              <td key={i} className="py-2 px-3 text-slate-600">
                                {typeof value === 'number' ? value.toLocaleString() : String(value)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {response.data.length > 10 && (
                      <p className="text-xs text-slate-500 mt-2 text-center">
                        Showing first 10 of {response.data.length} results
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-50 rounded-lg p-6 border-2 border-dashed border-slate-200 text-center" data-testid="ai-placeholder">
              <div className="text-slate-400 mb-2">
                <MessageCircle className="mx-auto h-8 w-8" />
              </div>
              <p className="text-slate-600">AI responses will appear here. Try asking a question about your sales data!</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
