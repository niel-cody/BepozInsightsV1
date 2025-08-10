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
        
        {/* Filters Bar */}
        <Filters />
      </div>
    </header>
  );
}
