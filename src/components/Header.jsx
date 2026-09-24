import React from 'react';
import { Shield, Wrench, User, Bell, QrCode, PlusCircle, LayoutGrid, Activity, LogIn, LogOut } from 'lucide-react';

export default function Header({ currentRole, setCurrentRole, activeTab, setActiveTab, currentUser, onOpenAuthModal, onSignOut }) {
  const roles = [
    { id: 'admin', label: 'Admin', icon: Shield },
    { id: 'technician', label: 'Técnico', icon: Wrench },
    { id: 'client', label: 'Cliente', icon: User },
  ];

  const tabs = [
    { id: 'kanban', label: 'Kanban', icon: LayoutGrid },
    { id: 'register', label: 'Registrar', icon: PlusCircle },
    { id: 'scanner', label: 'Escanear QR', icon: QrCode },
    { id: 'logs', label: 'Historial', icon: Activity },
  ];

  return (
    <>
      {/* Top Header */}
      <header className="sticky top-2 z-40 mb-4 mx-auto max-w-7xl px-3 sm:px-4">
        <div className="liquid-card rounded-2xl sm:rounded-full px-4 sm:px-6 py-2.5 sm:py-3.5 flex items-center justify-between gap-2 sm:gap-4 shadow-lg border border-white/80 overflow-hidden">
          
          {/* Brand Logo */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <img 
              src="/logo.png" 
              alt="LIGHT PRO" 
              className="h-8 sm:h-10 object-contain max-w-[130px] sm:max-w-[170px]"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            <span className="hidden xl:inline-block text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 rounded-full bg-black text-white">
              RASTREO QR
            </span>
          </div>

          {/* Desktop Navigation Tabs */}
          <nav className="hidden md:flex items-center bg-gray-200/60 p-1 rounded-full text-xs font-medium border border-gray-300/40">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-full transition-all duration-200 ${
                    isActive
                      ? 'bg-black text-white shadow-md shadow-black/20 font-semibold scale-105'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* Right Section: Role Switcher, User Profile & Login */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            
            {/* Role Switcher Pill */}
            <div className="hidden sm:flex items-center bg-white/90 p-1 rounded-full shadow-inner border border-gray-200 text-xs">
              {roles.map((r) => {
                const Icon = r.icon;
                const isSelected = currentRole === r.id;
                return (
                  <button
                    key={r.id}
                    onClick={() => setCurrentRole(r.id)}
                    className={`flex items-center gap-1 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full transition-all text-[10px] sm:text-xs font-medium ${
                      isSelected
                        ? 'bg-black text-white shadow-sm font-semibold'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    <span>{r.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Auth Login / Logout Profile Button */}
            {currentUser ? (
              <div className="flex items-center gap-1.5 bg-gray-100 p-1 pl-3 rounded-full text-xs font-semibold border border-gray-200">
                <span className="text-gray-800 font-bold truncate max-w-[100px] sm:max-w-[130px]">
                  {currentUser.user_metadata?.full_name || currentUser.email}
                </span>
                <button
                  onClick={onSignOut}
                  className="w-7 h-7 rounded-full bg-black text-white flex items-center justify-center hover:bg-red-600 transition-colors"
                  title="Cerrar Sesión"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuthModal}
                className="liquid-btn-primary px-3.5 py-1.5 sm:py-2 rounded-full text-xs font-semibold flex items-center gap-1.5"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Ingresar</span>
              </button>
            )}

            {/* Notification Bell */}
            <button className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white shadow-sm border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-50 hover:shadow transition-all flex-shrink-0">
              <Bell className="w-4 h-4" />
            </button>
          </div>

        </div>
      </header>

      {/* Fixed Bottom Navigation Bar for Mobile Phones */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-t border-gray-200/80 px-2 py-1.5 flex items-center justify-around shadow-[0_-5px_20px_rgba(0,0,0,0.08)]">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const isScanner = tab.id === 'scanner';

          if (isScanner) {
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex flex-col items-center justify-center -mt-5"
              >
                <div className="w-12 h-12 rounded-full bg-black text-white flex items-center justify-center shadow-lg shadow-black/30 border-2 border-white transform active:scale-95 transition-all">
                  <QrCode className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-bold text-gray-900 mt-0.5">Escanear</span>
              </button>
            );
          }

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
                isActive ? 'text-black font-bold scale-105' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
