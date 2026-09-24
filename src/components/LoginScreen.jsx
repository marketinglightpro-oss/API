import React, { useState } from 'react';
import { supabase, isSupabaseConfigured } from '../supabaseClient';
import { LogIn, Mail, Lock, ShieldAlert, Cpu, Sparkles, UserCheck, Shield, Wrench, User } from 'lucide-react';

export default function LoginScreen({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForgotModal, setShowForgotModal] = useState(false);

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
            <div className="flex items-center justify-between mb-1">
              <label className="text-gray-700 font-semibold">Contraseña</label>
              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                className="text-[11px] text-gray-500 hover:text-black font-semibold transition-colors"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
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

      </div>

      {/* Forgot Password Notice Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
          <div className="liquid-card bg-white rounded-3xl max-w-sm w-full p-6 sm:p-8 border border-gray-200 shadow-2xl relative text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center mx-auto border border-amber-300 shadow-md">
              <Shield className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-gray-900 tracking-tight">
                Restablecimiento de Contraseña
              </h3>
              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600 mt-0.5">
                Exclusivo Super Admin
              </p>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed font-medium bg-gray-50 p-4 rounded-2xl border border-gray-200 text-left">
              Por políticas de seguridad de <strong>LIGHTPRO</strong>, el restablecimiento y asignación de contraseñas es gestionado únicamente por el <strong>Super Admin</strong> del sistema.<br/><br/>
              Por favor contacta a tu Administrador Principal para que te asigne una nueva clave de acceso de forma segura.
            </p>
            <button
              onClick={() => setShowForgotModal(false)}
              className="w-full liquid-btn-primary py-3 rounded-2xl text-xs font-bold shadow-md"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
