import React, { useState, useEffect } from 'react';
import {
  School,
  UserCheck,
  Plus,
  Copy,
  CheckCircle,
  AlertTriangle,
  Users,
  Search,
  Download,
  LogOut,
  RefreshCw,
  Award,
  Flame,
  BarChart2,
} from 'lucide-react';
import {
  ClassData,
  StudentProgressData,
  createClass,
  getTeacherClasses,
  getClassStudentsWithProgress,
  joinClass,
  getStudentClasses,
  leaveClass,
} from '../../lib/socialSync';
import { getSupabaseConfig } from '../../lib/cloudSync';

interface ClassroomSectionProps {
  currentAlias: string;
}

export const ClassroomSection: React.FC<ClassroomSectionProps> = ({ currentAlias }) => {
  const isCloudConfigured = getSupabaseConfig().isConfigured;
  const [role, setRole] = useState<'student' | 'teacher'>('student');

  // Estado Alumno
  const [studentCodeInput, setStudentCodeInput] = useState('');
  const [studentAliasInput, setStudentAliasInput] = useState(currentAlias || '');
  const [studentClasses, setStudentClasses] = useState<ClassData[]>([]);
  const [studentLoading, setStudentLoading] = useState(false);
  const [studentMsg, setStudentMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Estado Profesor
  const [teacherAliasInput, setTeacherAliasInput] = useState(currentAlias || '');
  const [teacherPinInput, setTeacherPinInput] = useState('');
  const [newClassName, setNewClassName] = useState('');
  const [teacherClasses, setTeacherClasses] = useState<ClassData[]>([]);
  const [selectedClass, setSelectedClass] = useState<ClassData | null>(null);
  const [classStudents, setClassStudents] = useState<StudentProgressData[]>([]);
  const [teacherLoading, setTeacherLoading] = useState(false);
  const [teacherMsg, setTeacherMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [studentFilter, setStudentFilter] = useState<'all' | 'needs_help' | 'on_track'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);

  // Cargar clases del alumno
  const loadStudentClasses = async () => {
    if (!studentAliasInput.trim()) return;
    setStudentLoading(true);
    const res = await getStudentClasses(studentAliasInput);
    setStudentLoading(false);
    if (res.success && res.classes) {
      setStudentClasses(res.classes);
    }
  };

  useEffect(() => {
    if (role === 'student' && studentAliasInput.trim()) {
      loadStudentClasses();
    }
  }, [role, studentAliasInput]);

  // Manejar unirse a clase (Alumno)
  const handleJoinClass = async () => {
    if (!studentCodeInput.trim() || !studentAliasInput.trim()) return;
    setStudentLoading(true);
    setStudentMsg(null);

    const res = await joinClass(studentCodeInput, studentAliasInput);
    setStudentLoading(false);

    if (res.success) {
      setStudentMsg({ type: 'success', text: `¡Te has unido con éxito a la clase "${res.classData?.name}"!` });
      setStudentCodeInput('');
      loadStudentClasses();
    } else {
      setStudentMsg({ type: 'error', text: res.error || 'No se pudo unir a la clase.' });
    }
  };

  // Manejar salir de clase (Alumno)
  const handleLeaveClass = async (code: string) => {
    if (!window.confirm('¿Seguro que quieres salir de esta clase?')) return;
    const res = await leaveClass(code, studentAliasInput);
    if (res.success) {
      setStudentClasses((prev) => prev.filter((c) => c.code !== code));
    }
  };

  // Cargar clases del profesor
  const loadTeacherClasses = async () => {
    if (!teacherAliasInput.trim() || !teacherPinInput.trim()) return;
    setTeacherLoading(true);
    setTeacherMsg(null);
    const res = await getTeacherClasses(teacherAliasInput, teacherPinInput);
    setTeacherLoading(false);
    if (res.success && res.classes) {
      setTeacherClasses(res.classes);
      if (res.classes.length > 0 && !selectedClass) {
        setSelectedClass(res.classes[0]);
      }
    } else {
      setTeacherMsg({ type: 'error', text: res.error || 'No se pudieron consultar tus clases.' });
    }
  };

  // Cargar alumnos de la clase seleccionada
  const loadClassStudents = async (cls: ClassData) => {
    if (!teacherPinInput.trim()) return;
    setTeacherLoading(true);
    const res = await getClassStudentsWithProgress(cls.code, teacherPinInput);
    setTeacherLoading(false);
    if (res.success && res.students) {
      setClassStudents(res.students);
    }
  };

  useEffect(() => {
    if (selectedClass && teacherPinInput.trim()) {
      loadClassStudents(selectedClass);
    }
  }, [selectedClass]);

  // Manejar crear clase (Profesor)
  const handleCreateClass = async () => {
    if (!newClassName.trim() || !teacherAliasInput.trim() || !teacherPinInput.trim()) return;
    setTeacherLoading(true);
    setTeacherMsg(null);

    const res = await createClass(newClassName, teacherAliasInput, teacherPinInput);
    setTeacherLoading(false);

    if (res.success && res.classData) {
      setTeacherMsg({
        type: 'success',
        text: `¡Clase creada! Comparte el código "${res.classData.code}" con tus alumnos.`,
      });
      setNewClassName('');
      setTeacherClasses((prev) => [res.classData!, ...prev]);
      setSelectedClass(res.classData);
    } else {
      setTeacherMsg({ type: 'error', text: res.error || 'Error al crear la clase.' });
    }
  };

  // Copiar código de clase
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  // Exportar alumnos a CSV
  const handleExportCSV = () => {
    if (!selectedClass || classStudents.length === 0) return;
    const headers = ['Alias', 'Ejercicios Completados', 'Precision Media (%)', 'Racha (dias)', 'XP', 'Fecha Inscripcion'];
    const rows = classStudents.map((s) => [
      s.alias,
      `${s.completedCount}/${s.totalCount}`,
      `${s.accuracyAverage}%`,
      s.streak,
      s.xp,
      s.joinedAt.split('T')[0],
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `clase_${selectedClass.code}_alumnos.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtrado de alumnos
  const filteredStudents = classStudents.filter((s) => {
    const matchesSearch = s.alias.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (studentFilter === 'needs_help') return s.accuracyAverage < 70 && s.completedCount > 0;
    if (studentFilter === 'on_track') return s.accuracyAverage >= 70;
    return true;
  });

  if (!isCloudConfigured) {
    return (
      <div className="border-2 border-black p-6 bg-white shadow-[3px_3px_0px_#000000] text-center">
        <School className="w-8 h-8 mx-auto mb-2 stroke-[2]" />
        <h3 className="font-display font-bold text-lg">Módulo Didáctico de Aulas</h3>
        <p className="text-xs text-neutral-600 max-w-md mx-auto mt-1 mb-4 font-sans">
          Para utilizar las funciones de clase entre profesores y alumnos es necesario que la sincronización en la nube de Supabase esté configurada.
        </p>
        <span className="text-[10px] font-mono uppercase bg-neutral-100 border border-black px-2 py-1 font-bold">
          Configuración de Nube Requerida
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Selector de Rol: Alumno vs Profesor */}
      <div className="flex border-2 border-black p-1 bg-neutral-100 shadow-[2px_2px_0px_#000000] max-w-sm">
        <button
          onClick={() => setRole('student')}
          className={`flex-1 py-1.5 text-xs font-mono font-bold uppercase flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
            role === 'student' ? 'bg-black text-white' : 'hover:bg-white text-black'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5" />
          <span>Soy Alumno</span>
        </button>
        <button
          onClick={() => setRole('teacher')}
          className={`flex-1 py-1.5 text-xs font-mono font-bold uppercase flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
            role === 'teacher' ? 'bg-black text-white' : 'hover:bg-white text-black'
          }`}
        >
          <School className="w-3.5 h-3.5" />
          <span>Soy Profesor</span>
        </button>
      </div>

      {/* ================= VISTA ALUMNO ================= */}
      {role === 'student' && (
        <div className="border-2 border-black p-5 bg-white shadow-[3px_3px_0px_#000000]">
          <div className="flex items-center justify-between border-b-2 border-black pb-3 mb-4">
            <div>
              <span className="text-[10px] font-mono uppercase bg-black text-white px-2 py-0.5 font-bold">
                PANEL DE ALUMNO
              </span>
              <h3 className="text-xl font-bold font-display mt-1">Mis Clases Didácticas</h3>
            </div>
            <School className="w-6 h-6 stroke-[2]" />
          </div>

          <p className="text-xs text-neutral-600 font-sans mb-4">
            Introduce el código que te ha dado tu profesor (ej: <code>CUB-842</code>) para inscribirte. Tu profesor podrá ver tu cantidad de ejercicios realizados y tu precisión media.
          </p>

          {/* Formulario de Unión a Clase */}
          <div className="border border-black p-4 bg-neutral-50 mb-6">
            <div className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="w-full sm:w-1/2">
                <label className="block text-[10px] font-mono uppercase font-bold text-neutral-600 mb-1">
                  Tu Alias de Jugador
                </label>
                <input
                  type="text"
                  value={studentAliasInput}
                  onChange={(e) => setStudentAliasInput(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                  placeholder="ej: alumno_dibujo"
                  className="w-full border-2 border-black px-2.5 py-1.5 text-xs font-mono font-bold bg-white focus:outline-none"
                />
              </div>

              <div className="w-full sm:w-1/2">
                <label className="block text-[10px] font-mono uppercase font-bold text-neutral-600 mb-1">
                  Código de Clase
                </label>
                <input
                  type="text"
                  value={studentCodeInput}
                  onChange={(e) => setStudentCodeInput(e.target.value.toUpperCase())}
                  placeholder="ej: CUB-842"
                  maxLength={10}
                  className="w-full border-2 border-black px-2.5 py-1.5 text-xs font-mono font-bold bg-white focus:outline-none tracking-wider"
                />
              </div>

              <button
                disabled={studentLoading || !studentCodeInput.trim() || !studentAliasInput.trim()}
                onClick={handleJoinClass}
                className="btn-ink px-4 py-1.5 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_#000000] shrink-0 disabled:opacity-40"
              >
                <Plus className="w-4 h-4" />
                <span>{studentLoading ? 'Uniéndose...' : 'Unirse a Clase'}</span>
              </button>
            </div>

            {studentMsg && (
              <div
                className={`mt-3 p-2.5 border text-xs font-mono flex items-center gap-2 ${
                  studentMsg.type === 'success'
                    ? 'bg-neutral-100 border-black text-black font-bold'
                    : 'bg-red-50 border-red-500 text-red-700'
                }`}
              >
                {studentMsg.type === 'success' ? (
                  <CheckCircle className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                )}
                <span>{studentMsg.text}</span>
              </div>
            )}
          </div>

          {/* Lista de Clases inscritas */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-mono font-bold text-xs uppercase text-neutral-700">
                Clases en las que estás inscrito ({studentClasses.length})
              </h4>
              <button
                onClick={loadStudentClasses}
                className="btn-ink-outline px-2 py-0.5 text-[11px] font-mono flex items-center gap-1 cursor-pointer"
                title="Actualizar lista de clases"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Actualizar</span>
              </button>
            </div>

            {studentClasses.length === 0 ? (
              <div className="border border-dashed border-neutral-300 p-6 text-center text-xs text-neutral-500 font-mono">
                Aún no estás inscrito en ninguna clase. Pídele el código a tu profesor y añádelo arriba.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {studentClasses.map((cls) => (
                  <div
                    key={cls.code}
                    className="border-2 border-black p-3.5 bg-white shadow-[2px_2px_0px_#000000] flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-mono bg-black text-white px-1.5 py-0.2 font-bold tracking-wider">
                          {cls.code}
                        </span>
                        <button
                          onClick={() => handleLeaveClass(cls.code)}
                          className="text-neutral-400 hover:text-black p-1 cursor-pointer"
                          title="Salir de la clase"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <h5 className="font-display font-bold text-sm">{cls.name}</h5>
                      <span className="text-[11px] font-mono text-neutral-500 block mt-0.5">
                        Profesor: @{cls.teacherAlias}
                      </span>
                    </div>

                    <div className="mt-3 pt-2 border-t border-neutral-200 text-[10px] font-mono text-neutral-400">
                      Inscrito: {cls.createdAt.split('T')[0]}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= VISTA PROFESOR ================= */}
      {role === 'teacher' && (
        <div className="border-2 border-black p-5 bg-white shadow-[3px_3px_0px_#000000]">
          <div className="flex items-center justify-between border-b-2 border-black pb-3 mb-4">
            <div>
              <span className="text-[10px] font-mono uppercase bg-black text-white px-2 py-0.5 font-bold">
                PANEL DE PROFESOR
              </span>
              <h3 className="text-xl font-bold font-display mt-1">Supervisión de Aulas & Alumnos</h3>
            </div>
            <School className="w-6 h-6 stroke-[2]" />
          </div>

          {/* Autenticación de Profesor */}
          <div className="border border-black p-4 bg-neutral-50 mb-6">
            <span className="text-xs font-mono font-bold block mb-2 text-neutral-800">
              Identifícate como Profesor (Alias y PIN de tu cuenta):
            </span>
            <div className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="w-full sm:w-1/2">
                <label className="block text-[10px] font-mono uppercase font-bold text-neutral-600 mb-1">
                  Tu Alias de Profesor
                </label>
                <input
                  type="text"
                  value={teacherAliasInput}
                  onChange={(e) => setTeacherAliasInput(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                  placeholder="ej: prof_gonzalez"
                  className="w-full border-2 border-black px-2.5 py-1.5 text-xs font-mono font-bold bg-white focus:outline-none"
                />
              </div>

              <div className="w-full sm:w-28">
                <label className="block text-[10px] font-mono uppercase font-bold text-neutral-600 mb-1">
                  PIN (4 cifras)
                </label>
                <input
                  type="password"
                  maxLength={6}
                  value={teacherPinInput}
                  onChange={(e) => setTeacherPinInput(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="••••"
                  className="w-full border-2 border-black px-2.5 py-1.5 text-xs font-mono font-bold bg-white focus:outline-none tracking-widest text-center"
                />
              </div>

              <button
                disabled={teacherLoading || !teacherAliasInput.trim() || !teacherPinInput.trim()}
                onClick={loadTeacherClasses}
                className="btn-ink px-4 py-1.5 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_#000000] shrink-0 disabled:opacity-40"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${teacherLoading ? 'animate-spin' : ''}`} />
                <span>Cargar mis Clases</span>
              </button>
            </div>

            {teacherMsg && (
              <div
                className={`mt-3 p-2.5 border text-xs font-mono flex items-center gap-2 ${
                  teacherMsg.type === 'success'
                    ? 'bg-neutral-100 border-black text-black font-bold'
                    : 'bg-red-50 border-red-500 text-red-700'
                }`}
              >
                {teacherMsg.type === 'success' ? (
                  <CheckCircle className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                )}
                <span>{teacherMsg.text}</span>
              </div>
            )}
          </div>

          {/* Formulario Crear Nueva Clase */}
          <div className="border border-black p-4 bg-white mb-6">
            <span className="text-xs font-mono font-bold block mb-2 text-neutral-800">
              Crear Nueva Clase:
            </span>
            <div className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="flex-1 w-full">
                <input
                  type="text"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  placeholder="ej: Perspectiva 1º Bachillerato - Grupo A"
                  maxLength={50}
                  className="w-full border-2 border-black px-2.5 py-1.5 text-xs font-mono font-bold bg-white focus:outline-none"
                />
              </div>
              <button
                disabled={teacherLoading || !newClassName.trim() || !teacherAliasInput.trim() || !teacherPinInput.trim()}
                onClick={handleCreateClass}
                className="btn-ink px-4 py-1.5 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_#000000] shrink-0 disabled:opacity-40"
              >
                <Plus className="w-4 h-4" />
                <span>Crear Clase</span>
              </button>
            </div>
          </div>

          {/* Selector de Clases Creadas */}
          {teacherClasses.length > 0 && (
            <div className="mb-6">
              <span className="text-[10px] font-mono uppercase font-bold text-neutral-600 block mb-1.5">
                Selecciona la clase a supervisar:
              </span>
              <div className="flex flex-wrap gap-2">
                {teacherClasses.map((cls) => (
                  <button
                    key={cls.code}
                    onClick={() => setSelectedClass(cls)}
                    className={`px-3 py-1.5 text-xs font-mono font-bold border-2 border-black cursor-pointer transition-all ${
                      selectedClass?.code === cls.code
                        ? 'bg-black text-white shadow-[2px_2px_0px_#000000]'
                        : 'bg-white hover:bg-neutral-100 text-black'
                    }`}
                  >
                    <span>{cls.name}</span>
                    <span className="ml-2 text-[10px] opacity-75 font-normal">({cls.memberCount || 0} alumnos)</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Panel de Control de la Clase Activa */}
          {selectedClass && (
            <div className="border-2 border-black p-4 bg-neutral-50 shadow-[2px_2px_0px_#000000]">
              {/* Banner Código de Clase para Alumnos */}
              <div className="bg-black text-white p-3 mb-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div>
                  <span className="text-[9px] font-mono uppercase tracking-widest text-neutral-400 block">
                    CÓDIGO DE INVITACIÓN PARA ALUMNOS
                  </span>
                  <span className="text-xl font-mono font-bold tracking-widest block">{selectedClass.code}</span>
                </div>
                <button
                  onClick={() => handleCopyCode(selectedClass.code)}
                  className="bg-white text-black px-3 py-1 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer hover:bg-neutral-200"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedCode ? '¡Copiado!' : 'Copiar Código'}</span>
                </button>
              </div>

              {/* Estadísticas Resumen de la Clase */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="card-ink p-3 bg-white text-center">
                  <Users className="w-4 h-4 mx-auto mb-1 text-neutral-700" />
                  <div className="text-xl font-bold font-display">{classStudents.length}</div>
                  <div className="text-[9px] font-mono text-neutral-500 uppercase">Alumnos</div>
                </div>

                <div className="card-ink p-3 bg-white text-center">
                  <BarChart2 className="w-4 h-4 mx-auto mb-1 text-neutral-700" />
                  <div className="text-xl font-bold font-display">
                    {classStudents.length > 0
                      ? Math.round(
                          classStudents.reduce((a, b) => a + b.accuracyAverage, 0) / classStudents.length
                        )
                      : 0}
                    %
                  </div>
                  <div className="text-[9px] font-mono text-neutral-500 uppercase">Media Clase</div>
                </div>

                <div className="card-ink p-3 bg-white text-center">
                  <Award className="w-4 h-4 mx-auto mb-1 text-neutral-700" />
                  <div className="text-xl font-bold font-display">
                    {classStudents.reduce((a, b) => a + b.completedCount, 0)}
                  </div>
                  <div className="text-[9px] font-mono text-neutral-500 uppercase">Cubos Hechos</div>
                </div>
              </div>

              {/* Barra de Filtros y Búsqueda */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-1.5 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-56">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-neutral-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Buscar alumno..."
                      className="w-full pl-8 pr-2.5 py-1 text-xs font-mono border border-black bg-white focus:outline-none"
                    />
                  </div>

                  <select
                    value={studentFilter}
                    onChange={(e) => setStudentFilter(e.target.value as any)}
                    className="border border-black px-2 py-1 text-xs font-mono bg-white cursor-pointer"
                  >
                    <option value="all">Todos los alumnos</option>
                    <option value="needs_help">Requieren apoyo (&lt;70%)</option>
                    <option value="on_track">Buen progreso (≥70%)</option>
                  </select>
                </div>

                <button
                  onClick={handleExportCSV}
                  disabled={classStudents.length === 0}
                  className="btn-ink-outline px-3 py-1 text-xs font-mono font-bold flex items-center gap-1 cursor-pointer shrink-0 disabled:opacity-40"
                  title="Descargar informe de calificaciones en formato CSV"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Exportar CSV</span>
                </button>
              </div>

              {/* Tabla de Alumnos */}
              {filteredStudents.length === 0 ? (
                <div className="border border-dashed border-neutral-300 p-6 text-center text-xs text-neutral-500 font-mono bg-white">
                  {classStudents.length === 0
                    ? 'Aún no hay alumnos inscritos en esta clase. Pásales el código para que se unan.'
                    : 'Ningún alumno coincide con el filtro de búsqueda.'}
                </div>
              ) : (
                <div className="border-2 border-black overflow-x-auto bg-white">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-black text-white uppercase text-[10px]">
                      <tr>
                        <th className="p-2.5">Alumno</th>
                        <th className="p-2.5 text-center">Ejercicios</th>
                        <th className="p-2.5 text-center">Precisión</th>
                        <th className="p-2.5 text-center">Racha</th>
                        <th className="p-2.5 text-center">XP</th>
                        <th className="p-2.5 text-right">Inscrito</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200">
                      {filteredStudents.map((s) => (
                        <tr key={s.alias} className="hover:bg-neutral-50 transition-colors">
                          <td className="p-2.5 font-bold">@{s.alias}</td>
                          <td className="p-2.5 text-center">
                            <span className="font-bold">{s.completedCount}</span>
                            <span className="text-neutral-400">/{s.totalCount}</span>
                          </td>
                          <td className="p-2.5 text-center">
                            <span
                              className={`px-1.5 py-0.5 font-bold border ${
                                s.accuracyAverage >= 80
                                  ? 'bg-black text-white border-black'
                                  : s.accuracyAverage >= 60
                                  ? 'bg-neutral-100 text-black border-black'
                                  : 'bg-white text-neutral-700 border-neutral-300'
                              }`}
                            >
                              {s.accuracyAverage}%
                            </span>
                          </td>
                          <td className="p-2.5 text-center font-bold">
                            {s.streak > 0 ? (
                              <span className="inline-flex items-center gap-0.5">
                                <Flame className="w-3 h-3 text-black stroke-[2.5]" />
                                {s.streak}
                              </span>
                            ) : (
                              <span className="text-neutral-300">0</span>
                            )}
                          </td>
                          <td className="p-2.5 text-center font-mono">{s.xp}</td>
                          <td className="p-2.5 text-right text-neutral-400 text-[10px]">
                            {s.joinedAt.split('T')[0]}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
