# Roteiro de Liquidez — $KYRT

Como criar e gerir o mercado do $KYRT em uma DEX na Solana após o deploy.

> Pré-requisito: token deployado, supply mintado e authorities revogadas (ver `docs/MAINNET.md`).

---

## 1. Escolha da DEX

| DEX | Prós | Contras |
|---|---|---|
| **Raydium** ⭐ | Maior volume/roteamento, integra com Jupiter, padrão para launches | UI um pouco mais técnica |
| **Orca** | UX excelente, Whirlpools (CLMM) maduro | Menos "praça" de launch que a Raydium |
| **Meteora** | DLMM, pools dinâmicas, bom p/ LPs | Curva de aprendizado maior |

> **Recomendação:** **Raydium** para o pool principal. Todo agregador (Jupiter) roteia por ela, então liquidez na Raydium = $KYRT comprável em qualquer carteira/app Solana.

---

## 2. Tipo de pool

| Tipo | Quando usar |
|---|---|
| **CPMM (Standard AMM)** ⭐ | Launch. Liquidez espalhada em toda a curva (0→∞), zero gestão, à prova de bot-drain. **Comece aqui.** |
| **CLMM (Concentrated)** | Depois, para eficiência de capital quando houver volume e um market maker ativo |

> **Recomendação:** abrir com **CPMM**. Migrar/complementar com CLMM quando o volume justificar.

---

## 3. Par de negociação

- **KYRT/SOL** ⭐ — par nativo, mais natural em Solana, melhor roteamento.
- **KYRT/USDC** — preço estável e legível, bom para um segundo pool depois.

> **Recomendação:** lançar com **KYRT/SOL**. Adicionar **KYRT/USDC** numa segunda fase.

---

## 4. Preço inicial e profundidade

Numa AMM, o preço é definido **pela razão entre os dois lados** do pool:

```
preço(KYRT em SOL) = SOL_depositado / KYRT_depositado
FDV (em SOL)       = preço × supply_total
```

**Cenários de seed (KYRT/SOL, supply 1B), assumindo SOL ≈ US$150:**

| KYRT no pool | SOL no pool | Preço inicial | FDV aprox. |
|---|---|---|---|
| 200.000.000 | 50 SOL | 0,00000025 SOL (~US$0,0000375) | ~US$37,5 mil |
| 200.000.000 | 200 SOL | 0,000001 SOL (~US$0,00015) | ~US$150 mil |
| 400.000.000 | 400 SOL | 0,000001 SOL (~US$0,00015) | ~US$150 mil |

> Regra prática: **mais SOL no seed = preço mais "firme"** e menos volátil a cada compra. Pouca liquidez = candles violentos e alvo fácil de bots. Dimensione o lado SOL conforme o capital disponível e o FDV-alvo.

---

## 5. LP tokens: queimar vs travar

Ao criar o pool você recebe **LP tokens** (representam sua parte da liquidez). O que fazer com eles é o sinal de confiança nº 1:

| Estratégia | Efeito | Sinal |
|---|---|---|
| **Burn (queimar)** ⭐ | Liquidez fica presa **para sempre** | Máxima confiança, irreversível |
| **Lock (travar)** | Time-lock (ex.: 6–12m) via serviço de lock | Confiança alta, reversível no fim |
| Manter | Você pode remover a liquidez | ❌ Lido como risco de "rug" |

> **Recomendação:** **queimar** (ou travar por período longo e público) os LP tokens do pool inicial. Combinado com o mint revogado, isso fecha os dois maiores vetores de desconfiança.

---

## 6. Mecânica deflacionária (buyback & burn)

Operacionalização do modelo do site, alimentado pela **receita dos departamentos de IA**:

```
Receita (USDC/SOL)
   └─► recompra KYRT no mercado (via Jupiter)
          ├─ 50% → BURN permanente   →  npm run burn -- <qtd>
          └─ 50% → Expansion Vault (multisig)
```

- **Fase 1 (manual):** execuções periódicas assinadas pelo multisig; transparência via tx públicas.
- **Fase 2 (programática):** um bot/cron que recompra e queima em gatilhos de receita (documentar a fórmula publicamente).
- A função de burn **já existe** no projeto (`src/actions.ts → burnKyrt`).

---

## 7. Fair launch & anti-bot

- **Atomicidade:** adicionar liquidez **e** queimar/travar o LP o mais próximo possível (mesmo bloco/transação) para não dar janela a sniping.
- **Sem alocação oculta:** se for fair launch puro, todo o supply visível no pool (ver Opção A em `docs/MAINNET.md`).
- **Divulgação:** publicar o mint address só no momento do launch; cuidado com bots que escutam mempool/novos pools.
- Considerar ferramentas de launch com proteção anti-sniper se o evento for muito aguardado.

---

## 8. Pós-pool: visibilidade

| Plataforma | Ação |
|---|---|
| **Jupiter** | Roteamento automático ao detectar o pool; submeter à token list p/ logo verificado |
| **DexScreener** | Aparece sozinho; **reivindicar** o perfil e adicionar logo/links |
| **Birdeye** | Idem; reivindicar e enriquecer |
| **CoinGecko / CMC** | Aplicação manual (requer histórico de volume/liquidez) |

---

## 9. Sequência resumida

1. Deploy concluído (`docs/MAINNET.md`)
2. Definir FDV-alvo → calcular lados do pool (§4)
3. Criar pool **KYRT/SOL CPMM** na Raydium
4. **Queimar/travar** os LP tokens
5. Verificar roteamento no Jupiter
6. Reivindicar DexScreener/Birdeye
7. Anunciar mint address nos canais oficiais
8. Ligar o ciclo de **buyback & burn** (§6)
