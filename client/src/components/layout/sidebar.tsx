import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { 
  ChartLine, 
  Home, 
  BarChart3, 
  FileText, 
  Settings, 
  LogOut, 
  User,
  Menu,
  X,
  MessageCircle
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const { user, signOut } = useAuth();
  const [location] = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: Home, current: location === "/dashboard" },
    { name: "Sales Trends", href: "/sales-trends", icon: BarChart3, current: location === "/sales-trends" },
    { name: "AI Chat", href: "/ai-chat", icon: MessageCircle, current: location === "/ai-chat" },
    { name: "Reports", href: "/reports", icon: FileText, current: location === "/reports" },
    { name: "Settings", href: "/settings", icon: Settings, current: location === "/settings" },
  ];

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      {/* Logo/Brand */}
      <div className="flex items-center gap-3 p-6 border-b border-slate-200">
        <div className="bg-primary rounded-lg p-2">
          <ChartLine className="text-white text-xl" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-900">Bepoz AI</h1>
          <p className="text-sm text-slate-500">Insights</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="lg:hidden ml-auto"
          onClick={() => setIsMobileOpen(false)}
          data-testid="button-close-sidebar"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>
      
      {/* Navigation Menu */}
      <nav className="flex-1 px-4 py-6">
        <ul className="space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.name}>
                <Link href={item.href}>
                  <a
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                      item.current
                        ? "text-white bg-primary"
                        : "text-slate-600 hover:bg-slate-100"
                    )}
                    onClick={() => setIsMobileOpen(false)}
                    data-testid={`link-${item.name.toLowerCase()}`}
                  >
                    <Icon className="w-5 h-5" />
                    {item.name}
                  </a>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      
      {/* User Profile */}
      <div className="border-t border-slate-200 p-4">
        <div className="flex items-center gap-3">
          <div className="bg-slate-300 rounded-full w-8 h-8 flex items-center justify-center">
            <User className="text-slate-600 text-sm" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate" data-testid="text-user-name">
              {user?.name || user?.email?.split('@')[0] || "User"}
            </p>
            <p className="text-xs text-slate-500 truncate" data-testid="text-user-role">
              {user?.role || "Manager"}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={signOut}
            className="text-slate-400 hover:text-slate-600"
            data-testid="button-sign-out"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        className="lg:hidden fixed top-4 left-4 z-50"
        onClick={() => setIsMobileOpen(true)}
        data-testid="button-open-sidebar"
      >
        <Menu className="h-6 w-6" />
      </Button>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" onClick={() => setIsMobileOpen(false)} />
      )}

      {/* Desktop sidebar */}
      <aside className={cn(
        "fixed left-0 top-0 z-40 h-screen w-64 bg-white shadow-lg border-r border-slate-200 transition-transform",
        "hidden lg:block",
        className
      )}>
        <SidebarContent />
      </aside>

      {/* Mobile sidebar */}
      <aside className={cn(
        "fixed left-0 top-0 z-50 h-screen w-64 bg-white shadow-lg border-r border-slate-200 transition-transform",
        "lg:hidden",
        isMobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <SidebarContent />
      </aside>
    </>
  );
}
