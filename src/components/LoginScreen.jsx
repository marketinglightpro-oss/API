import React, { useState } from 'react';
import { supabase, isSupabaseConfigured } from '../supabaseClient';
import { LogIn, Mail, Lock, ShieldAlert, Cpu, Sparkles, UserCheck, Shield, Wrench, User } from 'lucide-react';

export default function LoginScreen({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!isSupabaseConfigured || !supabase) {
      // Demo fallback login if Supabase env vars not set locally
      const mockUser = {
        id: 'usr_super',
        email: email || 'superadmin@lightpro.com',
        user_metadata: { full_name: 'Super Administrador Principal', role: 'super_admin' },
      };
      onLoginSuccess(mockUser, 'super_admin');
      setLoading(false);
      return;
    }

    try {
      const { data, error: signInErr } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInErr) throw signInErr;

      if (data.user) {
        // Fetch user role from profiles table
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        const userRole = profile?.role || data.user.user_metadata?.role || 'super_admin';
        onLoginSuccess(data.user, userRole);
      }
    } catch (err) {
      setError(err.message || 'Credenciales incorrectas. Verifica tu correo y contraseña.');
    } finally {
      setLoading(false);
    }
  };

  // Demo Login Quick-Select Handler
  const handleQuickDemoLogin = (roleType, defaultEmail, name) => {
    const demoUser = {
      id: `usr_demo_${roleType}`,
      email: defaultEmail,
      user_metadata: { full_name: name, role: roleType },
    };
    onLoginSuccess(demoUser, roleType);
  };

  return (
    <div className="min-h-screen bg-[#F2F3F7] flex items-center justify-center p-4 relative overflow-hidden font-poppins selection:bg-black selection:text-white">
      {/* Background Decorative Gradients */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-white/80 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tl from-gray-300/40 to-transparent rounded-full blur-3xl pointer-events-none" />

      <div className="liquid-card bg-white/90 backdrop-blur-xl rounded-3xl max-w-md w-full p-6 sm:p-10 border border-white/80 shadow-2xl relative z-10">
        
        {/* Logo & Header */}
        <div className="flex flex-col items-center justify-center text-center mb-6">
          <img src="/logo.png" alt="LIGHT PRO" className="h-10 object-contain mb-3" />
          <span className="text-[10px] uppercase font-bold tracking-widest px-3 py-1 rounded-full bg-black text-white mb-2">
            ACCESO RESTRINGIDO
          </span>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Iniciar Sesión</h1>
          <p className="text-xs text-gray-500 mt-1">Ingresa tus credenciales autorizadas para acceder</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLoginSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-gray-700 font-semibold mb-1">Correo Electrónico</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="superadmin@lightpro.com"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-black transition-all"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-1">Contraseña</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-black transition-all"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full liquid-btn-primary py-3.5 rounded-full text-xs font-bold flex items-center justify-center gap-2 shadow-lg"
          >
            <LogIn className="w-4 h-4" />
            <span>{loading ? 'Verificando...' : 'Ingresar al Sistema'}</span>
          </button>
        </form>

        {/* Demo Roles Quick Login Switcher */}
        <div className="mt-8 pt-6 border-t border-gray-200/80">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center mb-3">
            O Probar Acceso Rápido por Rol (Demostración):
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleQuickDemoLogin('super_admin', 'superadmin@lightpro.com', 'Super Admin Principal')}
              className="p-2.5 rounded-xl bg-gray-900 hover:bg-black text-white text-[10px] font-bold flex items-center gap-1.5 transition-all"
            >
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              <span>Super Admin</span>
            </button>
            <button
              onClick={() => handleQuickDemoLogin('admin', 'admin@lightpro.com', 'Usuario Admin')}
              className="p-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-[10px] font-bold flex items-center gap-1.5 transition-all border border-gray-200"
            >
              <UserCheck className="w-3.5 h-3.5 text-black" />
              <span>Administrador</span>
            </button>
            <button
              onClick={() => handleQuickDemoLogin('technician', 'tecnico@lightpro.com', 'Carlos Mendoza (Técnico)')}
              className="p-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-[10px] font-bold flex items-center gap-1.5 transition-all border border-gray-200"
            >
              <Wrench className="w-3.5 h-3.5 text-amber-600" />
              <span>Técnico</span>
            </button>
            <button
              onClick={() => handleQuickDemoLogin('client', 'cliente@eventosglobal.com', 'Producciones Eventos S.A.')}
              className="p-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-[10px] font-bold flex items-center gap-1.5 transition-all border border-gray-200"
            >
              <User className="w-3.5 h-3.5 text-blue-600" />
              <span>Cliente</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
