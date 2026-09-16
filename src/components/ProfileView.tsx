import React, { useState } from 'react';
import {
  Flame,
  Trophy,
  RotateCcw,
  Award,
  CheckCircle,
  BarChart2,
  BookOpen,
  Unlock,
  Lock,
  Sparkles,
  ExternalLink,
  Save,
  HardDrive,
  Download,
  Upload,
  Copy,
  FileText,
  Cloud,
  CloudUpload,
  CloudDownload,
  AlertTriangle,
  School,
  Users,
  Key,
  Trash2,
  FastForward,
} from 'lucide-react';
import { calculatePlayerLevel } from '../lib/levelSystem';
import { Avatar } from '@bible-strong/avatar-react';
import type { AvatarDefinition } from '@bible-strong/avatar-core';
import cubeeDefinitionRaw from '../lib/cubee.avatar.json';
import { Unit } from '../lib/curriculumData';
import {
  PaplitzSaveData,
  buildCurrentSaveData,
  downloadSaveFile,
  copySaveToClipboard,
  parseSaveFromString,
} from '../lib/saveSystem';
import {
  getSupabaseConfig,
  saveProgressToCloud,
  loadProgressFromCloud,
  recoverProgressWithKey,
  deleteCloudAccount,
} from '../lib/cloudSync';
import { ClassroomSection } from './profile/ClassroomSection';
import { FriendsSection } from './profile/FriendsSection';

function GithubIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

const cubeeDefinition = cubeeDefinitionRaw as unknown as AvatarDefinition;

