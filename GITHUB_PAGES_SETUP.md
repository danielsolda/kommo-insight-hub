# Configuração GitHub Pages para Kommo Insight Hub

Este guia explica como configurar o projeto para funcionar com GitHub Pages, necessário para a integração OAuth com a Kommo.

## Por que GitHub Pages?

A Kommo CRM não permite URLs do Lovable diretamente para OAuth. É necessário usar um domínio público como GitHub Pages para o redirect URI.

## Configuração Passo a Passo

### 1. Conectar ao GitHub

1. No Lovable, clique em **GitHub** → **Connect to GitHub**
2. Autorize a Lovable GitHub App
3. Selecione sua conta/organização GitHub
4. Clique em **Create Repository** para criar o repositório

### 2. Configurar GitHub Pages

1. Vá para o repositório no GitHub
2. Clique em **Settings** → **Pages**
3. Em **Source**, selecione **GitHub Actions**
4. Crie o arquivo `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Build
        run: npm run build
        
      - name: Setup Pages
        uses: actions/configure-pages@v4
        
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './dist'

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

### 3. Configurar Kommo Integration

1. Acesse sua conta Kommo como administrador
2. Vá em **Configurações** → **Integrações** → **Criar Integração**
3. Preencha as informações da integração
4. No campo **Redirect URI**, use:
   ```
   https://SEU-USUARIO.github.io/kommo-insight-hub/oauth/callback
   ```
   (substitua `SEU-USUARIO` pelo seu username do GitHub)

### 4. Usar a Aplicação

1. Acesse a URL do GitHub Pages: `https://SEU-USUARIO.github.io/kommo-insight-hub/`
2. Configure suas credenciais OAuth da Kommo
3. O sistema detectará automaticamente que está no GitHub Pages
4. Use o botão "Gerar" para preencher automaticamente o Redirect URI correto

## URLs Importantes

- **Desenvolvimento (Lovable)**: Para desenvolvimento e testes
- **Produção (GitHub Pages)**: `https://SEU-USUARIO.github.io/kommo-insight-hub/`
- **Redirect URI**: `https://SEU-USUARIO.github.io/kommo-insight-hub/oauth/callback`

## Detecção Automática

O sistema detecta automaticamente quando está rodando no GitHub Pages e:
- Ajusta as URLs automaticamente
- Mostra instruções específicas na interface
- Gera o Redirect URI correto

## Troubleshooting

### Build falha no GitHub Actions
- Verifique se todas as dependências estão no `package.json`
- Confira se não há variáveis de ambiente faltando

### OAuth não funciona
- Confirme que o Redirect URI na Kommo está correto
- Verifique se o site está realmente publicado no GitHub Pages
- Teste a URL manualmente no navegador

### Rotas não funcionam
- GitHub Pages pode ter problemas com SPAs
- O sistema já está configurado com basename correto
- Se problemas persistirem, pode ser necessário configurar um arquivo 404.html

## Suporte

Se encontrar problemas:
1. Verifique os logs do GitHub Actions
2. Teste a aplicação localmente no Lovable
3. Confirme as configurações na Kommo
4. Verifique se o repositório está público (necessário para GitHub Pages gratuito)