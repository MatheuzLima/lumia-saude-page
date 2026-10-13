# Lumina Saúde Integrada — landing page

Landing page de alta conversão para clínica multidisciplinar. Site estático (HTML + CSS + JS puro), sem build e sem dependências, mobile-first.

## Destaques
- Triagem ágil em 3 perguntas que monta a mensagem pronta para o WhatsApp (com alerta de emergência/SAMU).
- Catálogo de especialidades com filtro, FAQ, equipe, avaliações, contato e botão flutuante do WhatsApp.
- Status "Aberto agora" calculado pelo horário de Brasília. SEO básico e dados estruturados (JSON-LD).

## Configurar
Edite o topo de `assets/script.js` (`CONFIG`): número do WhatsApp (`whatsapp`, só dígitos com DDI+DDD) e horários. Está com o número do seu portfólio; troque se preferir outro.

## Rodar localmente
Abra `index.html` no navegador, ou sirva a pasta (`npx serve .`).

## Deploy na Vercel
1. Suba esta pasta em um repositório (ou use `npx vercel` dentro dela).
2. Na Vercel: Add New → Project → importe. Framework preset: **Other**. Sem build command e sem output directory.
3. Em Settings → Domains, adicione o domínio/subdomínio usado no portfólio.

## Dados fictícios
Nomes, CRM, CNPJ e endereço são fictícios (há aviso no rodapé). Substitua ao adaptar para um cliente real. Depoimentos tratam do atendimento, não de resultados de tratamento, por causa das regras de publicidade médica do CFM; valide o texto final com o cliente.