interface ProfileViewProps {
  units: Unit[];
  scoresHistory: number[];
  streak: number;
  xp: number;
  completedNodesCount: number;
  totalNodesCount: number;
  accuracyAverage: number;
  areAllNodesUnlocked: boolean;
  onUnlockAllNodes: () => void;
  onLockAllNodes?: () => void;
  onResetProgress: () => void;
  onOpenGuide?: () => void;
  onRestoreSave: (data: PaplitzSaveData) => void;
  onOpenPlacementModal?: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  units,
  scoresHistory,
  streak,
  xp,
  completedNodesCount,
  totalNodesCount,
  accuracyAverage,
  areAllNodesUnlocked,
  onUnlockAllNodes,
  onLockAllNodes,
  onResetProgress,
  onOpenGuide,
  onRestoreSave,
  onOpenPlacementModal,
}) => {
  const levelInfo = calculatePlayerLevel(xp);
  const [testAnimation, setTestAnimation] = useState<string>('celebrate');

  // Sub-pestaña activa en Perfil: 'progress' | 'classroom' | 'friends' | 'settings'
  const [subTab, setSubTab] = useState<'progress' | 'classroom' | 'friends' | 'settings'>('progress');

  // Estados para Copia de Seguridad y Sincronización
  const [copied, setCopied] = useState(false);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pastedText, setPastedText] = useState('');
  const [saveStatusMessage, setSaveStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Estados para Supabase Cloud
  const cloudConfig = getSupabaseConfig();
  const [cloudAlias, setCloudAlias] = useState<string>(() => localStorage.getItem('paplitz_cloud_alias') || '');
  const [cloudPin, setCloudPin] = useState<string>('');
  const [cloudLoading, setCloudLoading] = useState<boolean>(false);
  const [cloudMessage, setCloudMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Clave de recuperación activa
  const [activeRecoveryKey, setActiveRecoveryKey] = useState<string | null>(() => {
    const alias = localStorage.getItem('paplitz_cloud_alias') || '';
    return alias ? localStorage.getItem(`paplitz_recovery_${alias}`) : null;
  });
  const [keyCopied, setKeyCopied] = useState(false);

  // Estados modal de Recuperación con Clave
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [recoveryAlias, setRecoveryAlias] = useState('');
  const [recoveryKeyInput, setRecoveryKeyInput] = useState('');
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoveryMessage, setRecoveryMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Estados modal de Eliminar Cuenta Vieja
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteAlias, setDeleteAlias] = useState('');
  const [deletePinOrKey, setDeletePinOrKey] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 1. Descargar archivo de guardado local
  const handleDownloadSave = () => {
    const saveData = buildCurrentSaveData(units, streak, xp, scoresHistory);
    downloadSaveFile(saveData);
    setSaveStatusMessage({ type: 'success', text: '¡Archivo descargado correctamente!' });
    setTimeout(() => setSaveStatusMessage(null), 4000);
  };

  // 2. Copiar código de guardado al portapapeles
  const handleCopySave = async () => {
    const saveData = buildCurrentSaveData(units, streak, xp, scoresHistory);
    const ok = await copySaveToClipboard(saveData);
    if (ok) {
      setCopied(true);
      setSaveStatusMessage({ type: 'success', text: '¡Código de guardado copiado al portapapeles!' });
      setTimeout(() => setCopied(false), 3000);
      setTimeout(() => setSaveStatusMessage(null), 4000);
    } else {
      setSaveStatusMessage({ type: 'error', text: 'No se pudo acceder al portapapeles.' });
    }
  };

  // 3. Subir archivo local .json
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const parseResult = parseSaveFromString(content);
      if (parseResult.valid && parseResult.data) {
        onRestoreSave(parseResult.data);
        setSaveStatusMessage({ type: 'success', text: '¡Partida restaurada con éxito desde el archivo!' });
      } else {
        setSaveStatusMessage({ type: 'error', text: parseResult.error || 'Archivo de guardado corrupto o no compatible.' });
      }
      setTimeout(() => setSaveStatusMessage(null), 5000);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // 4. Aplicar código pegado
  const handleApplyPastedCode = () => {
    if (!pastedText.trim()) return;
    const parseResult = parseSaveFromString(pastedText);
    if (parseResult.valid && parseResult.data) {
      onRestoreSave(parseResult.data);
      setShowPasteModal(false);
      setPastedText('');
      setSaveStatusMessage({ type: 'success', text: '¡Partida restaurada con éxito desde el código!' });
    } else {
      setSaveStatusMessage({ type: 'error', text: parseResult.error || 'El texto no es un código válido de Paplitz.' });
    }
    setTimeout(() => setSaveStatusMessage(null), 5000);
  };

  // 5. Guardar en la nube (Supabase)
  const handleSaveToCloud = async () => {
    if (!cloudAlias.trim() || !cloudPin.trim()) return;
    setCloudLoading(true);
    setCloudMessage(null);

    const saveData = buildCurrentSaveData(units, streak, xp, scoresHistory);
    const result = await saveProgressToCloud(cloudAlias, cloudPin, saveData);
    setCloudLoading(false);

    if (result.success) {
      if (result.recoveryKey) {
        setActiveRecoveryKey(result.recoveryKey);
      } else {
        const stored = localStorage.getItem(`paplitz_recovery_${cloudAlias.trim().toLowerCase()}`);
        if (stored) setActiveRecoveryKey(stored);
      }
      setCloudMessage({ type: 'success', text: `¡Progreso guardado en la nube para "${cloudAlias.toLowerCase()}"!` });
    } else {
      setCloudMessage({ type: 'error', text: result.error || 'Error al guardar en la nube.' });
    }
  };

  // 6. Cargar de la nube (Supabase)
  const handleLoadFromCloud = async () => {
    if (!cloudAlias.trim() || !cloudPin.trim()) return;
    setCloudLoading(true);
    setCloudMessage(null);

    const result = await loadProgressFromCloud(cloudAlias, cloudPin);
    setCloudLoading(false);

    if (result.success && result.data) {
      onRestoreSave(result.data);
      if (result.recoveryKey) {
        setActiveRecoveryKey(result.recoveryKey);
      } else {
        const stored = localStorage.getItem(`paplitz_recovery_${cloudAlias.trim().toLowerCase()}`);
        if (stored) setActiveRecoveryKey(stored);
      }
      setCloudMessage({ type: 'success', text: `¡Partida de "${cloudAlias.toLowerCase()}" descargada y restaurada con éxito!` });
    } else {
      setCloudMessage({ type: 'error', text: result.error || 'No se pudo cargar la partida.' });
    }
  };

  // 7. Recuperar partida mediante Clave de Emergencia
  const handleExecuteRecovery = async () => {
    if (!recoveryAlias.trim() || !recoveryKeyInput.trim()) return;
    setRecoveryLoading(true);
    setRecoveryMessage(null);

    const res = await recoverProgressWithKey(recoveryAlias, recoveryKeyInput);
    setRecoveryLoading(false);

    if (res.success && res.data) {
      downloadSaveFile(res.data, `paplitz_recuperado_${recoveryAlias.trim().toLowerCase()}.json`);
      onRestoreSave(res.data);
      setRecoveryMessage({
        type: 'success',
        text: `¡Cuenta "${recoveryAlias}" recuperada! Se ha descargado tu archivo .json y cargado tu progreso. Ahora puedes crear un nuevo usuario con PIN fresco si lo deseas.`,
      });
      setTimeout(() => {
        setShowRecoveryModal(false);
        setRecoveryMessage(null);
      }, 4500);
    } else {
      setRecoveryMessage({
        type: 'error',
        text: res.error || 'No se pudo recuperar la partida con esa clave.',
      });
    }
  };

  // 8. Eliminar cuenta antigua para liberar espacio
  const handleExecuteDelete = async () => {
    if (!deleteAlias.trim() || !deletePinOrKey.trim()) return;
    setDeleteLoading(true);
    setDeleteMessage(null);

    const res = await deleteCloudAccount(deleteAlias, deletePinOrKey);
    setDeleteLoading(false);

    if (res.success) {
      const normalized = deleteAlias.trim().toLowerCase();
      if (cloudAlias.toLowerCase() === normalized) {
        setCloudAlias('');
        setCloudPin('');
        setActiveRecoveryKey(null);
        localStorage.removeItem('paplitz_cloud_alias');
        localStorage.removeItem(`paplitz_recovery_${normalized}`);
      }
      setDeleteMessage({
        type: 'success',
        text: `La cuenta "${normalized}" ha sido eliminada permanentemente de la nube. El espacio ha sido liberado.`,
      });
      setTimeout(() => {
        setShowDeleteModal(false);
        setDeleteMessage(null);
      }, 3500);
    } else {
      setDeleteMessage({
        type: 'error',
        text: res.error || 'Error al eliminar la cuenta.',
      });
    }
  };

  return (
    <div className="max-w-3xl w-full mx-auto py-6 sm:py-8 px-4">
      {/* Título de Perfil */}
      <div className="flex items-center justify-between border-b-2 border-black pb-4 mb-5">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest bg-black text-white px-2 py-0.5 font-bold">
            CUADERNO DE DIBUJANTE
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold font-display mt-1">Mi Perfil & Comunidad</h2>
        </div>
        <div className="w-11 h-11 sm:w-12 sm:h-12 border-2 border-black pattern-dots-dense flex items-center justify-center">
          <Award className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2]" />
        </div>
      </div>

      {/* SUB-PESTAÑAS DE NAVEGACIÓN (INK STYLE) */}
      <div className="flex items-center gap-1 border-2 border-black p-1 bg-white shadow-[2px_2px_0px_#000000] mb-6 overflow-x-auto">
        <button
          onClick={() => setSubTab('progress')}
          className={`px-3 py-1.5 text-xs font-mono uppercase font-bold flex items-center gap-1.5 cursor-pointer transition-colors shrink-0 ${
            subTab === 'progress' ? 'bg-black text-white' : 'hover:bg-neutral-100 text-black'
          }`}
        >
          <Award className="w-3.5 h-3.5" />
          <span>Mi Progreso</span>
        </button>

        <button
          onClick={() => setSubTab('classroom')}
          className={`px-3 py-1.5 text-xs font-mono uppercase font-bold flex items-center gap-1.5 cursor-pointer transition-colors shrink-0 ${
            subTab === 'classroom' ? 'bg-black text-white' : 'hover:bg-neutral-100 text-black'
          }`}
        >
          <School className="w-3.5 h-3.5" />
          <span>Aulas & Clases</span>
        </button>

        <button
          onClick={() => setSubTab('friends')}
          className={`px-3 py-1.5 text-xs font-mono uppercase font-bold flex items-center gap-1.5 cursor-pointer transition-colors shrink-0 ${
            subTab === 'friends' ? 'bg-black text-white' : 'hover:bg-neutral-100 text-black'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Amigos</span>
        </button>

        <button
          onClick={() => setSubTab('settings')}
          className={`px-3 py-1.5 text-xs font-mono uppercase font-bold flex items-center gap-1.5 cursor-pointer transition-colors shrink-0 ${
            subTab === 'settings' ? 'bg-black text-white' : 'hover:bg-neutral-100 text-black'
          }`}
        >
          <Save className="w-3.5 h-3.5" />
          <span>Guardado & Nube</span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* 1. SUB-PESTAÑA: MI PROGRESO */}
      {/* ========================================================= */}
      {subTab === 'progress' && (
        <div className="space-y-6">
          {/* Tarjeta de Rango & Nivel de Dibujante */}
          <div className="border-2 border-black p-4 bg-white shadow-[3px_3px_0px_#000000]">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2 font-mono">
              <div className="flex items-center gap-2">
                <span className="text-xs bg-black text-white px-2 py-0.5 font-bold">
                  NIVEL {levelInfo.level}
                </span>
                <span className="font-bold text-sm">{levelInfo.title}</span>
              </div>
              {onOpenGuide && (
                <button
                  onClick={onOpenGuide}
                  className="btn-ink-outline px-2.5 py-1 text-xs font-mono font-bold flex items-center gap-1 cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Guía de Niveles</span>
                </button>
              )}
            </div>

            {/* Barra de progreso de XP */}
            <div className="w-full h-3 border-2 border-black bg-neutral-100 overflow-hidden relative mb-1.5">
              <div
                className="h-full bg-black transition-all duration-300"
                style={{ width: `${levelInfo.progressPercent}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-[10px] font-mono text-neutral-500">
              <span>
                {levelInfo.xpInCurrentLevel} / {levelInfo.xpNeededForCurrentLevel} XP ({levelInfo.progressPercent}%)
              </span>
              {levelInfo.xpRemaining > 0 ? (
                <span>Faltan {levelInfo.xpRemaining} XP para Nivel {levelInfo.level + 1}</span>
              ) : (
                <span className="font-bold text-black">¡Nivel Máximo de Maestro!</span>
              )}
            </div>
          </div>

          {/* Tarjetas de Estadísticas Principales */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {/* Racha */}
            <div className="card-ink p-4 text-center bg-white">
              <Flame className="w-6 h-6 mx-auto mb-1 text-black stroke-[2.5]" />
              <div className="text-2xl font-bold font-display">{streak}</div>
              <div className="text-[10px] font-mono uppercase text-neutral-500">Días de Racha</div>
            </div>

            {/* XP Total */}
            <div className="card-ink p-4 text-center bg-white">
              <Trophy className="w-6 h-6 mx-auto mb-1 text-black stroke-[2]" />
              <div className="text-2xl font-bold font-display">{xp}</div>
              <div className="text-[10px] font-mono uppercase text-neutral-500">XP Acumulado</div>
            </div>

            {/* Ejercicios Completados */}
            <div className="card-ink p-4 text-center bg-white">
              <CheckCircle className="w-6 h-6 mx-auto mb-1 text-black stroke-[2]" />
              <div className="text-2xl font-bold font-display">
                {completedNodesCount} / {totalNodesCount}
              </div>
              <div className="text-[10px] font-mono uppercase text-neutral-500">Niveles Superados</div>
            </div>

            {/* Precisión Media */}
            <div className="card-ink p-4 text-center bg-white">
              <BarChart2 className="w-6 h-6 mx-auto mb-1 text-black stroke-[2]" />
              <div className="text-2xl font-bold font-display">{accuracyAverage}%</div>
              <div className="text-[10px] font-mono uppercase text-neutral-500">Precisión Media</div>
            </div>
          </div>

          {/* Sección Didáctica: Consejos Personalizados de Koos Eissen */}
          <div className="card-ink p-5 sm:p-6 bg-white">
            <h3 className="text-base sm:text-lg font-bold font-display mb-3">Consejos para tu Memoria Muscular</h3>
            <ul className="space-y-3">
              <li className="text-xs font-sans p-3 border border-black bg-neutral-50 flex items-start gap-2">
                <span className="font-mono font-bold text-sm">01</span>
                <span>
                  <strong>Técnica de Ghosting:</strong> Antes de apoyar la punta del lápiz o stylus, haz 2 pasadas rápidas en el aire siguiendo la trayectoria de la arista.
                </span>
              </li>
              <li className="text-xs font-sans p-3 border border-black bg-neutral-50 flex items-start gap-2">
                <span className="font-mono font-bold text-sm">02</span>
                <span>
                  <strong>Dibuja con el Codo y Hombro:</strong> Bloquea la muñeca para trazos largos de perspectiva. La muñeca solo sirve para detalles diminutos.
                </span>
              </li>
              <li className="text-xs font-sans p-3 border border-black bg-neutral-50 flex items-start gap-2">
                <span className="font-mono font-bold text-sm">03</span>
                <span>
                  <strong>Ejes de Perspectiva (X, Y, Z):</strong> La arista frontal más cercana es tu ancla (Eje Z). Las demás líneas deben converger hacia sus respectivos puntos de fuga en el horizonte sin abrirse en abanico.
                </span>
              </li>
            </ul>
          </div>

          {/* SECCIÓN DEL AVATAR COMPAÑERO: CUBITO */}
          <div className="card-ink p-5 sm:p-6 bg-white border-2 border-black shadow-[3px_3px_0px_#000000]">
            <div className="flex items-center justify-between border-b-2 border-black pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 stroke-[2.5]" />
                <h3 className="text-lg sm:text-xl font-bold font-display">Compañero de Dibujo: Cubito</h3>
              </div>
              <span className="text-[10px] font-mono bg-black text-white px-2 py-0.5 font-bold">
                PROBADOR DE EMOCIONES
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-5 sm:gap-6">
              {/* Vista previa de Cubito */}
              <div className="w-32 h-32 sm:w-36 sm:h-36 border-2 border-black bg-neutral-900 flex items-center justify-center relative shadow-[3px_3px_0px_#000000] overflow-hidden p-1 shrink-0">
                <Avatar
                  definition={cubeeDefinition}
                  animation={testAnimation}
                  size={125}
                />
                <div className="absolute bottom-1 right-2 text-[9px] font-mono font-bold bg-black text-white px-1 border border-white">
                  {testAnimation}
                </div>
              </div>

              {/* Selector interactivo de animaciones */}
              <div className="flex-1 w-full">
                <span className="text-xs font-mono font-bold block mb-2 text-neutral-800">
                  Probar animaciones nativas del motor (Cubo y ojos orgánicos):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: 'idle', label: 'Idle' },
                    { id: 'celebrate', label: '★ Aprobado' },
                    { id: 'sad', label: '🌀 Suspenso' },
                    { id: 'working', label: 'Concentrado' },
                    { id: 'excited', label: '⚡ Rápido' },
                    { id: 'happy', label: 'Feliz' },
                    { id: 'sleeping', label: '💤 Dormido' },
                    { id: 'waking', label: 'Despertar' },
                    { id: 'surprised', label: 'Sorpresa' },
                    { id: 'playful', label: 'Juguetón' },
                    { id: 'thinking', label: 'Pensativo' },
                    { id: 'curious', label: 'Curioso' },
                    { id: 'angry', label: 'Angry' },
                    { id: 'scared', label: 'Miedo' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setTestAnimation(m.id)}
                      className={`text-xs font-mono px-2 py-1 border border-black cursor-pointer transition-all ${
                        testAnimation === m.id
                          ? 'bg-black text-white font-bold shadow-[1px_1px_0px_#000000]'
                          : 'bg-white hover:bg-neutral-100 text-black'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. SUB-PESTAÑA: AULAS & CLASES DIDÁCTICAS */}
      {/* ========================================================= */}
      {subTab === 'classroom' && (
        <ClassroomSection currentAlias={cloudAlias} />
      )}

      {/* ========================================================= */}
      {/* 3. SUB-PESTAÑA: AMIGOS */}
      {/* ========================================================= */}
      {subTab === 'friends' && (
        <FriendsSection currentAlias={cloudAlias} />
      )}

      {/* ========================================================= */}
      {/* 4. SUB-PESTAÑA: GUARDADO, NUBE & AJUSTES */}
      {/* ========================================================= */}
      {subTab === 'settings' && (
        <div className="space-y-6">
          {/* SECCIÓN: GESTIÓN DE PROGRESO & COPIAS DE SEGURIDAD (LOCAL Y NUBE) */}
          <div className="border-2 border-black p-5 bg-white shadow-[3px_3px_0px_#000000]">
            <div className="flex items-center justify-between border-b-2 border-black pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Save className="w-5 h-5 stroke-[2.5]" />
                <h3 className="text-lg font-bold font-display">Guardado de Progreso & Sincronización</h3>
              </div>
              <span className="text-[10px] font-mono uppercase bg-black text-white px-2 py-0.5 font-bold">
                PORTABILIDAD
              </span>
            </div>

            <p className="text-xs text-neutral-600 font-sans mb-5 leading-relaxed">
              Tu progreso se guarda automáticamente en este navegador. Para jugar en otro dispositivo (PC, tablet o móvil), o conservar tu partida si limpias el navegador, puedes usar una copia local en archivo o sincronizar con tu Alias en la nube.
            </p>

            {/* Notificaciones globales de guardado */}
            {saveStatusMessage && (
              <div
                className={`p-3 border-2 mb-4 text-xs font-mono font-bold flex items-center gap-2 ${
                  saveStatusMessage.type === 'success'
                    ? 'bg-neutral-100 border-black text-black'
                    : 'bg-red-50 border-red-500 text-red-700'
                }`}
              >
                {saveStatusMessage.type === 'success' ? (
                  <CheckCircle className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                )}
                <span>{saveStatusMessage.text}</span>
              </div>
            )}

            {/* 1. COPIA LOCAL (ARCHIVOS / PORTAPAPELES) */}
            <div className="border border-black p-4 bg-neutral-50 mb-5">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 font-mono font-bold text-xs">
                  <HardDrive className="w-4 h-4" />
                  <span>Copia Local (100% Privado y Offline)</span>
                </div>
                <span className="text-[9px] font-mono text-neutral-500 uppercase bg-neutral-200 px-1 py-0.5">
                  Sin servidor
                </span>
              </div>

              <p className="text-[11px] text-neutral-600 font-sans mb-3">
                Descarga tu partida en un archivo <code>.json</code> o copia el código para restaurarla en el .exe de Windows, en la app de Android o en otro navegador.
              </p>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleDownloadSave}
                  className="btn-ink px-3 py-1.5 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_#000000] hover:scale-[1.01] transition-transform"
                  title="Descargar archivo paplitz_progreso.json"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Descargar .json</span>
                </button>

                <button
                  onClick={handleCopySave}
                  className="btn-ink-outline px-3 py-1.5 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer hover:bg-neutral-200"
                  title="Copiar código de guardado al portapapeles"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copied ? '¡Copiado!' : 'Copiar Código'}</span>
                </button>

                <label className="btn-ink-outline px-3 py-1.5 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer hover:bg-neutral-200">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Cargar Archivo .json</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                <button
                  onClick={() => setShowPasteModal(true)}
                  className="btn-ink-outline px-3 py-1.5 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer hover:bg-neutral-200"
                  title="Pegar código de guardado en texto"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Pegar Código</span>
                </button>
              </div>
            </div>

            {/* 2. SINCRONIZACIÓN EN LA NUBE (SUPABASE) */}
            <div className="border border-black p-4 bg-neutral-50">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 font-mono font-bold text-xs">
                  <Cloud className="w-4 h-4" />
                  <span>Sincronización en la Nube (Alias + PIN)</span>
                </div>
                {cloudConfig.isConfigured ? (
                  <span className="text-[9px] font-mono text-white bg-black px-1.5 py-0.5 font-bold uppercase flex items-center gap-1">
                    <CheckCircle className="w-2.5 h-2.5" /> Nube Conectada
                  </span>
                ) : (
                  <span className="text-[9px] font-mono text-neutral-600 bg-neutral-200 px-1.5 py-0.5 uppercase" title="Configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY para habilitar">
                    Modo Offline
                  </span>
                )}
              </div>

              <p className="text-[11px] text-neutral-600 font-sans mb-3">
                Sin correos ni contraseñas. Solo introduce tu <strong>Alias</strong> y un <strong>PIN de 4 dígitos</strong> (ej. 1234) para subir tu partida o recuperarla en otro dispositivo.
              </p>

              <div className="flex flex-col sm:flex-row gap-2.5 items-start sm:items-end mb-3">
                <div className="w-full sm:w-48">
                  <label className="block text-[10px] font-mono uppercase font-bold text-neutral-600 mb-1">
                    Alias de Jugador
                  </label>
                  <input
                    type="text"
                    value={cloudAlias}
                    onChange={(e) => setCloudAlias(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                    placeholder="ej: cubito_123"
                    maxLength={24}
                    className="w-full border-2 border-black px-2.5 py-1 text-xs font-mono font-bold bg-white focus:outline-none"
                  />
                </div>

                <div className="w-full sm:w-28">
                  <label className="block text-[10px] font-mono uppercase font-bold text-neutral-600 mb-1">
                    PIN (4 cifras)
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    value={cloudPin}
                    onChange={(e) => setCloudPin(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="••••"
                    className="w-full border-2 border-black px-2.5 py-1 text-xs font-mono font-bold bg-white focus:outline-none tracking-widest text-center"
                  />
                </div>

                <div className="flex gap-2 w-full sm:w-auto">
                  <button
                    disabled={cloudLoading || !cloudAlias.trim() || !cloudPin.trim()}
                    onClick={handleSaveToCloud}
                    className="btn-ink px-3 py-1.5 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_#000000] disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Subir partida actual a la nube"
                  >
                    <CloudUpload className="w-3.5 h-3.5" />
                    <span>{cloudLoading ? 'Guardando...' : 'Subir a Nube'}</span>
                  </button>

                  <button
                    disabled={cloudLoading || !cloudAlias.trim() || !cloudPin.trim()}
                    onClick={handleLoadFromCloud}
                    className="btn-ink-outline px-3 py-1.5 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer hover:bg-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Descargar partida desde la nube"
                  >
                    <CloudDownload className="w-3.5 h-3.5" />
                    <span>{cloudLoading ? 'Cargando...' : 'Cargar de Nube'}</span>
                  </button>
                </div>
              </div>

              {cloudMessage && (
                <div
                  className={`p-2.5 border text-xs font-mono flex items-center gap-2 ${
                    cloudMessage.type === 'success'
                      ? 'bg-neutral-100 border-black text-black font-bold'
                      : 'bg-red-50 border-red-500 text-red-700'
                  }`}
                >
                  {cloudMessage.type === 'success' ? (
                    <CheckCircle className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{cloudMessage.text}</span>
                </div>
              )}

              {/* Clave de Emergencia Activa */}
              {activeRecoveryKey && (
                <div className="mt-3 p-3 border-2 border-dashed border-black bg-neutral-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-mono uppercase bg-black text-white px-1.5 py-0.2 font-bold inline-flex items-center gap-1">
                        <Key className="w-2.5 h-2.5" /> Clave de Emergencia
                      </span>
                      <span className="text-[10px] font-mono text-neutral-500 font-bold">
                        (Guardado en Nube)
                      </span>
                    </div>
                    <p className="text-xs font-mono font-bold mt-1 tracking-wider text-black select-all break-all">
                      {activeRecoveryKey}
                    </p>
                    <p className="text-[10px] text-neutral-500 font-sans">
                      Apunta esta clave. Si olvidas tu PIN, podrás recuperar tu partida completa en un archivo .json.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(activeRecoveryKey);
                      setKeyCopied(true);
                      setTimeout(() => setKeyCopied(false), 2500);
                    }}
                    className="btn-ink-outline px-2.5 py-1 text-xs font-mono font-bold flex items-center gap-1 cursor-pointer shrink-0"
                    title="Copiar Clave de Emergencia"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{keyCopied ? '¡Copiada!' : 'Copiar'}</span>
                  </button>
                </div>
              )}

              {/* Botones de Utilidad de Nube: Recuperar por clave & Eliminar cuenta vieja */}
              <div className="mt-3 pt-3 border-t border-neutral-200 flex flex-wrap items-center justify-between gap-2">
                <button
                  onClick={() => setShowRecoveryModal(true)}
                  className="text-xs font-mono font-bold text-neutral-700 hover:text-black flex items-center gap-1.5 cursor-pointer underline hover:no-underline"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>¿Olvidaste tu PIN? Recuperar por Clave</span>
                </button>

                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="text-xs font-mono text-neutral-500 hover:text-black flex items-center gap-1 cursor-pointer hover:underline"
                  title="Eliminar un usuario antiguo para no saturar el servidor"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Eliminar cuenta vieja en la nube</span>
                </button>
              </div>
            </div>
          </div>

          {/* Tarjeta Saltar a mi Nivel / Convalidar Camino */}
          {onOpenPlacementModal && (
            <div className="border-2 border-black p-5 bg-white shadow-[3px_3px_0px_#000000]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 border-2 border-black bg-black text-white flex items-center justify-center shrink-0 shadow-[2px_2px_0px_#000000]">
                    <FastForward className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-display font-bold text-base">Saltar a mi Nivel / Recuperar Camino</h3>
                      <span className="text-[10px] font-mono uppercase bg-neutral-200 text-black px-1.5 py-0.2 font-bold border border-black">
                        CONVALIDACIÓN
                      </span>
                    </div>
                    <p className="text-xs text-neutral-600 font-sans mt-1">
                      ¿Has cambiado de dispositivo o se borró tu cuenta? Elige directamente hasta qué lección convalidar sin tener que repetir el camino una por una, o haz un examen rápido para certificar tu nivel.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <button
                    onClick={onOpenPlacementModal}
                    className="btn-ink px-4 py-2 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_#000000]"
                    title="Abrir selector de salto de nivel"
                  >
                    <FastForward className="w-3.5 h-3.5" />
                    <span>Saltar Nivel</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Tarjeta Desbloquear Todos los Niveles */}
          <div className="border-2 border-black p-5 bg-white shadow-[3px_3px_0px_#000000]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 border-2 border-black bg-neutral-100 flex items-center justify-center shrink-0 shadow-[2px_2px_0px_#000000]">
                  <Unlock className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display font-bold text-base">Desbloquear Todos los Niveles</h3>
                    {areAllNodesUnlocked && (
                      <span className="text-[10px] font-mono uppercase bg-black text-white px-1.5 py-0.2 font-bold">
                        TODO DESBLOQUEADO
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-600 font-sans mt-1">
                    Desbloquea al instante todas las lecciones del Camino y filtros de minijuegos para comprobar cualquier ejercicio o practicar libremente sin tener que superar cada nivel previo uno por uno.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                {areAllNodesUnlocked ? (
                  <button
                    onClick={onLockAllNodes}
                    className="btn-ink-outline px-3.5 py-2 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer hover:bg-black hover:text-white"
                    title="Restablecer el bloqueo progresivo estándar"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Restablecer Bloqueo</span>
                  </button>
                ) : (
                  <button
                    onClick={onUnlockAllNodes}
                    className="btn-ink px-4 py-2 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_#000000]"
                    title="Desbloquear todas las lecciones y exámenes"
                  >
                    <Unlock className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Desbloquear Todo</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* TARJETA CÓDIGO ABIERTO / GITHUB */}
          <div className="border-2 border-black p-5 bg-neutral-50 shadow-[3px_3px_0px_#000000]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 border-2 border-black bg-black text-white flex items-center justify-center shrink-0 shadow-[2px_2px_0px_#000000]">
                  <GithubIcon className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display font-bold text-base">Proyecto Open Source</h3>
                    <span className="text-[10px] font-mono uppercase bg-black text-white px-1.5 py-0.2 font-bold">
                      MIT LICENSE
                    </span>
                  </div>
                  <p className="text-xs text-neutral-600 font-sans mt-1">
                    Paplitz es un software libre y gratuito. Puedes explorar el código, reportar sugerencias o descargar los ejecutables de escritorio y Android en GitHub.
                  </p>
                </div>
              </div>

              <a
                href="https://github.com/lazaro-guerrero-losada/paplitz"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ink px-4 py-2 text-xs font-mono font-bold flex items-center gap-2 cursor-pointer shrink-0 shadow-[2px_2px_0px_#000000] hover:scale-[1.02] transition-transform"
              >
                <GithubIcon className="w-4 h-4" />
                <span>Ver en GitHub</span>
                <ExternalLink className="w-3 h-3 opacity-70" />
              </a>
            </div>
          </div>

          {/* Zona de peligro: Reiniciar progreso */}
          <div className="border-2 border-dashed border-neutral-400 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <div className="font-display font-bold text-base">Reiniciar Progreso de la Cuenta</div>
              <div className="text-xs text-neutral-500 font-sans">
                Borra las estadísticas, racha, puntos XP y vuelve a bloquear los niveles del camino.
              </div>
            </div>

            <button
              onClick={() => {
                if (window.confirm('¿Seguro que quieres reiniciar todo tu progreso a 0?')) {
                  onResetProgress();
                }
              }}
              className="btn-ink-outline px-4 py-2 text-xs flex items-center gap-1.5 cursor-pointer shrink-0 font-mono hover:bg-black hover:text-white"
            >
              <RotateCcw className="w-4 h-4" />
              Reiniciar Progreso
            </button>
          </div>
        </div>
      )}

      {/* Modal para Pegar Código de Guardado */}
      {showPasteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white border-2 border-black p-6 max-w-lg w-full shadow-[6px_6px_0px_#000000]">
            <h3 className="font-display font-bold text-lg mb-2">Pegar Código de Guardado</h3>
            <p className="text-xs text-neutral-600 mb-3 font-sans">
              Pega a continuación el código JSON de tu partida copiado previamente para restaurar tu progreso:
            </p>
            <textarea
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder='{"appName": "Paplitz", "version": 1, ...}'
              className="w-full h-36 border-2 border-black p-2 font-mono text-[11px] bg-neutral-50 mb-4 focus:outline-none"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowPasteModal(false);
                  setPastedText('');
                }}
                className="btn-ink-outline px-3 py-1.5 text-xs font-mono font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleApplyPastedCode}
                className="btn-ink px-4 py-1.5 text-xs font-mono font-bold cursor-pointer shadow-[2px_2px_0px_#000000]"
              >
                Restaurar Partida
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Recuperar Partida por Clave de Emergencia */}
      {showRecoveryModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white border-3 border-black p-5 sm:p-6 max-w-lg w-full shadow-[6px_6px_0px_#000000]">
            <div className="flex items-center gap-2 border-b-2 border-black pb-2 mb-3">
              <div className="w-7 h-7 bg-black text-white flex items-center justify-center border border-black shrink-0">
                <Key className="w-4 h-4" />
              </div>
              <h3 className="font-display font-bold text-base sm:text-lg uppercase">
                Recuperación por Clave de Emergencia
              </h3>
            </div>

            <p className="text-xs text-neutral-600 mb-3 font-sans leading-relaxed">
              Si has olvidado el PIN de tu cuenta en la nube, introduce tu <strong>Alias</strong> y tu <strong>Clave de Emergencia</strong> (ej. REC-XXXX-XXXX). El sistema descargará tu archivo <code className="bg-neutral-100 px-1 border border-neutral-300">.json</code> de guardado y restaurará tu partida para que puedas jugar y registrar un usuario nuevo si lo deseas.
            </p>

            <div className="flex flex-col gap-2.5 mb-4">
              <div>
                <label className="block text-[10px] font-mono uppercase font-bold text-neutral-600 mb-1">
                  Alias de la cuenta
                </label>
                <input
                  type="text"
                  value={recoveryAlias}
                  onChange={(e) => setRecoveryAlias(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                  placeholder="ej: cubito_123"
                  className="w-full border-2 border-black px-2.5 py-1.5 text-xs font-mono font-bold bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase font-bold text-neutral-600 mb-1">
                  Clave de Emergencia (ej. REC-XXXX-XXXX)
                </label>
                <input
                  type="text"
                  value={recoveryKeyInput}
                  onChange={(e) => setRecoveryKeyInput(e.target.value.toUpperCase())}
                  placeholder="REC-XXXX-XXXX"
                  className="w-full border-2 border-black px-2.5 py-1.5 text-xs font-mono font-bold bg-white focus:outline-none tracking-wider"
                />
              </div>
            </div>

            {recoveryMessage && (
              <div
                className={`p-2.5 border text-xs font-mono mb-4 flex items-center gap-2 ${
                  recoveryMessage.type === 'success'
                    ? 'bg-neutral-100 border-black text-black font-bold'
                    : 'bg-red-50 border-red-500 text-red-700'
                }`}
              >
                {recoveryMessage.type === 'success' ? (
                  <CheckCircle className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                )}
                <span>{recoveryMessage.text}</span>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowRecoveryModal(false);
                  setRecoveryMessage(null);
                }}
                className="btn-ink-outline px-3 py-1.5 text-xs font-mono font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                disabled={recoveryLoading || !recoveryAlias.trim() || !recoveryKeyInput.trim()}
                onClick={handleExecuteRecovery}
                className="btn-ink px-4 py-1.5 text-xs font-mono font-bold cursor-pointer shadow-[2px_2px_0px_#000000] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{recoveryLoading ? 'Recuperando...' : 'Recuperar y Descargar JSON'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Eliminar Cuenta Antigua en la Nube */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white border-3 border-black p-5 sm:p-6 max-w-lg w-full shadow-[6px_6px_0px_#000000]">
            <div className="flex items-center gap-2 border-b-2 border-black pb-2 mb-3">
              <div className="w-7 h-7 bg-black text-white flex items-center justify-center border border-black shrink-0">
                <Trash2 className="w-4 h-4" />
              </div>
              <h3 className="font-display font-bold text-base sm:text-lg uppercase">
                Eliminar Cuenta en la Nube
              </h3>
            </div>

            <p className="text-xs text-neutral-600 mb-3 font-sans leading-relaxed">
              Si ya no usas un usuario antiguo o has migrado a una cuenta nueva, puedes liberarlo para que no ocupe espacio en el servidor de Supabase. Se requiere el PIN de la cuenta o su Clave de Emergencia.
            </p>

            <div className="flex flex-col gap-2.5 mb-4">
              <div>
                <label className="block text-[10px] font-mono uppercase font-bold text-neutral-600 mb-1">
                  Alias a eliminar
                </label>
                <input
                  type="text"
                  value={deleteAlias}
                  onChange={(e) => setDeleteAlias(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                  placeholder="ej: usuario_antiguo"
                  className="w-full border-2 border-black px-2.5 py-1.5 text-xs font-mono font-bold bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase font-bold text-neutral-600 mb-1">
                  PIN (4-6 dígitos) o Clave de Emergencia (REC-XXXX-XXXX)
                </label>
                <input
                  type="text"
                  value={deletePinOrKey}
                  onChange={(e) => setDeletePinOrKey(e.target.value)}
                  placeholder="PIN o Clave"
                  className="w-full border-2 border-black px-2.5 py-1.5 text-xs font-mono font-bold bg-white focus:outline-none"
                />
              </div>
            </div>

            {deleteMessage && (
              <div
                className={`p-2.5 border text-xs font-mono mb-4 flex items-center gap-2 ${
                  deleteMessage.type === 'success'
                    ? 'bg-neutral-100 border-black text-black font-bold'
                    : 'bg-red-50 border-red-500 text-red-700'
                }`}
              >
                {deleteMessage.type === 'success' ? (
                  <CheckCircle className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                )}
                <span>{deleteMessage.text}</span>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteMessage(null);
                }}
                className="btn-ink-outline px-3 py-1.5 text-xs font-mono font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                disabled={deleteLoading || !deleteAlias.trim() || !deletePinOrKey.trim()}
                onClick={handleExecuteDelete}
                className="btn-ink px-4 py-1.5 text-xs font-mono font-bold cursor-pointer shadow-[2px_2px_0px_#000000] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{deleteLoading ? 'Eliminando...' : 'Eliminar de la Nube'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
