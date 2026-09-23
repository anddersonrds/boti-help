# BotiHelp - Triagem inteligente de chamados

Experimento de um dia. O colaborador descreve em texto livre o que precisa, e a aplicação
devolve um chamado já categorizado, priorizado e com os campos obrigatórios conferidos,
pronto para entrar na esteira de atendimento.

## O problema

Colaborador não sabe se o caso dele é de RH, TI ou Facilities. Escolhe errado, ou preenche o
formulário pela metade. O chamado volta para o solicitante e o ciclo se arrasta.

O gargalo do service desk não é a categoria errada, é o chamado incompleto voltando. Por isso
a aplicação não para em "texto entra, JSON sai": ela compara o que o texto trouxe com os campos
obrigatórios da categoria e pergunta o que faltou, antes de abrir o chamado.

## A hipótese e como ela é medida

A hipótese é que uma camada de interpretação em linguagem natural produz um chamado bom o
suficiente para ser aceito sem edição. O painel da própria aplicação mede isso ao vivo:
total de triagens, taxa de aceite sem edição e qual campo é mais corrigido.

O número começa zerado. Ele é preenchido pelas triagens feitas na sessão, não por dado semeado.

## Decisões

| Decisão | Por quê |
| ------- | ------- |
| Catálogo fechado em `catalog.json`, com o modelo escolhendo de um enum | O modelo não inventa categoria. Nove categorias em RH, TI e Facilities, cada uma com departamento, SLA e campos obrigatórios. |
| O schema enviado ao modelo é derivado do schema Zod de validação, via `z.toJSONSchema()` | Uma fonte de verdade. O que é pedido ao modelo e o que é validado na volta não podem divergir em silêncio. |
| `department` e `slaHours` vêm sempre do catálogo, nunca do texto gerado | Campo de roteamento é dado de sistema. O modelo opina na categoria, não no SLA. |
| Resposta inválida gera um retry, e só | Dois erros seguidos viram `fora_do_catalogo` e o caso vai para tratamento humano, em vez de entrar torto na esteira. |
| Fallback automático para o classificador mock, com a procedência no payload | Rate limit, chave inválida, timeout ou queda de rede não derrubam a aplicação. O campo `source` e o badge na interface dizem de onde veio o resultado. |
| Campos faltantes são respondidos e mesclados no front, sem nova chamada ao modelo | Determinístico, não consome quota e remove um ponto de falha do caminho crítico. |
| Estado em memória no processo Node, sem banco | O experimento mede sinal em uma sessão. Persistência é custo de sustentação sem retorno dentro da janela. |
| Um processo Express servindo API e estáticos na mesma origem | Um deploy, um domínio, sem CORS, chave só no servidor. |

## O que foi feito, o que ficou de fora, e o que mudaria a decisão

| O que foi feito | O que ficou de fora | Qual sinal mudaria a decisão |
| --------------- | ------------------- | ---------------------------- |
| Catálogo fechado com validação Zod do payload | Integração real com ServiceNow, sem ambiente disponível | Aceite sem edição alto de forma consistente. Aí vale ligar no destino real. |
| Human-in-the-loop, com categoria e prioridade editáveis | Autenticação e identidade do solicitante | Necessidade de atribuir a triagem a uma pessoa, ou de medir aceite por perfil. |
| Painel de aceite sem edição e campo mais corrigido | Persistência em banco ou arquivo | Sessão de medição maior que um dia, ou necessidade de comparar semanas. |
| Detecção de campos faltantes por categoria | Chat multi-turno | Um campo faltante cuja resposta depende da resposta anterior. Hoje uma rodada de perguntas resolve. |
| Fallback para classificador mock com procedência explícita | RAG sobre a base de conhecimento de RH | Catálogo crescendo além do que cabe no prompt, ou queda de precisão com mais categorias. |
| Catálogo injetado no prompt (in-context learning) | Reclassificação após o preenchimento dos campos faltantes | Evidência de que preencher um campo muda a categoria certa com frequência. |
| Testes na classificação, no contrato, nas rotas e no log | Suíte ampla, incluindo testes de componente | Vida útil além do experimento. Aí a interface passa a merecer teste automatizado. |

## Evolução para integração real com ServiceNow

O payload já foi desenhado para ser aceito por um catálogo real, então a evolução é de
transporte e de fonte de dados, não de contrato.

1. **Catálogo vivo.** Trocar o `catalog.json` por leitura da Table API do ServiceNow, com cache
   em memória e recarga periódica. O enum passa a ser derivado do catálogo real, e o schema
   enviado ao modelo continua sendo derivado do mesmo schema Zod. O restante do código não muda.
