-- ==========================================================
-- PAPLITZ: CICLO DE VIDA, RECUPERACIÓN Y CONTROL DE AFORO
-- Ejecuta este script en el SQL Editor de tu proyecto Supabase
-- ==========================================================

-- 1. Añadir columnas para clave de recuperación y fecha de última actividad
alter table if exists public.user_saves
  add column if not exists recovery_key_hash text,
  add column if not exists last_active_at timestamptz default now();

-- Crear índice para optimizar consultas de aforo y fechas de actividad
create index if not exists idx_user_saves_last_active 
  on public.user_saves (last_active_at);

create index if not exists idx_user_saves_recovery 
  on public.user_saves (alias, recovery_key_hash);

-- 2. Procedimiento para purgar cuentas inactivas (por defecto > 90 días)
-- Respeta a los profesores que tengan aulas creadas con alumnos
create or replace function public.cleanup_inactive_saves(days_limit int default 90)
returns int
language plpgsql
security definer
as $$
declare
  deleted_count int := 0;
begin
  -- Eliminar usuarios inactivos que NO sean profesores con clases creadas
  with to_delete as (
    delete from public.user_saves
    where last_active_at < (now() - (days_limit || ' days')::interval)
      and alias not in (select distinct teacher_alias from public.classes)
    returning alias
  )
  select count(*) into deleted_count from to_delete;

  return deleted_count;
end;
$$;

-- 3. Habilitar permisos de ejecución anónima para la función de conteo y mantenimiento
grant execute on function public.cleanup_inactive_saves(int) to anon, authenticated;

-- Confirmación visual
select 'Configuración de ciclo de vida y recuperación de Paplitz completada con éxito.' as resultado;
