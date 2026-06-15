# POS Tickets

Sistema POS em Next.js para Vercel com base de dados Supabase.

## Funcionalidades

- Frente de venda com carrinho, método de pagamento e impressão automática de tickets.
- Cada ticket impresso mostra apenas o nome do produto.
- Zona Admin para criar, editar, ativar e desativar artigos.
- Relatório diário com total de vendas, artigos vendidos, resumo por produto, impressão e exportação CSV.
- Impressão preparada para impressora térmica POS de 80mm.

## Admin

Credenciais da zona Admin:

```txt
User: Admin
Pass: 21051986
```

## Supabase

1. Abre o projeto Supabase.
2. Vai a `SQL Editor`.
3. Executa o ficheiro `supabase/schema.sql`.

As políticas incluídas permitem leitura e escrita com a publishable key. Para um ambiente público com staff/login, substitui estas políticas por regras autenticadas.

## Local

```bash
npm install
npm run dev
```

## Vercel

Configura estas variáveis no projeto Vercel:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://bkrumigehebavrnvrnsk.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_3mCd6IftoU5ZlvxpAI5BXg_YHfqOHZk
```

Depois liga o repositório ao Vercel e faz deploy normal de Next.js.

## Impressora térmica

Para imprimir sem abrir a caixa de diálogo do Windows, usa o POS num Chrome/Edge arrancado com `--kiosk-printing`.

Vê as instruções em `PRINTING.md`.
