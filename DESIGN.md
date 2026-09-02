# CustoCheck Design System

## Contexto de uso

O usuário abre isto **no celular, em pé, atrás do balcão, com luz forte e às
vezes com a mão molhada**. Não é dashboard de escritório. Portanto:

- Alvo de toque mínimo **48px**, nunca menor
- Número grande e em `tabular-nums`, sempre
- Contraste alto, nada de cinza claro sobre branco
- Ação principal no alcance do polegar, na parte de baixo da tela

## Cor

```css
:root {
  /* Marca — roxo é açaí, dourado é granola e mel */
  --acai-900: #2A0F45;   /* fundo escuro, cabeçalho */
  --acai-700: #4A1F7C;   /* roxo primário: botão, link, ícone no claro */
  --acai-500: #7A3FBF;   /* roxo claro: ícone no escuro, hover, gráfico */
  --gold-500: #E3A73C;   /* o check, fundo de ação */
  --gold-300: #F3CF7A;   /* dourado no escuro */
  --gold-700: #C98A20;   /* dourado escuro: única forma de dourado em texto */

  /* Neutros com viés roxo — cinza puro parece descuido */
  --cream:    #FBF7F1;   /* fundo claro. Nunca #FFF puro */
  --surface:  #FFFFFF;   /* cartão sobre o creme */
  --border:   #E4DAEC;
  --ink:      #23122F;
  --ink-soft: #6B5A78;

  /* Semânticas — reservadas para status, nunca para marca */
  --ok:      #2E8B57;
  --bad:     #C0442F;
  --pending: #C98A20;
}
```

**Três regras de cor que não se quebram:**

1. **Verde e vermelho são só status.** O produto existe para dizer "bateu" ou
   "não bateu". Se verde virar cor de botão ou de marca, o usuário perde o
   sinal. Nunca use verde em botão, link, cabeçalho ou logo.
2. **Dourado não é texto sobre claro.** `#E3A73C` sobre branco tem contraste
   de cerca de 2:1, ilegível. Dourado é fundo (com `--acai-900` por cima) ou
   traço de ícone. Se precisar de dourado em texto claro, use `--gold-700`, e
   só em título grande.
3. **Um dourado por tela.** Dourado marca a ação principal. Se houver dois, não
   há principal.

## Temas

Tokens no `:root` (claro completo), redefinidos em
`@media (prefers-color-scheme: dark)` guardado por `:root:not([data-theme="light"])`
e de novo em `:root[data-theme="dark"]`. Nenhuma cor pode existir só dentro de
um bloco de tema.

```css
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --cream:    #170A24;
    --surface:  #21102F;
    --border:   #38234A;
    --ink:      #F4ECF7;
    --ink-soft: #A895B4;
    --ok:       #57C98B;
    --bad:      #E8735C;
    --pending:  #E3A73C;
  }
}
```

## Tipografia

Duas famílias, via Google Fonts, com pilha de fallback real.

```css
--font-display: 'Bricolage Grotesque', Georgia, serif;  /* marca e títulos */
--font-ui:      'Manrope', system-ui, -apple-system, sans-serif;
```

Escala. Não invente tamanho fora dela:

```css
--text-xs:  0.8125rem;  /* rótulo, legenda */
--text-sm:  0.9375rem;  /* apoio */
--text-md:  1rem;       /* corpo */
--text-lg:  1.25rem;    /* subtítulo */
--text-xl:  1.625rem;   /* título de tela */
--text-2xl: 2.25rem;    /* o número da perda */
```

**Todo número que representa peso ou dinheiro leva
`font-variant-numeric: tabular-nums`.** Sem isso as colunas dançam e o dono
perde a confiança no relatório.

Título usa `text-wrap: balance`. Rótulo em maiúscula leva
`letter-spacing: 0.08em`. Texto corrido não passa de 65 caracteres de largura.

## Espaçamento, raio e elevação

Base 4px. Só múltiplos:

