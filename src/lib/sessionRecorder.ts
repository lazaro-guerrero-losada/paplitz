import { copyReportToClipboard } from './debugReport';

export interface SessionRecordItem {
  id: string;
  timestamp: string;
  displayTime: string;
  type: 'calisthenics' | 'cube';
  nodeCode: string;
  nodeTitle: string;
  seed: number;
  score: number;
  passed: boolean;
  phase?: number;
  userComment: string;
  metricsSummary?: string;
  reportMarkdown: string;
  reportJsonString?: string;
}

const STORAGE_KEY_RECORDS = 'paplitz_session_records';

/**
 * Carga el registro de ejercicios de la sesión desde localStorage
 */
export function loadSessionRecords(): SessionRecordItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_RECORDS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Error al cargar session records:', err);
    return [];
  }
}

/**
 * Guarda el registro de ejercicios de la sesión en localStorage
 */
export function saveSessionRecords(records: SessionRecordItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(records));
  } catch (err) {
    console.error('Error al guardar session records:', err);
  }
}

/**
 * Añade un nuevo ejercicio al registro de la sesión (máximo 100 ejercicios recientes)
 */
export function addSessionRecord(
  newRecord: SessionRecordItem,
  currentRecords: SessionRecordItem[]
): SessionRecordItem[] {
  const updated = [newRecord, ...currentRecords].slice(0, 100);
  saveSessionRecords(updated);
  return updated;
}

/**
 * Actualiza el comentario de un ejercicio específico en el registro
 */
export function updateSessionRecordComment(
  recordId: string,
  comment: string,
  currentRecords: SessionRecordItem[]
): SessionRecordItem[] {
  const updated = currentRecords.map((item) => {
    if (item.id !== recordId) return item;

    // Actualizar también la nota en el cuerpo del markdown si está presente
    let updatedMarkdown = item.reportMarkdown;
    const trimmedComment = comment.trim();

    // Eliminar nota anterior si existía en el encabezado
    updatedMarkdown = updatedMarkdown.replace(/^### NOTA DEL USUARIO:\n> .*?\n\n/s, '');
    if (trimmedComment) {
      updatedMarkdown = `### NOTA DEL USUARIO:\n> ${trimmedComment}\n\n${updatedMarkdown}`;
    }

    return {
      ...item,
      userComment: trimmedComment,
      reportMarkdown: updatedMarkdown,
    };
  });

  saveSessionRecords(updated);
  return updated;
}

/**
 * Elimina un ejercicio específico del registro
 */
export function deleteSessionRecord(
  recordId: string,
  currentRecords: SessionRecordItem[]
): SessionRecordItem[] {
  const updated = currentRecords.filter((item) => item.id !== recordId);
  saveSessionRecords(updated);
  return updated;
}

/**
 * Vacía por completo el registro de la sesión
 */
export function clearSessionRecords(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_RECORDS);
  } catch (err) {
    console.error('Error al vaciar session records:', err);
  }
}

/**
 * Genera un reporte Markdown consolidado y estructurado con todos los ejercicios y comentarios
 */
