import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Bot, Send, MessageCircle, Plus, Clock, BarChart3, Copy, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface AIResponse {
  answer: string;
  sql?: string;
  data?: any[];
  chartData?: {
    type: string;
    data: any[];
  };
}

interface Conversation {
  id: string;
  title: string;
  timestamp: Date;
  messages: {
    id: string;
    type: 'user' | 'ai';
    content: string;
    response?: AIResponse;
    timestamp: Date;
  }[];
}

export default function AIChatPage() {
  const [query, setQuery] = useState("");
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const { toast } = useToast();

  // Mock conversations for demo
  useEffect(() => {
    const mockConversations: Conversation[] = [
      {
        id: "conv-1",
        title: "Top selling items analysis",
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        messages: [
          {
            id: "msg-1",
            type: 'user',
            content: "What were the top-selling items this week?",
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
            response: {
              answer: "Based on this week's sales data, the top-selling items are: 1) Signature Burger ($2,340 revenue, 156 units), 2) Fish & Chips ($1,890 revenue, 135 units), and 3) Caesar Salad ($1,245 revenue, 83 units). The Signature Burger shows strong performance with high unit sales and revenue.",
              sql: "SELECT product_name, SUM(total_amount) as revenue, SUM(quantity) as units_sold FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) GROUP BY product_name ORDER BY revenue DESC LIMIT 10;",
              data: [
                { product_name: "Signature Burger", revenue: 2340, units_sold: 156 },
                { product_name: "Fish & Chips", revenue: 1890, units_sold: 135 },
                { product_name: "Caesar Salad", revenue: 1245, units_sold: 83 }
              ]
            }
          }
        ]
      },
      {
        id: "conv-2", 
        title: "Sales by location yesterday",
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        messages: [
          {
            id: "msg-2",
            type: 'user',
            content: "Show me sales by location for yesterday",
            timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
            response: {
              answer: "Yesterday's sales by location: Main Street location led with $4,567 in total sales (89 orders), followed by Mall Plaza with $3,234 (67 orders), and Downtown with $2,891 (54 orders). Main Street consistently outperforms other locations.",
              sql: "SELECT l.name as location, SUM(o.total_amount) as total_sales, COUNT(o.id) as order_count FROM orders o JOIN locations l ON o.location_id = l.id WHERE DATE(o.created_at) = DATE_SUB(CURDATE(), INTERVAL 1 DAY) GROUP BY l.name ORDER BY total_sales DESC;",
              data: [
                { location: "Main Street", total_sales: 4567, order_count: 89 },
                { location: "Mall Plaza", total_sales: 3234, order_count: 67 },
                { location: "Downtown", total_sales: 2891, order_count: 54 }
              ]
            }
          }
        ]
      }
    ];
    setConversations(mockConversations);
  }, []);

  const aiQueryMutation = useMutation({
    mutationFn: async (query: string) => {
      const response = await fetch("/api/ai/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query }),
      });
      return response.json() as Promise<AIResponse>;
    },
    onSuccess: (response) => {
      if (currentConversation) {
        const newMessage = {
          id: `msg-${Date.now()}`,
          type: 'user' as const,
          content: query,
          response,
          timestamp: new Date()
        };
        
        const updatedConversation = {
          ...currentConversation,
          messages: [...currentConversation.messages, newMessage]
        };
        
        setCurrentConversation(updatedConversation);
        setConversations(prev => 
          prev.map(conv => conv.id === currentConversation.id ? updatedConversation : conv)
        );
      }
      setQuery("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to get AI response. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    if (!currentConversation) {
      startNewConversation();
      return;
    }

    aiQueryMutation.mutate(query.trim());
  };

  const startNewConversation = () => {
    const newConversation: Conversation = {
      id: `conv-${Date.now()}`,
      title: query.slice(0, 50) + (query.length > 50 ? "..." : ""),
      timestamp: new Date(),
      messages: []
    };
    
    setCurrentConversation(newConversation);
    setConversations(prev => [newConversation, ...prev]);
    
    if (query.trim()) {
      aiQueryMutation.mutate(query.trim());
    }
  };

  const selectConversation = (conversation: Conversation) => {
    setCurrentConversation(conversation);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "SQL query copied to clipboard",
    });
  };

  const quickQuestions = [
    "What were the top-selling items this week?",
    "Show me sales by location for yesterday",
    "What are our peak hours today?",
    "Which products have declining sales trends?",
  ];

  const handleQuickQuestion = (question: string) => {
    setQuery(question);
  };

  return (
    <div className="min-h-screen bg-slate-50">
        <Sidebar />
        
        <main className="lg:ml-64">
          <Header 
            title="AI Chat Assistant" 
            subtitle="Ask questions about your sales data and view conversation history" 
          />
          
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-200px)]">
              {/* Conversation History Sidebar */}
              <div className="lg:col-span-1">
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle className="text-lg">Conversations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {conversations.map((conversation) => (
                        <button
                          key={conversation.id}
                          onClick={() => selectConversation(conversation)}
                          className={`w-full text-left p-3 rounded-lg border transition-colors ${
                            currentConversation?.id === conversation.id
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-white hover:bg-gray-50 border-gray-200'
                          }`}
                          data-testid={`conversation-${conversation.id}`}
                        >
                          <div className="font-medium text-sm mb-1 truncate">
                            {conversation.title}
                          </div>
                          <div className="flex items-center gap-1 text-xs opacity-75">
                            <Clock className="w-3 h-3" />
                            {conversation.timestamp.toLocaleString()}
                          </div>
                        </button>
                      ))}
                      
                      {conversations.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No conversations yet</p>
                          <p className="text-xs">Start a new chat to begin</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Main Chat Area */}
              <div className="lg:col-span-3">
                <Card className="h-full flex flex-col">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="bg-primary rounded-lg p-2">
                        <Bot className="text-white w-5 h-5" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">
                          {currentConversation ? currentConversation.title : "Start a New Conversation"}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {currentConversation 
                            ? `${currentConversation.messages.length} messages`
                            : "Ask questions about your sales data in natural language"
                          }
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="flex-1 flex flex-col">
                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto mb-6 space-y-4">
                      {currentConversation && currentConversation.messages.length > 0 ? (
                        currentConversation.messages.map((message) => (
                          <div key={message.id} className="space-y-4">
                            {/* User Message */}
                            <div className="flex justify-end">
                              <div className="bg-primary text-primary-foreground rounded-lg p-3 max-w-[80%]">
                                <p className="text-sm">{message.content}</p>
                              </div>
                            </div>
                            
                            {/* AI Response */}
                            {message.response && (
                              <div className="space-y-3">
                                <div className="bg-gray-50 rounded-lg p-4">
                                  <div className="flex items-start gap-3">
                                    <div className="bg-primary/10 rounded-full p-2">
                                      <Bot className="text-primary w-4 h-4" />
                                    </div>
                                    <div className="flex-1">
                                      <p className="text-sm font-medium mb-2">AI Analysis</p>
                                      <p className="text-sm text-gray-700">{message.response.answer}</p>
                                    </div>
                                  </div>
                                </div>

                                {/* SQL Query */}
                                {message.response.sql && (
                                  <div className="bg-slate-900 rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-2">
                                      <p className="text-sm font-medium text-slate-200">Generated SQL</p>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => copyToClipboard(message.response!.sql!)}
                                        className="text-xs text-slate-400 hover:text-slate-200"
                                      >
                                        <Copy className="h-3 w-3 mr-1" />
                                        Copy
                                      </Button>
                                    </div>
                                    <pre className="text-xs text-green-400 font-mono overflow-x-auto">
                                      {message.response.sql}
                                    </pre>
                                  </div>
                                )}

                                {/* Data Table */}
                                {message.response.data && message.response.data.length > 0 && (
                                  <div className="bg-white rounded-lg p-4 border">
                                    <p className="text-sm font-medium mb-3">Query Results</p>
                                    <div className="overflow-x-auto">
                                      <table className="w-full text-sm">
                                        <thead>
                                          <tr className="border-b">
                                            {Object.keys(message.response.data[0]).map((key) => (
                                              <th key={key} className="text-left py-2 px-3 font-medium">
                                                {key}
                                              </th>
                                            ))}
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {message.response.data.slice(0, 5).map((row, index) => (
                                            <tr key={index} className="border-b border-gray-100">
                                              {Object.values(row).map((value, i) => (
                                                <td key={i} className="py-2 px-3">
                                                  {typeof value === 'number' ? value.toLocaleString() : String(value)}
                                                </td>
                                              ))}
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="flex-1 flex items-center justify-center">
                          <div className="text-center">
                            <Bot className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                              {currentConversation ? "Start the conversation" : "Welcome to AI Chat"}
                            </h3>
                            <p className="text-gray-500 mb-6 max-w-md">
                              Ask questions about your sales data in natural language. I can help you analyze trends, 
                              generate reports, and provide insights.
                            </p>
                            
                            {/* Quick Questions */}
                            <div className="space-y-2">
                              <p className="text-sm font-medium text-gray-700">Try asking:</p>
                              <div className="flex flex-wrap gap-2 justify-center">
                                {quickQuestions.map((question, index) => (
                                  <Button
                                    key={index}
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleQuickQuestion(question)}
                                    className="text-xs"
                                    data-testid={`quick-question-${index}`}
                                  >
                                    {question}
                                  </Button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Input Area */}
                    <form onSubmit={handleSubmit} className="flex gap-3">
                      <div className="flex-1">
                        <Textarea
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                          placeholder="Ask me anything about your sales data..."
                          rows={2}
                          className="resize-none"
                          disabled={aiQueryMutation.isPending}
                          data-testid="textarea-chat-input"
                        />
                      </div>
                      <Button
                        type="submit"
                        disabled={aiQueryMutation.isPending || !query.trim()}
                        className="px-6 py-3 flex items-center gap-2"
                        data-testid="button-send-message"
                      >
                        {aiQueryMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                        Send
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </main>
    </div>
  );
}