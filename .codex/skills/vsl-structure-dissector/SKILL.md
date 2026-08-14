---
name: vsl-structure-dissector
description: Disseca integralmente qualquer VSL de resposta direta segundo a estrutura FEG, identificando com rigor Microlead, Lead, Background History (Expert Presentation, Emotional Story e Discovery Story), Tese de Marketing (Mecanismo do Problema e da Solução), Product Build-Up (Fórmula e Personal Testimony), Bloco de Oferta (Pitch, Pós-Pitch e Bônus), FAQ e Depoimentos de Terceiros. Use quando o usuário pedir dissecação, classificação estrutural, marcação cronológica ou análise dos blocos persuasivos de uma VSL, roteiro ou transcrição longa.
---

# Dissecar VSL pela Estrutura FEG

## Fonte normativa

Ler integralmente [references/structure-spec.md](references/structure-spec.md) antes de classificar ou validar qualquer VSL. Tratar essa referência como contrato: não renomear categorias, não fundir blocos incompatíveis e usar os critérios negativos para resolver ambiguidades.

## Entradas mínimas

1. Exigir transcrição integral; usar vídeo/áudio e timestamps quando disponíveis.
2. Se a transcrição puder estar incompleta, registrar isso antes da análise e não inventar o conteúdo ausente.
3. Preservar a ordem cronológica e as palavras/claims originais ao citar evidências.

## Procedimento obrigatório

1. Ler a VSL inteira antes de fechar fronteiras.
2. Marcar mudanças de função persuasiva, não mudanças arbitrárias de assunto ou intervalos fixos.
3. Classificar cada trecho com o menor bloco canônico que explique sua função.
4. Usar `Background History` como agrupador de `Expert Presentation`, `Emotional Story` e `Discovery Story`, sem apagar os sub-blocos.
5. Usar `Tese de Marketing` como agrupador de `Mecanismo do Problema` e `Mecanismo da Solução`.
6. Separar a materialização da solução (`Fórmula`) da venda formal (`Pitch`). Ingredientes e funcionamento podem estar na Fórmula; preço, condições e CTA pertencem ao Pitch.
7. Classificar transformação do narrador/personagem principal como `Personal Testimony`; classificar pessoas independentes como `Depoimentos de Terceiros`.
8. Registrar cada Depoimento de Terceiros como bloco independente de prova social e informar onde ele foi inserido na estrutura principal.
9. Marcar blocos opcionais como ausentes quando não houver evidência; nunca criá-los para completar um modelo.
10. Validar cada fronteira contra “Como reconhecer” e “O que NÃO faz parte” da referência.

## Regras de desempate

- Curiosidade sem contexto antes da promessa principal: `Microlead`.
- Trailer/promessa que abre loops e segura atenção: `Lead`.
- Autoridade e legitimidade do narrador: `Expert Presentation`.
- Sofrimento e tentativas antes da transformação: `Emotional Story`.
- Caminho/momento que conduz à nova descoberta: `Discovery Story`.
- Nova causa raiz e novo culpado: `Mecanismo do Problema`.
- Explicação de como a solução age sobre a causa: `Mecanismo da Solução`.
- Solução ganhando forma, composição, método ou protocolo antes da venda: `Fórmula`.
- Produto oficialmente disponível, stack, preço, garantia ou CTA: `Pitch`.
- Provas, objeções, garantia, urgência ou CTA depois da apresentação formal: `Pós-Pitch`.
- Perguntas e respostas finais que reduzem incerteza: `FAQ`.

Não usar posição isoladamente como critério. A função do trecho prevalece; somente `Microlead` precisa estar antes da Lead, e o FAQ normalmente aparece após a oferta.

## Formato de saída

Entregar um documento em PT-BR com:

1. `# [Nome] — Dissecação Estrutural FEG`
2. `## Mapa cronológico`, em tabela com início/fim, bloco principal, sub-bloco, evidência literal curta, função psicológica e justificativa da fronteira.
3. `## Dissecação bloco a bloco`, cobrindo o primeiro ao último trecho da VSL. Para cada ocorrência, informar:
   - intervalo;
   - bloco/sub-bloco canônico;
   - o que acontece;
   - função psicológica;
   - elementos reconhecidos;
   - frase inicial e frase final que sustentam a fronteira;
   - transição para o próximo bloco.
4. `## Depoimentos de Terceiros`, listando cada ocorrência e sua posição relativa; usar `Ausente` quando não houver.
5. `## Estrutura consolidada`, mostrando a sequência real e os blocos opcionais ausentes.
6. `## Ambiguidades reais`, somente quando a evidência admitir mais de uma classificação; explicar o critério usado sem inventar certeza.

### Separação obrigatória entre tradução e dissecação

- A tradução preserva a copy integral no idioma de destino.
- A dissecação não pode devolver a transcrição traduzida com novos títulos. Ela deve classificar, delimitar e explicar cada ocorrência.
- Evidências literais servem apenas para sustentar fronteiras e devem ser curtas; não repetir parágrafos inteiros da copy.
- Cada ocorrência deve informar `O que acontece`, `Função psicológica`, `Elementos reconhecidos`, `Evidência inicial`, `Evidência final`, `Justificativa da fronteira`, `Transição` e `Como modelar`.
- Variações sucessivas, como `Lead 1`, `Lead 2`, `Lead 3`, pitches alternativos e bônus repetidos, permanecem ocorrências separadas.
- Headlines e mini-ganchos só entram na cronologia quando forem executados no vídeo. Materiais apenas escritos vão para ativos reutilizáveis.
- Quiz, comparação de kits e personalização são técnicas dentro do `Bloco de Oferta`; não criar uma categoria canônica concorrente.

## Critérios de conclusão

Só concluir quando:

- toda a duração ou todo o texto estiver coberto, sem lacunas e sem sobreposição contraditória;
- Lead não contiver história completa, mecanismo profundo ou oferta;
- Emotional Story não for confundida com a explicação da causa;
- Discovery Story não for confundida com a tese completa;
- Mecanismo da Solução não for confundido com Pitch;
- depoimentos independentes estiverem separados da história principal e da oferta;
- Pitch, Pós-Pitch, Bônus e FAQ estiverem separados quando existirem;
- elementos ausentes estiverem marcados como ausentes, nunca presumidos.
