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
   - Site URL: `https://fut.gabrielschumann.com.br`
   - Redirect URLs: `https://fut.gabrielschumann.com.br/**` e `http://localhost:3000/**`
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
1. Na Vercel: **Project → Settings → Domains → Add** `fut.gabrielschumann.com.br`.
2. No painel DNS da sua hospedagem (zona `gabrielschumann.com.br`): remova o registro **A** atual de `fut`
   e crie um **CNAME** `fut` apontando para o valor que a Vercel mostrar.
3. Aguarde a propagação; o HTTPS é emitido automaticamente.

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
