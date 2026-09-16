import { PaplitzSaveData, validateSaveData } from './saveSystem';

/**
 * Obtiene la configuración de Supabase desde las variables de entorno de Vite
 */
export function getSupabaseConfig(): { url: string; anonKey: string; isConfigured: boolean } {
  const url = (import.meta.env.VITE_SUPABASE_URL || '').trim();
  const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();
  return {
    url,
    anonKey,
    isConfigured: Boolean(url && anonKey && url.startsWith('http')),
  };
}

/**
 * Genera un hash criptográfico SHA-256 para el PIN utilizando la Web Crypto API nativa
 */
async function hashPin(pin: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(`paplitz-salt-v1:${pin.trim()}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Valida el formato del alias y del PIN
 */
export function validateCredentialsFormat(alias: string, pin: string): { valid: boolean; error?: string } {
  const cleanAlias = alias.trim();
  if (cleanAlias.length < 3 || cleanAlias.length > 24) {
    return { valid: false, error: 'El nombre de usuario debe tener entre 3 y 24 caracteres.' };
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(cleanAlias)) {
    return { valid: false, error: 'El nombre de usuario solo puede contener letras, números, guiones y guiones bajos.' };
  }

  const cleanPin = pin.trim();
  if (!/^\d{4,6}$/.test(cleanPin)) {
    return { valid: false, error: 'El PIN debe ser un código de 4 a 6 números (ej. 1234).' };
  }

  return { valid: true };
}

/**
 * Guarda o actualiza el progreso del usuario en la base de datos Supabase
 */
export async function saveProgressToCloud(
  alias: string,
  pin: string,
  saveData: PaplitzSaveData
): Promise<{ success: boolean; error?: string }> {
  const config = getSupabaseConfig();
  if (!config.isConfigured) {
    return {
      success: false,
      error: 'La sincronización en la nube aún no está configurada en este servidor (falta VITE_SUPABASE_URL).',
    };
  }

  const validation = validateCredentialsFormat(alias, pin);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  try {
    const normalizedAlias = alias.trim().toLowerCase();
    const pinHash = await hashPin(pin);

    // 1. Comprobar si ya existe el usuario para verificar el PIN antes de sobrescribir
    const checkUrl = `${config.url}/rest/v1/user_saves?alias=eq.${encodeURIComponent(normalizedAlias)}&select=alias,pin_hash`;
    const checkRes = await fetch(checkUrl, {
      method: 'GET',
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${config.anonKey}`,
      },
    });

    if (checkRes.ok) {
      const existing = await checkRes.json();
      if (Array.isArray(existing) && existing.length > 0) {
        const userRow = existing[0];
        if (userRow.pin_hash && userRow.pin_hash !== pinHash) {
          return {
            success: false,
            error: 'Este nombre de usuario ya está en uso y el PIN no coincide. Usa tu PIN correcto o elige otro alias.',
          };
        }
      }
    }

    // 2. Guardar o actualizar la partida (Upsert)
    const upsertUrl = `${config.url}/rest/v1/user_saves`;
    const upsertRes = await fetch(upsertUrl, {
      method: 'POST',
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${config.anonKey}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify({
        alias: normalizedAlias,
        pin_hash: pinHash,
        save_data: saveData,
        updated_at: new Date().toISOString(),
      }),
    });

    if (!upsertRes.ok) {
      const errText = await upsertRes.text();
      console.error('[CloudSync] Error HTTP en Supabase:', upsertRes.status, errText);
      return {
        success: false,
        error: `Error al guardar en la nube (código ${upsertRes.status}). Comprueba la conexión o permisos.`,
      };
    }

    // Recordar el último alias usado en localStorage para comodidad del usuario
    localStorage.setItem('paplitz_cloud_alias', normalizedAlias);

    return { success: true };
  } catch (err) {
    console.error('[CloudSync] Error de red:', err);
    return {
      success: false,
      error: 'Error de conexión con el servidor. Comprueba tu conexión a internet.',
    };
  }
}

/**
 * Descarga y restaura el progreso del usuario desde la base de datos Supabase
 */
export async function loadProgressFromCloud(
  alias: string,
  pin: string
): Promise<{ success: boolean; data?: PaplitzSaveData; error?: string }> {
  const config = getSupabaseConfig();
  if (!config.isConfigured) {
    return {
      success: false,
      error: 'La sincronización en la nube aún no está configurada en este servidor (falta VITE_SUPABASE_URL).',
    };
  }

  const validation = validateCredentialsFormat(alias, pin);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  try {
    const normalizedAlias = alias.trim().toLowerCase();
    const pinHash = await hashPin(pin);

    const queryUrl = `${config.url}/rest/v1/user_saves?alias=eq.${encodeURIComponent(normalizedAlias)}&select=alias,pin_hash,save_data`;
    const res = await fetch(queryUrl, {
      method: 'GET',
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${config.anonKey}`,
      },
    });

    if (!res.ok) {
      return {
        success: false,
        error: `Error al conectar con la nube (código ${res.status}).`,
      };
    }

    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) {
      return {
        success: false,
        error: `No se encontró ninguna partida guardada con el usuario "${normalizedAlias}".`,
      };
    }

    const row = rows[0];
    if (row.pin_hash && row.pin_hash !== pinHash) {
      return {
        success: false,
        error: 'El PIN introducido no es correcto para este usuario.',
      };
    }

    const validateResult = validateSaveData(row.save_data);
    if (!validateResult.valid || !validateResult.data) {
      return {
        success: false,
        error: validateResult.error || 'Los datos de la partida en la nube están corruptos.',
      };
    }

    // Recordar el último alias usado
    localStorage.setItem('paplitz_cloud_alias', normalizedAlias);

    return {
      success: true,
      data: validateResult.data,
    };
  } catch (err) {
    console.error('[CloudSync] Error al cargar de la nube:', err);
    return {
      success: false,
      error: 'Error de red al intentar descargar la partida.',
    };
  }
}
