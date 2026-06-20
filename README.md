# OptiCloud AI

Plataforma de otimização de custos de nuvem com inteligência artificial.

## Links de produção

| Serviço | URL |
|---|---|
| Frontend | https://opticloud-web.onrender.com |
| API | https://opticloud-api.onrender.com/health |

## Stack

- **Monorepo**: TurboRepo 2.x + npm workspaces
- **Frontend** (`apps/web`): Next.js 16 + React 19 + Tailwind CSS — export estático
- **API** (`apps/api`): Fastify 5 + TypeScript ESM (NodeNext)
- **Banco / Auth**: Supabase (PostgreSQL + GoTrue + RLS)
- **Deploy**: Render (free tier) — auto-deploy via push no `main`

## Estrutura

```
opticloud-ai/
├── apps/
│   ├── web/          # Next.js (static export → Render static_site)
│   └── api/          # Fastify (Render web_service, porta 10000)
├── packages/
│   ├── types/        # Tipos compartilhados (exporta .ts direto)
│   ├── typescript-config/  # tsconfig base/nextjs
│   └── ui/           # Componentes React compartilhados
└── supabase/
    └── migrations/   # DDL aplicado via supabase db push
```

## Banco de dados (Supabase)

Tabelas principais: `organizations`, `profiles`, `cloud_accounts`, `metrics`, `recommendations`

- RLS habilitado em todas as tabelas
- `handle_new_user()` trigger cria org + profile automáticamente no signup
- `my_org_id()` helper para políticas de isolamento por organização

## Desenvolvimento local

```bash
# instalar dependências
npm install

# copiar variáveis de ambiente
cp .env.example .env
# preencher SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, etc.

# rodar tudo junto
npx turbo dev

# ou separado
npx turbo dev --filter=web   # http://localhost:3000
npx turbo dev --filter=api   # http://localhost:3001
```

## Build

```bash
npx turbo build              # todos os apps
npx turbo build --filter=api # só a API
npx turbo build --filter=web # só o frontend
```

## Testes

```bash
cd apps/api && npm test      # Vitest (10 testes, services/recommendations)
```

## Deploy

Push no branch `main` dispara auto-deploy no Render para ambos os serviços.

Variáveis de ambiente necessárias no Render (já configuradas):

| Variável | Serviço |
|---|---|
| `SUPABASE_URL` | API |
| `SUPABASE_SERVICE_ROLE_KEY` | API |
| `API_CORS_ORIGIN` | API |
| `NEXT_PUBLIC_SUPABASE_URL` | Web |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Web |
| `NEXT_PUBLIC_API_URL` | Web |

## Decisões técnicas relevantes

- **`output: 'export'` no Next.js**: variáveis `NEXT_PUBLIC_*` são injetadas em build time, não em runtime. Precisam estar definidas no Render antes do build.
- **`SET search_path = public`** na função `handle_new_user()`: obrigatório porque `supabase_auth_admin` usa `search_path = auth` na sessão — sem isso o trigger falha silenciosamente com 500 no signup.
- **`packageManager: "npm@10.9.0"`** no root package.json: exigido pelo Turbo 2.x para detectar o gerenciador de workspaces.
- **`npm install --include=dev`** no build command do Render: `NODE_ENV=production` pula devDependencies; turbo e typescript estão em devDeps.