```css
--space-1: 4px;  --space-2: 8px;   --space-3: 12px;
--space-4: 16px; --space-6: 24px;  --space-8: 32px; --space-12: 48px;

--radius-sm: 6px;    /* pílula, campo */
--radius-md: 12px;   /* cartão */
--radius-lg: 17px;   /* ícone da marca — proporção fixa 64:17 */

--shadow: 0 1px 2px rgba(42,15,69,.06), 0 4px 12px rgba(42,15,69,.05);
```

Espaço entre irmãos sai de `gap` em flex ou grid, nunca de margem por elemento.

## Componentes

**Botão primário** — fundo `--acai-700`, texto `--cream`, altura mínima 48px,
raio `--radius-sm`, peso 700. No escuro, fundo `--gold-500` com texto
`--acai-900`.

**Botão de ação da contagem** — o único dourado da tela. Fundo `--gold-500`,
texto `--acai-900`, largura total, fixo no rodapé no celular.

**Campo numérico** — altura mínima 56px, fonte `--text-xl`, `inputmode="decimal"`,
alinhado à direita, unidade em `--ink-soft` dentro do campo à direita
("g", "kg", "un"). É o componente mais tocado do produto: nada menor que isso.

**Linha de contagem** — o componente central. Nome do insumo à esquerda em
`--text-md`, campo numérico à direita, altura de linha mínima 64px, separador
`--border` de 1px. Nada mais na linha: nem ícone, nem menu, nem sublinha.

**Pílula de status** — texto em `--text-xs` maiúsculo, borda de 1px e texto na
cor semântica, fundo transparente. Três estados e só três:

| Estado | Cor | Texto |
|---|---|---|
| Bateu | `--ok` | `bateu` |
| Não bateu | `--bad` | `não bateu · R$ 412 a mais` |
| Pendente | `--pending` | `contagem pendente` |

**Cartão de resultado** — fundo `--surface`, borda `--border`, raio
`--radius-md`. O número da perda em `--text-2xl`, `--font-display`, na cor
semântica. Nada de barra colorida na lateral do cartão.

## Marca

Ícone invariável: ladrilho roxo, check dourado. Só o texto do logotipo adapta
ao fundo. O ladrilho é o que o olho procura numa aba cheia — se ele trocar de
cor por contexto, viram duas marcas. E o atalho na tela inicial do celular é
uma imagem fixa: não existe versão clara e escura.

```svg
<!-- fundo claro -->
<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  <rect width="64" height="64" rx="17" fill="#4A1F7C"/>
  <path d="M17 33 L27 44 L48 20" fill="none" stroke="#E3A73C"
        stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
</svg>

<!-- fundo escuro: rect #7A3FBF, stroke #F3CF7A, resto idêntico -->
```

Logotipo: `custo` em peso 500, `check` em peso 800.

| | Claro | Escuro |
|---|---|---|
| Ladrilho | `#4A1F7C` | `#7A3FBF` |
| Check | `#E3A73C` | `#F3CF7A` |
| "custo" | `#4A1F7C` | `#F4ECF7` |
| "check" | `#C98A20` | `#F3CF7A` |

Ladrilho dourado com check roxo existe só como versão secundária: impressão em
uma cor e aplicação sobre roxo cheio. Nunca como tema escuro.

Favicon e ícone de app saem do mesmo SVG, exportados em 16, 32, 180 e 512px.
O símbolo foi escolhido por sobreviver a 16px — não substitua por desenho mais
elaborado sem refazer esse teste.

## Acessibilidade

- Foco sempre visível: `outline: 2px solid var(--gold-500); outline-offset: 2px`.
- Estado nunca é só cor: pílula tem texto, não só bolinha colorida.
- Respeitar `prefers-reduced-motion`.
- Contraste mínimo 4.5:1 em texto corrido. Conferir toda combinação nova antes
  de usar, principalmente qualquer coisa com dourado.

## O que não fazer

- Barra colorida na lateral de cartão.
- Verde fora de status.
- Cinza puro. Neutro sempre com viés roxo.
- Ícone menor que 48px de área tocável.
- Número sem `tabular-nums`.
- Mais de um dourado por tela.
