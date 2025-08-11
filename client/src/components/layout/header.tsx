import { Link } from "wouter";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  title: string;
  subtitle: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  return (
    <header className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-30">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-4 ml-12 lg:ml-0">
          <div>
            <h2 className="text-xl font-semibold text-slate-900" data-testid="text-page-title">{title}</h2>
            <p className="text-sm text-slate-500" data-testid="text-page-subtitle">{subtitle}</p>
          </div>
        </div>
        
        {/* Quick AI Chat Button */}
        <Link href="/ai-chat">
          <Button 
            size="sm" 
            className="relative flex items-center gap-2 bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-500 hover:from-purple-600 hover:via-blue-600 hover:to-cyan-600 text-white border-0 overflow-hidden group animate-shimmer"
            data-testid="button-quick-ai-chat"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 animate-shimmer-sweep"></div>
            <Sparkles className="w-4 h-4 animate-pulse" />
            AI Chat
          </Button>
        </Link>
      </div>
    </header>
  );
}
