import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../supabaseClient';
import { Users, UserPlus, Shield, Wrench, User, Trash2, Key, CheckCircle2, AlertCircle, Plus, Lock } from 'lucide-react';

export default function UserManagementView({ currentUser }) {
  const [users, setUsers] = useState([
    { id: 'usr-1', full_name: 'Super Admin Principal', email: 'superadmin@lightpro.com', role: 'super_admin', created_at: new Date().toISOString() },
    { id: 'usr-2', full_name: 'Carlos Mendoza', email: 'carlos.mendoza@lightpro.com', role: 'technician', created_at: new Date().toISOString() },
    { id: 'usr-3', full_name: 'David Ruiz', email: 'david.ruiz@lightpro.com', role: 'technician', created_at: new Date().toISOString() },
    { id: 'usr-4', full_name: 'Producciones Eventos Global S.A.', email: 'contacto@eventosglobal.co', role: 'client', created_at: new Date().toISOString() },
  ]);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('technician');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Fetch Profiles from Supabase
  useEffect(() => {
    const fetchProfiles = async () => {
      if (!isSupabaseConfigured || !supabase) return;
      try {
        const { data, error: err } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
        if (!err && data && data.length > 0) {
          setUsers(data);
        }
      } catch (e) {
        console.warn('Error fetching profiles:', e);
      }
    };
    fetchProfiles();
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    const newUser = {
      id: `usr-${Date.now()}`,
      full_name: fullName,
      email: email,
      role: role,
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error: signUpErr } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName, role: role }
          }
        });

        if (signUpErr) throw signUpErr;

        if (data.user) {
          await supabase.from('profiles').upsert([{
            id: data.user.id,
            email: email,
            full_name: fullName,
            role: role,
          }]);
        }
      } catch (err) {
        console.warn('Supabase create user notice:', err);
      }
    }

    setUsers((prev) => [newUser, ...prev]);
    setMessage(`¡Usuario ${fullName} (${role}) creado exitosamente!`);
    setFullName('');
    setEmail('');
    setPassword('');
    setLoading(false);
    setTimeout(() => {
      setShowCreateModal(false);
      setMessage('');
    }, 1500);
  };

  const handleDeleteUser = async (userId) => {
    if (!confirm('¿Estás seguro de eliminar este usuario?')) return;
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('profiles').delete().eq('id', userId);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const getRoleBadge = (r) => {
    switch (r) {
      case 'super_admin':
        return <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1"><Shield className="w-3 h-3 text-amber-600" /> Super Admin</span>;
      case 'admin':
        return <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-1"><Shield className="w-3 h-3 text-purple-600" /> Administrador</span>;
      case 'technician':
        return <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1"><Wrench className="w-3 h-3 text-blue-600" /> Técnico</span>;
      default:
        return <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-800 border border-gray-200 flex items-center gap-1"><User className="w-3 h-3 text-gray-600" /> Cliente</span>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 mb-12">
      <div className="liquid-card rounded-3xl p-6 sm:p-8 bg-white border border-gray-200/80 shadow-md">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-gray-200/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center shadow-md">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">Gestión de Usuarios del Sistema</h2>
                <span className="text-[10px] font-bold uppercase bg-amber-400 text-black px-2 py-0.5 rounded-full">Exclusivo Super Admin</span>
              </div>
              <p className="text-xs text-gray-500">Creación de credenciales, roles y permisos centralizados con Supabase</p>
            </div>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="liquid-btn-primary px-5 py-2.5 rounded-full text-xs font-semibold flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            <span>Crear Nuevo Usuario</span>
          </button>
        </div>

        {/* Users Table */}
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-200 text-gray-400 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-3">Nombre Completo</th>
                <th className="py-3 px-3">Correo Electrónico</th>
                <th className="py-3 px-3">Rol & Permisos</th>
                <th className="py-3 px-3">Fecha de Creación</th>
                <th className="py-3 px-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50/80 transition-colors">
                  <td className="py-3.5 px-3 font-bold text-gray-900">{u.full_name}</td>
                  <td className="py-3.5 px-3 text-gray-600 font-mono">{u.email}</td>
                  <td className="py-3.5 px-3">{getRoleBadge(u.role)}</td>
                  <td className="py-3.5 px-3 text-gray-400 font-mono text-[11px]">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-3.5 px-3 text-right">
                    {u.role !== 'super_admin' && (
                      <button
                        onClick={() => handleDeleteUser(u.id)}
                        className="p-1.5 rounded-lg bg-gray-100 hover:bg-red-100 text-gray-500 hover:text-red-700 transition-colors"
                        title="Eliminar Usuario"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>

      {/* Modal Crear Usuario (Super Admin) */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
          <div className="liquid-card bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 border border-white/80 shadow-2xl relative">
            
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-200">
              <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-black" />
                <span>Crear Usuario en Supabase</span>
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"
              >
                ✕
              </button>
            </div>

            {message && (
              <div className="mb-4 p-3 rounded-2xl bg-emerald-50 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>{message}</span>
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ej. Andrés Gómez"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-black"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Correo Electrónico *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="andres@lightpro.com"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-black"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Contraseña Inicial *</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-black"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Asignar Rol & Permisos *</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-black"
                >
                  <option value="technician">Técnico (Actualizar Kanban, notas y QR)</option>
                  <option value="admin">Administrador (Configuración y borrado)</option>
                  <option value="client">Cliente (Registrar y rastrear equipos)</option>
                  <option value="super_admin">Super Admin (Control Total de Usuarios)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="liquid-btn-secondary px-4 py-2 rounded-full font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="liquid-btn-primary px-5 py-2 rounded-full font-semibold flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>{loading ? 'Creando...' : 'Crear Usuario'}</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
