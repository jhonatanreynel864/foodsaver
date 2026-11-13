-- =====================================================================
--  FOODSAVER · Esquema de base de datos para Supabase
--  Cómo usarlo: Supabase > SQL Editor > New query > pegar todo > Run
--  Se puede ejecutar más de una vez sin dañar nada.
-- =====================================================================

-- Productos del inventario -------------------------------------------
create table if not exists public.productos (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nombre            text not null check (char_length(nombre) between 2 and 60),
  categoria         text not null,
  cantidad          integer not null check (cantidad >= 0 and cantidad <= 100000),
  precio            numeric(12, 2) not null check (precio > 0),
  fecha_vencimiento date not null,
  creado_en         timestamptz not null default now()
);

-- Movimientos: ventas y bajas por desperdicio ------------------------
create table if not exists public.movimientos (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  producto_id     uuid references public.productos (id) on delete set null,
  producto_nombre text not null,
  categoria       text not null default 'Otros',
  tipo            text not null check (tipo in ('venta', 'baja')),
  cantidad        integer not null check (cantidad > 0),
  precio_unitario numeric(12, 2) not null check (precio_unitario >= 0),
  total           numeric(14, 2) not null check (total >= 0),
  fecha           date not null default current_date,
  creado_en       timestamptz not null default now()
);

create index if not exists productos_usuario_vence on public.productos (user_id, fecha_vencimiento);
create index if not exists movimientos_usuario_fecha on public.movimientos (user_id, creado_en desc);

-- Seguridad: cada usuario solo ve y modifica sus propios datos -------
alter table public.productos enable row level security;
alter table public.movimientos enable row level security;

drop policy if exists "productos_propios" on public.productos;
create policy "productos_propios" on public.productos
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "movimientos_propios" on public.movimientos;
create policy "movimientos_propios" on public.movimientos
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Permisos para usuarios con sesión iniciada --------------------------
grant select, insert, update, delete on public.productos to authenticated;
grant select, insert, update, delete on public.movimientos to authenticated;
