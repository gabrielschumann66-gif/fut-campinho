# Fut Campinho

App da pelada de segunda: confirmação de presença, partida ao vivo (gols e assistências),
ranking, craque da rodada com carta e arte para o Story, caixa de mensalidades e regras.

**Stack:** Next.js 16 (App Router) · Supabase (Postgres, Auth, Realtime) · hospedagem na Vercel.

## Papéis

| Papel | Pode |
|---|---|
| Jogador | Confirmar presença, ver tudo, editar o próprio perfil, ver a própria mensalidade |
| Capitão | Tudo do jogador + agendar/iniciar/encerrar rodadas, registrar partidas e gols, editar regras, gerenciar elenco |
| Financeiro | Tudo do jogador + marcar pagamentos |
| Presidente | Tudo |

O **primeiro usuário cadastrado vira presidente** automaticamente. Os demais entram como jogador.

## Pontuação

Vitória 3 · Empate 1 · Gol 2 · Assistência 1. O craque da rodada é quem fez mais pontos numa
rodada encerrada (desempate: gols, assistências, vitórias). Carta: Bronze até 8 pts, Prata 9–14, Ouro 15+.

---

## Colocar no ar

### 1. Supabase
1. Crie um projeto em <https://supabase.com> (região **South America (São Paulo)**).
2. **SQL Editor → New query**: cole todo o conteúdo de `supabase/migrations/0001_init.sql` e clique em **Run**.
3. **Authentication → URL Configuration**:
   - Site URL: `https://futcampinho.com.br`
   - Redirect URLs: `https://futcampinho.com.br/**` e `http://localhost:3000/**`
   - (O login é por celular + PIN com senha, sem link por e-mail; o e-mail interno `<telefone>@fut.gabrielschumann.com.br`
     é só um identificador e não deve mudar.)
4. **Authentication → Sign In / Providers → Email**: o e-mail padrão do Supabase envia poucas
   mensagens por hora. Para um grupo pequeno, você pode desligar **Confirm email**, ou configurar um SMTP próprio.
5. **Project Settings → API Keys**: copie a *Project URL* e a *Publishable key*.

### 2. Rodar localmente (opcional)
```bash
cp .env.example .env.local   # preencha as duas variáveis
npm install
npm run dev                  # http://localhost:3000
```

### 3. GitHub + Vercel
1. Crie um repositório no GitHub e envie este projeto (`git push`).
2. Em <https://vercel.com> → **Add New → Project** → importe o repositório.
3. Em **Environment Variables**, adicione `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
4. **Deploy**.

### 4. Domínio
O app responde em **https://futcampinho.com.br** (registrado no Registro.br). Projeto da Vercel: `fut-campinho-kac5`.
1. Na Vercel: **Settings → Domains** tem `futcampinho.com.br` e `www.futcampinho.com.br` (este redireciona para o primeiro).
2. No Registro.br (DNS do Registro.br, **modo avançado → Configurar zona DNS**):
   - **A** `futcampinho.com.br` → `216.198.79.1` e outro **A** → `64.29.17.1`
   - **CNAME** `www` → `d18708657c96d022.vercel-dns-017.com`
3. O HTTPS é emitido automaticamente pela Vercel depois que o DNS propaga.

### 5. Primeiro acesso
1. Abra o app e crie sua conta → você vira **presidente**.
2. Peça para a galera criar as contas. Em **Administração (engrenagem no Início) → Elenco**, defina capitão e financeiro.
3. Em **Administração → Grupo**, ajuste local, horário, vagas e mensalidade.
4. Em **Administração → Rodadas**, agende a primeira rodada.

### Plano gratuito do Supabase
Projetos gratuitos são pausados após ~7 dias sem uso. Com jogo toda semana isso não deve acontecer;
se acontecer, reative em **Project → Restore** (os dados ficam guardados).

## Estrutura

```
app/(app)/            telas com navegação inferior
  page.tsx            Início
  partida/            rodada atual, novo jogo e partida ao vivo (Realtime)
  ranking/            temporada e última rodada
  craque/             carta do craque + arte para o Story (PNG)
  caixa/              mensalidades
  perfil/             perfil, gráfico de desempenho, edição e sair
  regras/             regras (editáveis por capitão/presidente)
  admin/              rodadas, elenco e configurações
app/login/            entrar, criar conta, recuperar senha
lib/                  clientes Supabase, utilitários e consultas
supabase/migrations/  schema, views de estatística e políticas RLS
proxy.ts              protege as rotas e renova a sessão
```

## Segurança

- **Repositório GitHub privado.** O código, as migrations e as fotos dos jogadores não devem ficar públicos.
- **Sem login**, a API do Supabase só entrega nome, escudo e cores do grupo (`getConfigPublica`). Todo o resto
  (local, horário, valores, jogadores, telefones, pagamentos) exige sessão e passa pelo RLS.
- **Cargos:** capitão não reseta, não exclui, não bloqueia e não troca o telefone do presidente nem de outro capitão.
  Só o presidente nomeia capitães (migration `0008_seguranca.sql`).
- **Login:** a consulta de telefone (`status_acesso`) tem limite de 20 tentativas por IP a cada 10 min.
  Conta nova só nasce com o e-mail interno do próprio telefone.
- **Supabase → Authentication → Rate Limits:** mantenha o limite de *sign-in* baixo (o PIN tem 6 dígitos).
  Não ligue *Leaked password protection*: ela recusaria quase todo PIN numérico.
- **Imagens:** foto de perfil só do bucket `avatares` (na pasta do próprio jogador) ou de `/jogadores/`; escudo só do
  bucket `marca`, sem SVG.
- **Cabeçalhos HTTP** (CSP, HSTS, anti-iframe, nosniff) ficam em `next.config.ts`. Se o app passar a carregar algo de
  outro domínio, inclua o domínio na CSP.
- Ao criar tabela ou função nova: ative RLS, crie as políticas e dê `grant execute` só para `authenticated`.
