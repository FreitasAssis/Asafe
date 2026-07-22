-- Tags globais novas e um momento opcional na Missa. Idempotente (o banco atual
-- não é re-semeado; os seeds também foram atualizados p/ instalações novas).
--   - momento: "Entrada da Bíblia"  · tema: "Vocação", "Diversos"
--   - slot "Entrada da Bíblia" (opcional), antes do Salmo, no template da Missa.
--     Mudar o template NÃO reescreve repertórios antigos (a sequência mora no
--     repertoire_item); só afeta Missas novas.

insert into public.tag (name, category, owner_id)
select v.name, v.category::public.tag_category, null
from (values
  ('Entrada da Bíblia', 'momento'),
  ('Vocação', 'tema'),
  ('Diversos', 'tema')
) as v(name, category)
where not exists (
  select 1 from public.tag t
  where t.name = v.name and t.category = v.category::public.tag_category and t.owner_id is null
);--> statement-breakpoint

update public.slot_template
set slots = '[
  {"key":"entrada","label":"Entrada","optional":false},
  {"key":"aspersao","label":"Aspersão","optional":true},
  {"key":"ato_penitencial","label":"Ato Penitencial","optional":true},
  {"key":"gloria","label":"Glória","optional":true},
  {"key":"entrada_biblia","label":"Entrada da Bíblia","optional":true},
  {"key":"salmo","label":"Salmo Responsorial","optional":false},
  {"key":"aclamacao","label":"Aclamação ao Evangelho","optional":false},
  {"key":"ladainha","label":"Ladainha","optional":true},
  {"key":"ofertorio","label":"Ofertório","optional":false},
  {"key":"santo","label":"Santo","optional":false},
  {"key":"cordeiro","label":"Cordeiro","optional":true},
  {"key":"comunhao","label":"Comunhão","optional":false},
  {"key":"acao_de_gracas","label":"Ação de Graças","optional":true},
  {"key":"passeio","label":"Passeio do Santíssimo","optional":true},
  {"key":"final","label":"Final","optional":false}
]'::jsonb
where type = 'Missa';