2. **Abertura do chamado por mensageria.** Hoje `POST /api/tickets` grava em memória. No destino
   real ele publica em uma fila, e um consumidor cria o `sc_request` e devolve o número do
   chamado. A fila absorve indisponibilidade do destino sem travar a jornada do colaborador.
3. **Identidade.** O chamado passa a carregar o solicitante autenticado, o que permite medir
   aceite por área e pré-preencher campos que o cadastro já conhece.
4. **Conhecimento por recuperação.** Com o catálogo grande demais para o prompt, o passo é
   recuperar as poucas categorias candidatas e injetar só elas, mantendo o mesmo contrato.
5. **Medição em produção.** As métricas saem da memória para um destino de analytics, e a taxa
   de aceite sem edição vira indicador contínuo, não só o resultado de um experimento.

## Dado pessoal e injeção de prompt

A entrada é texto livre de RH: saúde, dependentes, folha, desligamento. Isso é dado pessoal e
parte dele é sensível. Por isso nada do texto do colaborador vai para log. O registro de evento
recebe apenas o resultado estruturado da triagem: categoria, prioridade, status, procedência,
motivo do fallback e duração. Nenhum trecho do texto original aparece. A chave do modelo é lida
só no processo Node, nunca chega ao navegador e nunca aparece em resposta HTTP ou em objeto de
erro. O estado fica em memória e morre com o processo, então não há base de dado pessoal a
proteger depois do experimento.

Texto livre enviado a um modelo é superfície de injeção de prompt. O texto do colaborador entra
no prompt dentro de um delimitador explícito, com instrução de tratá-lo como dado e nunca como
instrução. A defesa real, porém, não é a instrução: é o contrato. A saída do modelo é validada
contra um schema Zod, `categoryId` só pode ser um id do catálogo, e `department` e `slaHours`
são preenchidos pelo servidor a partir do catálogo, ignorando o que o modelo tenha escrito.
Um texto que tente redirecionar o modelo no máximo produz uma triagem errada, que a pessoa
corrige no card. Não produz um chamado fora do catálogo nem um roteamento forjado.

## Como rodar

Requer Node 20.19 ou superior.

```bash
npm install
npm run dev
```

A interface sobe em `http://localhost:5173` e a API em `http://localhost:3000`, com proxy das
rotas `/api` já configurado no Vite.

Sem `GEMINI_API_KEY` definida a aplicação sobe do mesmo jeito e opera pelo classificador mock.
A interface traz quatro exemplos prontos em um clique, e o mock responde de forma determinística
para os quatro. Com o modelo real, ou para forçar o mock mesmo com chave definida:

```bash
GEMINI_API_KEY=sua-chave npm run dev
MOCK_LLM=1 npm run dev
```

As variáveis são lidas do ambiente do processo. `.env.example` lista quais existem:

| Variável | Para que serve |
| -------- | -------------- |
| `GEMINI_API_KEY` | Chave do modelo. Ausente, a triagem cai no classificador mock. |
| `MOCK_LLM` | `1` força o classificador mock e nunca chama o modelo. |
| `GEMINI_MODEL` | Modelo usado na chamada. O padrão é `gemini-2.5-flash`. |
| `PORT` | Porta do processo Express. O padrão é `3000`. |

Para rodar como em produção, em um processo só na mesma origem:

```bash
npm run build
npm start
```

Verificações:

```bash
npm test         # suíte do backend
npm run typecheck
```

## Rotas

| Rota | O que faz |
| ---- | --------- |
| `POST /api/triage` | Recebe `{ text }` e devolve a triagem validada. Texto fora de 10 a 2000 caracteres responde 400 sem chamar o modelo. |
| `POST /api/tickets` | Recebe o payload aceito, registra o chamado e devolve o protocolo `BOTI-AAAA-NNNN`. |
| `GET /api/catalog` | Catálogo completo, usado pela interface para recalcular departamento, SLA e campos obrigatórios ao trocar a categoria. |
| `GET /api/metrics` | Total de triagens, total de chamados, taxa de aceite sem edição e campos mais corrigidos. |

## Estrutura

```
api/src
  catalog/      catálogo de categorias e carregador tipado
  classifier/   prompt, cliente do modelo, classificador mock e orquestração
  schema/       contrato Zod e schema derivado para o modelo
  server.ts     rotas HTTP
  store.ts      triagens e chamados em memória
  metrics.ts    sinal do experimento
  logger.ts     registro de evento sem dado pessoal
  static.ts     interface servida na mesma origem
web/src
  components/   entrada, card editável, confirmação e painel
  lib/api.ts    cliente das rotas
```

Interface e payload em português, porque o domínio é brasileiro. Código, identificadores e
nomes de arquivo em inglês.
