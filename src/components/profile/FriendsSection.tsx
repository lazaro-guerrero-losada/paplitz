import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Flame,
  Trophy,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Trash2,
  Award,
} from 'lucide-react';
import { FriendData, addFriend, getFriendsWithStats, removeFriend } from '../../lib/socialSync';
import { getSupabaseConfig } from '../../lib/cloudSync';

interface FriendsSectionProps {
  currentAlias: string;
}

export const FriendsSection: React.FC<FriendsSectionProps> = ({ currentAlias }) => {
  const isCloudConfigured = getSupabaseConfig().isConfigured;
  const [friendAliasInput, setFriendAliasInput] = useState('');
  const [friendsList, setFriendsList] = useState<FriendData[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadFriends = async () => {
    if (!currentAlias.trim()) return;
    setLoading(true);
    const res = await getFriendsWithStats(currentAlias);
    setLoading(false);
    if (res.success && res.friends) {
      setFriendsList(res.friends);
    }
  };

  useEffect(() => {
    if (currentAlias.trim()) {
      loadFriends();
    }
  }, [currentAlias]);

  const handleAddFriend = async () => {
    if (!friendAliasInput.trim() || !currentAlias.trim()) return;
    setLoading(true);
    setStatusMsg(null);

    const res = await addFriend(currentAlias, friendAliasInput);
    setLoading(false);

    if (res.success) {
      setStatusMsg({ type: 'success', text: `¡Has agregado a @${friendAliasInput.toLowerCase()} a tus amigos!` });
      setFriendAliasInput('');
      loadFriends();
    } else {
      setStatusMsg({ type: 'error', text: res.error || 'No se pudo agregar al amigo.' });
    }
  };

  const handleRemoveFriend = async (friendAlias: string) => {
    if (!window.confirm(`¿Seguro que quieres eliminar a @${friendAlias} de tus amigos?`)) return;
    const res = await removeFriend(currentAlias, friendAlias);
    if (res.success) {
      setFriendsList((prev) => prev.filter((f) => f.alias !== friendAlias));
    }
  };

  if (!isCloudConfigured) {
    return (
      <div className="border-2 border-black p-6 bg-white shadow-[3px_3px_0px_#000000] text-center">
        <Users className="w-8 h-8 mx-auto mb-2 stroke-[2]" />
        <h3 className="font-display font-bold text-lg">Comunidad de Dibujantes</h3>
        <p className="text-xs text-neutral-600 max-w-md mx-auto mt-1 mb-4 font-sans">
          Para conectar con amigos y ver su progreso es necesario que la sincronización en la nube de Supabase esté activa.
        </p>
        <span className="text-[10px] font-mono uppercase bg-neutral-100 border border-black px-2 py-1 font-bold">
          Configuración de Nube Requerida
        </span>
      </div>
    );
  }

  if (!currentAlias.trim()) {
    return (
      <div className="border-2 border-black p-6 bg-white shadow-[3px_3px_0px_#000000] text-center">
        <Users className="w-8 h-8 mx-auto mb-2 stroke-[2]" />
        <h3 className="font-display font-bold text-lg">Define tu Alias de Jugador</h3>
        <p className="text-xs text-neutral-600 max-w-md mx-auto mt-1 mb-4 font-sans">
          Antes de agregar amigos, necesitas tener un <strong>Alias de Jugador</strong> asignado en la sección de Guardado en la Nube.
        </p>
      </div>
    );
  }

  return (
    <div className="border-2 border-black p-5 bg-white shadow-[3px_3px_0px_#000000]">
      <div className="flex items-center justify-between border-b-2 border-black pb-3 mb-4">
        <div>
          <span className="text-[10px] font-mono uppercase bg-black text-white px-2 py-0.5 font-bold">
            RED DE DIBUJANTES
          </span>
          <h3 className="text-xl font-bold font-display mt-1">Mis Amigos & Colegas</h3>
        </div>
        <Users className="w-6 h-6 stroke-[2]" />
      </div>

      <p className="text-xs text-neutral-600 font-sans mb-4">
        Agrega a tus amigos por su <strong>Alias</strong> para seguir su racha diaria, nivel y cuántos cubos llevan completados.
      </p>

      {/* Formulario Añadir Amigo */}
      <div className="border border-black p-4 bg-neutral-50 mb-6">
        <div className="flex flex-col sm:flex-row gap-2.5 items-end">
          <div className="flex-1 w-full">
            <label className="block text-[10px] font-mono uppercase font-bold text-neutral-600 mb-1">
              Alias del Amigo
            </label>
            <input
              type="text"
              value={friendAliasInput}
              onChange={(e) => setFriendAliasInput(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
              placeholder="ej: carlos_perspectiva"
              maxLength={24}
              className="w-full border-2 border-black px-2.5 py-1.5 text-xs font-mono font-bold bg-white focus:outline-none"
            />
          </div>

          <button
            disabled={loading || !friendAliasInput.trim()}
            onClick={handleAddFriend}
            className="btn-ink px-4 py-1.5 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_#000000] shrink-0 disabled:opacity-40"
          >
            <UserPlus className="w-4 h-4" />
            <span>{loading ? 'Buscando...' : 'Agregar Amigo'}</span>
          </button>
        </div>

        {statusMsg && (
          <div
            className={`mt-3 p-2.5 border text-xs font-mono flex items-center gap-2 ${
              statusMsg.type === 'success'
                ? 'bg-neutral-100 border-black text-black font-bold'
                : 'bg-red-50 border-red-500 text-red-700'
            }`}
          >
            {statusMsg.type === 'success' ? (
              <CheckCircle className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span>{statusMsg.text}</span>
          </div>
        )}
      </div>

      {/* Lista de Amigos */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-mono font-bold text-xs uppercase text-neutral-700">
            Amigos agregados ({friendsList.length})
          </h4>
          <button
            onClick={loadFriends}
            className="btn-ink-outline px-2 py-0.5 text-[11px] font-mono flex items-center gap-1 cursor-pointer"
            title="Actualizar lista de amigos"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </button>
        </div>

        {friendsList.length === 0 ? (
          <div className="border border-dashed border-neutral-300 p-6 text-center text-xs text-neutral-500 font-mono">
            Aún no has añadido a ningún amigo. Introduce el alias de un compañero arriba para seguir su progreso.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {friendsList.map((f) => (
              <div
                key={f.alias}
                className="border-2 border-black p-4 bg-white shadow-[2px_2px_0px_#000000] flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-display font-bold text-sm">@{f.alias}</span>
                      <span className="text-[10px] font-mono bg-black text-white px-1.5 py-0.2 font-bold">
                        NV.{f.level}
                      </span>
                    </div>
                    <button
                      onClick={() => handleRemoveFriend(f.alias)}
                      className="text-neutral-400 hover:text-red-600 p-1 cursor-pointer transition-colors"
                      title="Eliminar de amigos"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Estadísticas del Amigo */}
                  <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                    <div className="border border-black p-1.5 bg-neutral-50">
                      <Flame className="w-3.5 h-3.5 mx-auto mb-0.5 text-black stroke-[2.5]" />
                      <div className="text-xs font-bold font-display">{f.streak}</div>
                      <div className="text-[8px] font-mono text-neutral-500 uppercase">Racha</div>
                    </div>

                    <div className="border border-black p-1.5 bg-neutral-50">
                      <Trophy className="w-3.5 h-3.5 mx-auto mb-0.5 text-black stroke-[2]" />
                      <div className="text-xs font-bold font-display">{f.xp}</div>
                      <div className="text-[8px] font-mono text-neutral-500 uppercase">XP</div>
                    </div>

                    <div className="border border-black p-1.5 bg-neutral-50">
                      <Award className="w-3.5 h-3.5 mx-auto mb-0.5 text-black stroke-[2]" />
                      <div className="text-xs font-bold font-display">{f.completedCount}</div>
                      <div className="text-[8px] font-mono text-neutral-500 uppercase">Cubos</div>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-neutral-100 flex items-center justify-between text-[10px] font-mono text-neutral-400">
                  <span>Precisión media: {f.accuracyAverage}%</span>
                  {f.lastActive && <span>Activo: {f.lastActive.split('T')[0]}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
