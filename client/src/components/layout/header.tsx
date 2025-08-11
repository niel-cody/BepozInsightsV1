import { Link } from "wouter";
import { MessageCircle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Filters } from "@/components/dashboard/filters";

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
        
        <div className="flex items-center gap-3">
          {/* Quick AI Chat Button */}
          <Link href="/ai-chat">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex items-center gap-2"
              data-testid="button-quick-ai-chat"
            >
              <MessageCircle className="w-4 h-4" />
              AI Chat
            </Button>
          </Link>
          
          {/* Filters Bar */}
          <Filters />
        </div>
      </div>
    </header>
  );
}
