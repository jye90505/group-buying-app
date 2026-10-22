import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar.tsx';
import { CreateGroupWizard } from './components/CreateGroupWizard.tsx';
import { OrderRoomView } from './components/OrderRoomView.tsx';
import { HostDashboard } from './components/HostDashboard.tsx';
import { GroupOrderRoom, ParticipantOrder } from './types.ts';
import { SEED_ROOMS } from './utils/seedData.ts';
import { Coffee, Utensils, Shirt, PlusCircle, Sparkles } from 'lucide-react';

export default function App() {
  const [currentView, setCurrentView] = useState<'order' | 'host' | 'create' | 'rooms'>('order');
  const [rooms, setRooms] = useState<GroupOrderRoom[]>(SEED_ROOMS);
  const [activeRoomId, setActiveRoomId] = useState<string>(SEED_ROOMS[0].id);
  const [loading, setLoading] = useState(false);

  // Sync with URL query parameters on initial load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    const viewParam = params.get('view');

    if (roomParam) {
      setActiveRoomId(roomParam);
    }
    if (viewParam === 'host' || viewParam === 'order' || viewParam === 'create') {
      setCurrentView(viewParam);
    }

    // Fetch up-to-date rooms from backend
    fetchRooms(roomParam || undefined);
  }, []);

  const fetchRooms = async (targetId?: string) => {
    try {
      setLoading(true);
      const res = await fetch('/api/rooms');
      const data = await res.json();
      if (data.success && data.rooms && data.rooms.length > 0) {
        setRooms(data.rooms);
        if (targetId) {
          const found = data.rooms.find((r: GroupOrderRoom) => r.id === targetId);
          if (found) {
            setActiveRoomId(found.id);
            return;
          }
        }
        // If current active room not found, default to first
        if (!data.rooms.some((r: GroupOrderRoom) => r.id === activeRoomId)) {
          setActiveRoomId(data.rooms[0].id);
        }
      }
    } catch (err) {
      console.warn('Using seeded room data:', err);
    } finally {
      setLoading(false);
    }
  };

  const activeRoom = rooms.find(r => r.id === activeRoomId) || rooms[0] || null;

  // Handle participant submitting an order
  const handleOrderSubmitted = async (newOrder: ParticipantOrder) => {
    if (!activeRoom) return;

    try {
      const res = await fetch(`/api/rooms/${activeRoom.id}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newOrder),
      });
      const data = await res.json();
      if (data.success && data.room) {
        updateRoomInState(data.room);
      }
    } catch (err) {
      console.error('Error submitting order to backend:', err);
      // Fallback local update
      const updatedOrders = [...activeRoom.orders, newOrder];
      const updatedRoom = { ...activeRoom, orders: updatedOrders, updatedAt: Date.now() };
      updateRoomInState(updatedRoom);
    }
  };

  // Handle participant deleting own order
  const handleOrderDeleted = async (orderId: string) => {
    if (!activeRoom) return;

    try {
      const res = await fetch(`/api/rooms/${activeRoom.id}/orders/${orderId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success && data.room) {
        updateRoomInState(data.room);
      }
    } catch (err) {
      const updatedOrders = activeRoom.orders.filter(o => o.id !== orderId);
      const updatedRoom = { ...activeRoom, orders: updatedOrders, updatedAt: Date.now() };
      updateRoomInState(updatedRoom);
    }
  };

  // Handle host toggling item stock
  const handleToggleStock = async (itemId: string, isAvailable: boolean) => {
    if (!activeRoom) return;

    try {
      const res = await fetch(`/api/rooms/${activeRoom.id}/toggle-stock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, isAvailable }),
      });
      const data = await res.json();
      if (data.success && data.room) {
        updateRoomInState(data.room);
      }
    } catch (err) {
      const updatedItems = activeRoom.items.map(i =>
        i.id === itemId ? { ...i, isAvailable } : i
      );
      const updatedRoom = { ...activeRoom, items: updatedItems, updatedAt: Date.now() };
      updateRoomInState(updatedRoom);
    }
  };

  // Handle host toggling payment status
  const handleTogglePaid = async (orderId: string) => {
    if (!activeRoom) return;

    try {
      const res = await fetch(`/api/rooms/${activeRoom.id}/toggle-paid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });
      const data = await res.json();
      if (data.success && data.room) {
        updateRoomInState(data.room);
      }
    } catch (err) {
      const updatedOrders = activeRoom.orders.map(o =>
        o.id === orderId ? { ...o, paid: !o.paid } : o
      );
      const updatedRoom = { ...activeRoom, orders: updatedOrders, updatedAt: Date.now() };
      updateRoomInState(updatedRoom);
    }
  };

  const updateRoomInState = (updatedRoom: GroupOrderRoom) => {
    setRooms(prev => prev.map(r => (r.id === updatedRoom.id ? updatedRoom : r)));
  };

  const handleRoomCreated = (newRoom: GroupOrderRoom) => {
    setRooms(prev => [newRoom, ...prev]);
    setActiveRoomId(newRoom.id);
  };

  const handleNavigateToRoom = (roomId: string, role: 'order' | 'host') => {
    setActiveRoomId(roomId);
    setCurrentView(role);
    window.history.pushState({}, '', `?room=${roomId}&view=${role}`);
  };

  const handleSelectRoom = (roomId: string) => {
    setActiveRoomId(roomId);
    window.history.pushState({}, '', `?room=${roomId}`);
  };

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col font-sans text-stone-900 antialiased selection:bg-amber-200">
      {/* Top Navbar */}
      <Navbar
        currentView={currentView}
        onNavigate={setCurrentView}
        activeRoom={activeRoom}
        allRooms={rooms}
        onSelectRoom={handleSelectRoom}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {currentView === 'create' && (
          <CreateGroupWizard
            onRoomCreated={handleRoomCreated}
            onNavigateToRoom={handleNavigateToRoom}
          />
        )}

        {currentView === 'order' && activeRoom && (
          <OrderRoomView
            room={activeRoom}
            onOrderSubmitted={handleOrderSubmitted}
            onOrderDeleted={handleOrderDeleted}
            onOpenHostView={() => setCurrentView('host')}
          />
        )}

        {currentView === 'host' && activeRoom && (
          <HostDashboard
            room={activeRoom}
            onToggleStock={handleToggleStock}
            onTogglePaid={handleTogglePaid}
            onRefreshRoom={() => fetchRooms(activeRoom.id)}
          />
        )}
      </main>

      {/* Footer & Sample Rooms Switcher */}
      <footer className="bg-white border-t border-stone-200 py-8 px-4 text-center mt-12">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-stone-500">
            <span className="font-bold text-stone-700">揪團幫手 TuanGo</span>
            <span>•</span>
            <span>AI 菜單辨識分解</span>
            <span>•</span>
            <span>缺貨備選方案機制</span>
            <span>•</span>
            <span>LINE/Slack 快速匯出</span>
          </div>

          {/* Quick Demo Switcher */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-stone-400 font-semibold uppercase tracking-wider">
              快速體驗示範團購：
            </span>
            <div className="flex items-center gap-1">
              {SEED_ROOMS.map(r => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => handleSelectRoom(r.id)}
                  className={`px-2.5 py-1 text-xs rounded-md transition-all ${
                    activeRoom?.id === r.id
                      ? 'bg-amber-100 text-amber-900 font-bold border border-amber-300'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {r.category === 'drink' ? '🥤 飲料團' : r.category === 'bento' ? '🍱 便當團' : '👕 團服'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
