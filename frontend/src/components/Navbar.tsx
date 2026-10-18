import React from 'react';
import { 
  Home,
  FileSearch,
  Database,
  Share2,
  Lightbulb, 
  FileText, 
  BarChart2,
  Settings,
  HelpCircle,
  X
} from 'lucide-react';

export type TabView = 
  | 'overview'
  | 'search' 
  | 'workspace' 
  | 'knowledge' 
  | 'gaps' 
  | 'opportunities' 
  | 'reports' 
  | 'evaluation';

interface NavbarProps {
  currentTab: TabView;
  onSelectTab: (tab: TabView) => void;
  workspaceCount?: number;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  currentTab, 
  onSelectTab, 
  mobileOpen = false,
  onCloseMobile 
}) => {
  const navItems = [
    { id: 'overview' as TabView, label: 'Overview', icon: Home },
    { id: 'search' as TabView, label: 'Literature Search', icon: FileSearch },
    { id: 'knowledge' as TabView, label: 'Research Knowledge', icon: Database },
    { id: 'gaps' as TabView, label: 'Gap Discovery', icon: Share2 },
    { id: 'opportunities' as TabView, label: 'Opportunities', icon: Lightbulb },
    { id: 'reports' as TabView, label: 'Reports', icon: FileText },
    { id: 'evaluation' as TabView, label: 'Evaluation', icon: BarChart2 },
  ];

  const handleTabClick = (tabId: TabView) => {
    onSelectTab(tabId);
    if (onCloseMobile) onCloseMobile();
  };

  const sidebarContent = (
    <div 
      className="h-full flex flex-col justify-between bg-white border-r border-[#EAE7F2] select-none py-6 px-4 shrink-0"
      style={{ width: '240px', minWidth: '240px', maxWidth: '240px' }}
    >
      {/* Brand Header */}
      <div>
        <div className="flex items-center justify-between px-2 mb-8">
          <div 
            onClick={() => handleTabClick('overview')}
            className="cursor-pointer flex items-center space-x-3 group"
          >
            {/* Glowing Logo matching screenshot */}
            <div className="w-10 h-10 rounded-xl bg-[#EEE8FF] flex items-center justify-center text-[#6C4CE3] relative shadow-xs shrink-0">
              <Lightbulb className="w-5 h-5 text-[#6C4CE3]" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#6C4CE3] animate-pulse" />
            </div>
            <div>
              <span className="font-bold text-[#20233A] tracking-tight text-lg block leading-tight">
                IdeaGen
              </span>
              <span className="text-[11px] text-[#777B91] font-medium block leading-tight mt-0.5 whitespace-nowrap">
                From Literature to Ideas
              </span>
            </div>
          </div>

          {/* Mobile close button */}
          {onCloseMobile && (
            <button 
              onClick={onCloseMobile}
              className="lg:hidden text-[#777B91] hover:text-[#20233A] p-1 rounded-md"
              aria-label="Close navigation menu"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation Links */}
        <nav className="space-y-1.5" aria-label="Main Navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-[#EEE8FF] text-[#6C4CE3] font-semibold shadow-xs'
                    : 'text-[#777B91] hover:bg-[#F8F6FD] hover:text-[#20233A]'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 transition-colors ${
                  isActive ? 'text-[#6C4CE3]' : 'text-[#777B91]'
                }`} />
                <span className="whitespace-nowrap text-left">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Auxiliary Links matching reference */}
      <div className="pt-6 border-t border-[#EAE7F2] space-y-1">
        <button
          onClick={() => alert("IdeaGen v1.0 • Settings configured via environment (.env)")}
          className="w-full flex items-center space-x-3 px-3.5 py-2 rounded-xl text-[13px] font-medium text-[#777B91] hover:bg-[#F8F6FD] hover:text-[#20233A] transition-colors"
        >
          <Settings className="w-4 h-4 text-[#777B91] shrink-0" />
          <span>Settings</span>
        </button>
        <button
          onClick={() => window.open("https://github.com/IdeaGen", "_blank")}
          className="w-full flex items-center space-x-3 px-3.5 py-2 rounded-xl text-[13px] font-medium text-[#777B91] hover:bg-[#F8F6FD] hover:text-[#20233A] transition-colors"
        >
          <HelpCircle className="w-4 h-4 text-[#777B91] shrink-0" />
          <span>Help</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside 
        className="hidden lg:block shrink-0 sticky top-0 h-screen z-30"
        style={{ width: '240px', minWidth: '240px', maxWidth: '240px' }}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Navigation */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div 
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity" 
            onClick={onCloseMobile} 
          />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white z-10 shadow-2xl animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
