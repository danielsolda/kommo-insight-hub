

# Migração para Lovable Cloud

## Passo 1 - Desconectar Supabase externo (acao do usuario)

Antes de eu poder fazer qualquer alteracao, voce precisa:

1. Ir em **Settings** (configuracoes do projeto no Lovable)
2. Na aba **Supabase**, clicar em **Disconnect**
3. Depois, na aba **Cloud**, ativar o **Lovable Cloud**

Quando o Lovable Cloud estiver ativo, me avise para eu prosseguir.

## Passo 2 - Recriar as tabelas do banco de dados

Vou recriar as 3 tabelas que existiam no projeto anterior:

### Tabela `user_kommo_credentials`
Armazena as credenciais da API Kommo por usuario:
- `id` (uuid, PK)
- `user_id` (uuid, referencia ao usuario autenticado)
- `integration_id` (text)
- `secret_key` (text)
- `redirect_uri` (text, nullable)
- `account_url` (text, nullable)
- `access_token` (text, nullable)
- `refresh_token` (text, nullable)
- `token_expires_at` (timestamptz, nullable)
- `account_name` (text, default 'Conta Principal')
- `is_active` (boolean, default false)
- `created_at` / `updated_at` (timestamptz)

RLS: Usuarios so acessam suas proprias credenciais (SELECT, INSERT, UPDATE, DELETE filtrados por `auth.uid() = user_id`).

### Tabela `goals`
Armazena metas de vendas:
- `id` (uuid, PK)
- `name`, `description`, `type`, `target_type`, `target_value`, `period`
- `start_date`, `end_date`
- `product_name`, `seller_id`, `seller_name`
- `status_ids` (integer[]), `pipeline_ids` (integer[])
- `is_active` (boolean, default true)
- `created_at` / `updated_at`

RLS: Qualquer usuario autenticado pode ler, criar, atualizar e deletar metas.

### Tabela `kommo_logs`
Logs de requisicoes a API Kommo:
- `id` (uuid, PK)
- `action` (text)
- `request_data`, `response_data` (jsonb)
- `error_message` (text, nullable)
- `created_at`

RLS: Insercao aberta, leitura para usuarios autenticados.

## Passo 3 - Recriar funcoes do banco

- `log_kommo_request()` - funcao para registrar logs
- `calculate_goal_progress()` - calculo de progresso de metas
- `update_updated_at_column()` - trigger para atualizar `updated_at`

## Passo 4 - Atualizar o cliente Supabase

O arquivo `src/integrations/supabase/client.ts` sera atualizado automaticamente pelo Lovable Cloud com as novas credenciais. O `.env` tambem sera atualizado.

## Passo 5 - Atualizar Edge Functions

As 3 edge functions existentes (`kommo-auth`, `kommo-api`, `ai-chat`) serao mantidas e re-deployed no Lovable Cloud. As URLs de chamada no codigo serao atualizadas para usar `import.meta.env.VITE_SUPABASE_URL` em vez da URL hardcoded antiga.

## Passo 6 - Reconfigurar secrets

Os secrets necessarios serao verificados e reconfigurados no Lovable Cloud:
- `KOMMO_CLIENT_ID`
- `KOMMO_CLIENT_SECRET`
- Outros que forem necessarios

## Resumo

| Etapa | Responsavel |
|-------|-------------|
| Desconectar Supabase externo e ativar Cloud | Voce |
| Criar tabelas, RLS, funcoes | Lovable (automatico) |
| Atualizar codigo e edge functions | Lovable (automatico) |
| Reconfigurar secrets | Voce (Lovable solicita) |