export function generateConsolidatedMarkdown(records: SessionRecordItem[]): string {
  if (records.length === 0) {
    return '# REPORTE DE SESIÓN PAPLITZ\n\nNo hay ejercicios registrados en esta sesión.';
  }

  const dateStr = new Date().toLocaleString('es-ES', {
    dateStyle: 'full',
    timeStyle: 'medium',
  });

  const totalExercises = records.length;
  const avgScore = Math.round(records.reduce((sum, r) => sum + r.score, 0) / totalExercises);
  const passedCount = records.filter((r) => r.passed).length;
  const commentedCount = records.filter((r) => r.userComment && r.userComment.trim().length > 0).length;

  const lines: string[] = [];

  lines.push(`# 📋 REPORTE CONSOLIDADO DE SESIÓN PAPLITZ`);
  lines.push(`**Fecha y hora:** ${dateStr}`);
  lines.push(`**Total de ejercicios realizados:** ${totalExercises}`);
  lines.push(`**Puntuación media de la sesión:** ${avgScore}%`);
  lines.push(`**Superados con éxito:** ${passedCount} de ${totalExercises} (${Math.round((passedCount / totalExercises) * 100)}%)`);
  lines.push(`**Ejercicios con comentarios del usuario:** ${commentedCount}`);
  lines.push('');
  lines.push('---');
  lines.push('## 📊 Tabla Resumen de Ejercicios');
  lines.push('');
  lines.push('| # | Hora | Tipo | Nivel | Nota | Estado | Comentario del Usuario |');
  lines.push('|---|---|---|---|---|---|---|');

  // Orden cronológico para la tabla (del primero realizado al último)
  const chronological = [...records].reverse();
  chronological.forEach((r, idx) => {
    const statusIcon = r.passed ? '✅ Aprobado' : '❌ A mejorar';
    const commentCell = r.userComment ? `"${r.userComment.replace(/\|/g, '\\|')}"` : '—';
    const typeLabel = r.type === 'calisthenics' ? 'Trazo' : 'Cubo 3D';
    lines.push(
      `| ${idx + 1} | ${r.displayTime} | ${typeLabel} | ${r.nodeCode} | **${r.score}%** | ${statusIcon} | ${commentCell} |`
    );
  });

  lines.push('');
  lines.push('---');
  lines.push('## 📝 Detalle y Diagnóstico Individual de Cada Ejercicio');
  lines.push('');

  chronological.forEach((r, idx) => {
    lines.push(`### Ejercicio #${idx + 1} — [${r.nodeCode}] ${r.nodeTitle} (Semilla #${r.seed})`);
    lines.push(`- **Hora:** ${r.displayTime}`);
    lines.push(`- **Puntuación:** ${r.score}% (${r.passed ? 'Superado' : 'No superado'})`);
    if (r.phase) {
      lines.push(`- **Fase:** Fase ${r.phase}`);
    }
    if (r.metricsSummary) {
      lines.push(`- **Métricas:** ${r.metricsSummary}`);
    }
    if (r.userComment) {
      lines.push(`- **Comentario del Usuario:**`);
      lines.push(`  > 💬 **"${r.userComment}"**`);
    } else {
      lines.push(`- **Comentario del Usuario:** *Sin notas adicionales*`);
    }
    lines.push('');
    lines.push('#### Informe Técnico de Depuración:');
    lines.push('```text');
    lines.push(r.reportMarkdown.trim());
    lines.push('```');
    lines.push('');
    lines.push('---');
  });

  return lines.join('\n');
}

/**
 * Genera el JSON consolidado con todos los datos y comentarios
 */
export function generateConsolidatedJson(records: SessionRecordItem[]): string {
  const exportData = {
    exportedAt: new Date().toISOString(),
    sessionSummary: {
      totalExercises: records.length,
      averageScore: records.length > 0 ? Math.round(records.reduce((sum, r) => sum + r.score, 0) / records.length) : 0,
      passedCount: records.filter((r) => r.passed).length,
      commentedCount: records.filter((r) => r.userComment && r.userComment.trim().length > 0).length,
    },
    exercises: [...records].reverse().map((r, idx) => ({
      index: idx + 1,
      id: r.id,
      timestamp: r.timestamp,
      displayTime: r.displayTime,
      type: r.type,
      nodeCode: r.nodeCode,
      nodeTitle: r.nodeTitle,
      seed: r.seed,
      score: r.score,
      passed: r.passed,
      phase: r.phase,
      userComment: r.userComment,
      metricsSummary: r.metricsSummary,
      technicalReport: r.reportMarkdown,
    })),
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * Descarga el informe JSON consolidado
 */
export function downloadConsolidatedJson(records: SessionRecordItem[]): void {
  const jsonStr = generateConsolidatedJson(records);
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  const filename = `paplitz_record_session_${dateStr}.json`;

  try {
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Error al descargar JSON consolidado:', err);
  }
}

/**
 * Copia el informe Markdown consolidado al portapapeles
 */
export async function copyConsolidatedMarkdown(records: SessionRecordItem[]): Promise<boolean> {
  const markdown = generateConsolidatedMarkdown(records);
  return copyReportToClipboard(markdown);
}
