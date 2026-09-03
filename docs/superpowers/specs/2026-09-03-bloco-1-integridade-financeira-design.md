# Bloco 1 — Integridade financeira e de dados

## Objetivo

Corrigir os erros auditados que podem alterar valores de estoque, CMV, períodos de venda e datas exibidas, sem apagar ou consolidar dados existentes automaticamente.

## Escopo

O bloco inclui:

- preservar a precisão do custo por unidade base e arredondar apenas totais monetários finais;
- impedir vendas com a mesma conta, loja, data inicial e data final;
- considerar o resultado contábil completo somente quando houver contagens inicial e final distintas;
- impedir que uma compra combine um insumo com uma embalagem de outro insumo;
- rejeitar números não finitos, valores não positivos e intervalos de datas invertidos;
- exibir colunas PostgreSQL `DATE` como datas civis, sem conversão por fuso horário;
- cobrir cada correção com um teste de regressão que falhe antes da implementação.

Não fazem parte deste bloco RLS, usuário de banco, sessões, CSRF, dependências, observabilidade ou reorganização geral do código.

## Cálculos

`calculateWeightedAverageCost` continuará retornando números na API, mas não arredondará `qtdBaseTotal` nem `custoMedio` para centavos. O PostgreSQL continuará fazendo a divisão em `NUMERIC`; o JavaScript converterá o resultado para `Number`. `valorTotal`, `estoqueInicial`, `estoqueFinal`, `cmvReais` e percentuais apresentados continuarão arredondados em duas casas.

Assim, um custo unitário de `0,035` permanecerá `0,035` durante a valoração. Dez mil unidades serão valoradas em R$ 350,00, não R$ 400,00.

O resultado será marcado com `contagemCompleta: true` somente quando as duas contagens existirem e tiverem IDs diferentes. Se faltar uma contagem ou ambas as buscas retornarem o mesmo registro, o serviço usará o cálculo aproximado já existente.

## Validação de entrada

As rotas financeiras usarão funções pequenas e puras para validar:

- números decimais finitos;
- valores estritamente maiores que zero para fator de conversão, quantidade de compra, valor da compra e faturamento;
- quantidade de contagem maior ou igual a zero;
- datas no formato civil `YYYY-MM-DD` que representem datas reais;
- `dataInicio <= dataFim`.

Entradas inválidas retornarão HTTP 400, em vez de chegar ao PostgreSQL e virar HTTP 500. A criação de compra também comparará o `insumo_id` retornado pela embalagem com o insumo solicitado.

## Banco e migração

Uma nova migração adicionará:

- `UNIQUE (conta_id, loja_id, data_inicio, data_fim)` em `vendas_periodo`;
- `CHECK (data_inicio <= data_fim)` em `vendas_periodo`;
- checks positivos para faturamento, compras e fatores de conversão;
- check não negativo para itens de contagem;
- chave composta que garanta que a embalagem de uma compra corresponde ao mesmo insumo e à mesma conta.

Antes de criar a unicidade das vendas, a migração verificará duplicidades. Se existirem, lançará uma exceção com os grupos conflitantes e interromperá a transação. Nenhuma linha será escolhida, somada ou apagada automaticamente.

Os constraints serão adicionados dentro da transação da própria migração. A correção estrutural do runner de migrações pertence ao Bloco 3.

## Datas no navegador

Será criado um módulo pequeno para formatar `YYYY-MM-DD` diretamente como `DD/MM/YYYY`, sem construir um objeto `Date`. As telas de compras, vendas e contagens importarão esse módulo. Instantes completos, como `criado_em`, continuarão usando `Date`, pois representam timestamps e devem respeitar fuso.

## Tratamento de erros

Violações previsíveis serão convertidas em respostas específicas:

- venda duplicada: HTTP 409;
- embalagem incompatível: HTTP 400;
- número ou data inválidos: HTTP 400;
- conflitos detectados na migração: falha explícita, preservando todos os dados.

Erros inesperados continuarão sendo registrados e retornarão HTTP 500 sem detalhes internos.

## Testes e aceite

O bloco estará concluído quando:

- o teste de custo provar que `0,035` não é arredondado antes da multiplicação;
- o teste de resultado provar que a mesma contagem nos dois limites gera cálculo aproximado;
- testes de validação cobrirem números, datas e intervalos inválidos;
- o controller de compras rejeitar embalagem de outro insumo;
- o controller de vendas mapear duplicidade para 409;
- o formatador produzir `01/09/2026` independentemente do fuso;
- a suíte unitária completa e a validação sintática passarem;
- a árvore Git contiver somente as alterações intencionais do bloco.

Os testes E2E existentes não serão executados contra o banco de desenvolvimento porque criam dados. A listagem/compilação dos testes poderá ser validada sem executar mutações.
