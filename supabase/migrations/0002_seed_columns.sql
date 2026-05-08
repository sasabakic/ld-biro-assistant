-- Auto-seed default kanban columns when a new firm is created.
-- Defaults: Inbox / U toku / Čeka klijenta / Čeka treću stranu / Gotovo
-- Maps to client-visible: hidden / u_radu / ceka_tebe / u_radu / gotovo

create or replace function public.seed_default_columns_for_firm() returns trigger
language plpgsql as $$
begin
  insert into public.columns (firm_id, name, position, client_visible_mapping, is_done)
  values
    (new.id, 'Inbox',              1, 'u_radu',    false),
    (new.id, 'U toku',              2, 'u_radu',    false),
    (new.id, 'Čeka klijenta',       3, 'ceka_tebe', false),
    (new.id, 'Čeka treću stranu',   4, 'u_radu',    false),
    (new.id, 'Gotovo',              5, 'gotovo',    true);
  return new;
end;
$$;

create trigger firms_seed_columns
  after insert on public.firms
  for each row execute function public.seed_default_columns_for_firm();
