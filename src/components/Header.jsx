import React, { useState } from 'react';
import { Shield, Wrench, User, Bell, QrCode, PlusCircle, LayoutGrid, Activity, LogOut, Users, CheckCheck, Clock, ChevronRight, RefreshCw, Cloud } from 'lucide-react';

export default function Header({
  currentRole,
  setCurrentRole,
  activeTab,
  setActiveTab,
  currentUser,
  onSignOut,
  notifications = [],
  onMarkNotificationsRead,
  onSelectNotification,
  isSyncing = false,
  lastSyncTime = null,
  onForceSync,
}) {
  const [showNotifications, setShowNotifications] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;

  const allTabs = [
    { id: 'reparaciones', label: 'Reparaciones', icon: LayoutGrid },
    { id: 'equipos', label: 'Equipos / Personal', icon: Users, roles: ['super_admin', 'admin'] },
    { id: 'herramientas', label: 'Herramientas', icon: Wrench, badge: 'Próximamente' },
    { id: 'alquileres', label: 'Alquileres', icon: PlusCircle, badge: 'Próximamente' },
    { id: 'horarios', label: 'Horarios', icon: Clock, badge: 'Próximamente' },
  ];

  const tabs = allTabs.filter(tab => !tab.roles || tab.roles.includes(currentRole));

  return (
    <>
      {/* Top Header - Full Fluid Width Layout */}
      <header className="sticky top-2 z-40 mb-4 w-full px-3 sm:px-6 md:px-8">
        <div className="liquid-card rounded-2xl sm:rounded-full px-4 sm:px-8 py-2.5 sm:py-3.5 flex items-center justify-between gap-2 sm:gap-4 shadow-lg border border-white/80 overflow-visible w-full relative">
          
          {/* Brand Logo & QR Badge */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
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

          {/* Right Section: Role Indicator, User Profile & Logout & Notification Bell */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 relative">
            
            {/* Cloud Auto-Sync Indicator Button */}
            {onForceSync && (
              <button
                onClick={onForceSync}
                className={`hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all ${
                  isSyncing
                    ? 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100 shadow-xs'
                }`}
                title="Guardado automático a Supabase cada 10s. Haz clic para sincronizar ahora."
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-amber-600' : 'text-emerald-600'}`} />
                <span>{isSyncing ? 'Sincronizando...' : 'Auto-Sync 10s'}</span>
              </button>
            )}

            {/* Registered User Role Badge (Read-Only) */}
            <div className="hidden sm:flex items-center gap-1.5 bg-black text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-sm border border-gray-800">
              {currentRole === 'super_admin' && <Shield className="w-3.5 h-3.5 text-amber-400" />}
              {currentRole === 'admin' && <Shield className="w-3.5 h-3.5 text-purple-400" />}
              {currentRole === 'technician' && <Wrench className="w-3.5 h-3.5 text-blue-400" />}
              {currentRole === 'client' && <User className="w-3.5 h-3.5 text-emerald-400" />}
              <span>
                {currentRole === 'super_admin' ? 'Super Admin' : currentRole === 'admin' ? 'Administrador' : currentRole === 'technician' ? 'Técnico' : 'Cliente'}
              </span>
            </div>

            {/* Auth User Profile Badge & Logout Button */}
            {currentUser && (
              <div className="flex items-center gap-1.5 bg-gray-100 p-1 pl-3 rounded-full text-xs font-semibold border border-gray-200">
                <span className="text-gray-800 font-bold truncate max-w-[120px] sm:max-w-[160px]">
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
            )}

            {/* Notification Bell Button with Badge */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white shadow-sm border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-50 hover:shadow transition-all flex-shrink-0 relative"
                title="Centro de Notificaciones"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-600 text-white text-[9px] font-bold flex items-center justify-center animate-pulse border-2 border-white">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Popover Dropdown Panel */}
              {showNotifications && (
                <div className="absolute right-0 top-11 w-80 sm:w-96 bg-white rounded-3xl border border-gray-200 shadow-2xl z-50 p-4 animate-fadeIn">
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center text-xs font-bold">
                        <Bell className="w-3.5 h-3.5" />
                      </div>
                      <h4 className="font-bold text-xs text-gray-900 tracking-tight">Notificaciones del Sistema</h4>
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={onMarkNotificationsRead}
                        className="text-[10px] font-semibold text-gray-500 hover:text-black flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-full"
                      >
                        <CheckCheck className="w-3 h-3 text-emerald-600" />
                        <span>Marcar leídas</span>
                      </button>
                    )}
                  </div>

                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1 text-xs">
                    {notifications.length === 0 ? (
                      <p className="text-xs text-gray-400 italic text-center py-6">No hay notificaciones recientes.</p>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => {
                            setShowNotifications(false);
                            if (onSelectNotification) onSelectNotification(n);
                          }}
                          className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                            n.read ? 'bg-gray-50/70 border-gray-100 text-gray-600' : 'bg-amber-50/50 border-amber-200 text-gray-900 font-medium shadow-sm'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[10px] mb-1">
                            <span className="font-bold uppercase tracking-wider text-black">{n.title}</span>
                            <span className="text-gray-400 font-mono text-[9px] flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" />
                              {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-[11px] leading-snug">{n.detail}</p>
                          {n.equipmentId && (
                            <div className="mt-1.5 flex items-center justify-end text-[10px] font-bold text-gray-800 hover:underline gap-0.5">
                              <span>Ver equipo ({n.equipmentId})</span>
                              <ChevronRight className="w-3 h-3" />
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

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
