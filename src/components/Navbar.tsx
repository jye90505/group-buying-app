import React from 'react';
import { ShoppingBag, PlusCircle, BarChart3, Store, Coffee, ChevronDown } from 'lucide-react';
import { GroupOrderRoom } from '../types.ts';

interface NavbarProps {
  currentView: 'order' | 'host' | 'create' | 'rooms';
  onNavigate: (view: 'order' | 'host' | 'create' | 'rooms') => void;
  activeRoom: GroupOrderRoom | null;
  allRooms: GroupOrderRoom[];
  onSelectRoom: (roomId: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  activeRoom,
  allRooms,
  onSelectRoom,
}) => {
  const [dropdownOpen, setDropdownOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-amber-100 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div className="flex items-center gap-2 cursor-pointer shrink-0" onClick={() => onNavigate('order')}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-sm shrink-0">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-base text-stone-800 tracking-tight">揪團幫手</span>
                <span className="hidden sm:inline px-1.5 py-0.5 text-[10px] font-semibold bg-amber-100 text-amber-800 rounded-md">
                  AI 智慧備選
                </span>
              </div>
              <p className="text-[11px] text-stone-500 hidden md:block">菜單秒辨識 • 備選方案 • 即時統整</p>
            </div>
          </div>

          {/* Active Room Switcher */}
          {activeRoom && (
            <div className="relative hidden md:block">
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200/70 border border-stone-200 text-stone-700 text-sm transition-colors"
                aria-label="切換團購房間"
              >
                <Store className="w-4 h-4 text-amber-600" />
                <span className="font-medium max-w-[180px] truncate">{activeRoom.title || activeRoom.storeName}</span>
                <ChevronDown className="w-3.5 h-3.5 text-stone-500" />
              </button>

              {dropdownOpen && (
                <div className="absolute left-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-stone-200 py-1.5 z-50">
                  <div className="px-3 py-1 text-xs font-semibold text-stone-400 uppercase tracking-wider">
                    進行中的團購房間
                  </div>
                  {allRooms.map(r => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => {
                        onSelectRoom(r.id);
                        setDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-amber-50 transition-colors ${
                        r.id === activeRoom.id ? 'bg-amber-50 text-amber-800 font-medium' : 'text-stone-700'
                      }`}
                    >
                      <span className="truncate">{r.title || r.storeName}</span>
                      <span className="text-xs text-stone-400 ml-2">
                        {r.orders.length} 人已點
                      </span>
                    </button>
                  ))}
                  <div className="border-t border-stone-100 mt-1 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setDropdownOpen(false);
                        onNavigate('create');
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-amber-600 hover:bg-amber-50 flex items-center gap-2 font-medium"
                    >
                      <PlusCircle className="w-4 h-4" />
                      發起全新團購
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('order')}
              className={`flex items-center gap-1 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                currentView === 'order'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
              }`}
            >
              <Coffee className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">好朋友點餐</span>
              <span className="sm:hidden">點餐</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('host')}
              className={`relative flex items-center gap-1 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                currentView === 'host'
                  ? 'bg-stone-800 text-white shadow-xs'
                  : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">主揪戰情室</span>
              <span className="sm:hidden">戰情室</span>
              {activeRoom && activeRoom.orders.length > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 bg-amber-500 text-white text-[10px] rounded-full font-bold">
                  {activeRoom.orders.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => onNavigate('create')}
              className={`flex items-center gap-1 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                currentView === 'create'
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'bg-amber-100 text-amber-900 hover:bg-amber-200'
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-current" />
              <span className="hidden sm:inline">發起團購</span>
              <span className="sm:hidden">發起</span>
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
};
