# Especificação do relatório de engenharia reversa visual

## Princípios

- Analise sincronizadamente vídeo, áudio, transcript, textos, personagens, objetos, cortes e recursos visuais.
- A prioridade das evidências é: visível no vídeo; audível; transcript; inferência visual simples; país-alvo.
- Divergências entre vídeo e transcript devem ser registradas no bloco correspondente, nunca corrigidas silenciosamente.
- Timestamps usam `00:00`, `01:27` ou `00:00:00` acima de uma hora. Use `aproximadamente` quando o segundo exato não puder ser determinado.
- Marque informação observável como `EVIDÊNCIA DIRETA` e interpretação necessária como `INFERÊNCIA VISUAL`.
- Não invente nomes, falas, datas, resultados, estudos, instituições, celebridades, produtos ou referências.
- Identidade pública: ALTA somente com forte correspondência; MÉDIA como `possível aparição de`; BAIXA descreve a pessoa sem nome. Suspeitas recebem `POSSÍVEL MANIPULAÇÃO — NÃO CONFIRMADA`.
- Use Markdown puro, números comuns e nenhuma introdução ou conclusão fora da estrutura.

## Estrutura exata

# RELATÓRIO GEMINI

## 1. FORMATO GERAL E PERSONAGENS

### Dados básicos

Informe duração, orientação, resolução aproximada, idioma, plataforma provável, formato principal/secundário, nível de produção e presença de narração, apresentador, legendas e produto. Categorias possíveis incluem UGC, Talking Head, News-style, Podcast, Entrevista, React, Receitinha, Fofoca/confessional, Hack corporal, Tela dividida, Cinematográfico, Dentro do carro, Slideshow, Animação, Demonstração, Depoimento e Screencast.

### Personagens e papéis

Tabela obrigatória:

| Personagem ou identificação | Tipo | Função narrativa | Aparência e ambiente | Forma de aparição | Confiança da identificação |
|---|---|---|---|---|---|

### Depoimentos

Quantidade, formato, distribuição, resultados específicos ou elogios, dados exibidos e provável origem visual. Sem depoimentos: `NÃO IDENTIFICADO`.

## 2. HOOK VISUAL — PRIMEIROS 3 SEGUNDOS

Analise exclusivamente 00:00–00:03 em quatro camadas:

1. Text overlay: texto exato, capitalização, cor, tamanho, posição, destaques, números e animação. Sem texto: `Sem texto`.
2. Som: fala exata, falante, voice-over/tela, música, efeitos, ambiente, silêncio e volume.
3. Visual: primeiro frame, objeto central, expressão, ação, câmera, B-roll, demonstração, TV/news, pattern interrupt, antes/depois e enquadramento.
4. Vibe: atmosfera objetiva, iluminação, temperatura, velocidade, sensação sonora e espontaneidade.

## 3. MAPA DE BLOCOS COM TIMESTAMPS

Use apenas: Hook; Segmentação; Teasing; Prova/Credibilidade; Dor/Agitação; Reconhecimento de Descrença; Mecanismo (tease); Invalidação; Benefício; Qualificador; Motivo pra Continuar; Push-Pull; CTA; Perrengue Cobiçado; Future Pacing; Bullets; Grupo/Exclusividade.

| Bloco Canônico | Timestamp inicial | Primeiras 5 a 7 palavras exatas | Timestamp final | Últimas 5 a 7 palavras exatas | O que aparece na tela | Observações de sincronização |
|---|---|---|---|---|---|---|

Não force blocos. Preserve a ordem. Copie palavras literalmente. Em silêncio use `SEM FALA`; sem timestamps externos use `TIMESTAMP ESTIMADO PELO VÍDEO`.

## 4. PROVAS VISUAIS, DEMONSTRAÇÕES E TEXTO NA TELA

### Demonstração ativa

Informe timestamps, pessoa, objeto, ação, resultado e texto. Ausente: `NÃO IDENTIFICADO`.

### Provas visuais em ordem cronológica

| Timestamp | Tipo de prova | O que aparece | Texto legível | Origem ou instituição mostrada | Legibilidade | Observação |
|---|---|---|---|---|---|---|

### Texto na tela durante todo o anúncio

| Timestamp inicial | Timestamp final | Texto exato | Posição | Estilo | Palavras ou números destacados |
|---|---|---|---|---|---|

Preserve erros, capitalização, pontuação, preços e porcentagens; não traduza. Use `[TRECHO ILEGÍVEL]`. Classifique o estilo predominante.

### Símbolos carregados do nicho

| Timestamp | Objeto ou cena | Descrição literal |
|---|---|---|

### Produto e oferta visual

Registre aparição inicial/final, forma, embalagem, uso, preço, desconto, garantia, frete, bônus, urgência, CTA, URL, QR e cliffhanger. Classifique o encerramento.

## 5. CENÁRIO, EDIÇÃO E RITMO

### Cenários

| Timestamp inicial | Timestamp final | Cenário | Personagens presentes | Mudança de bloco coincidente? |
|---|---|---|---|---|

Descreva mudanças, fundo real/virtual, chroma, desfoque, arquivo e coincidência narrativa.

### Ritmo de edição

Classifique cortes rápidos (<2s), médios (2–5s), longos (>5s), tomada contínua ou misto. Informe aceleração, desaceleração, trechos contínuos, quantidade aproximada e duração aparente.

### Música e áudio

| Timestamp | Elemento de áudio | Descrição | Intensidade | Função observável |
|---|---|---|---|---|

### Recursos de edição

| Timestamp | Recurso | Descrição |
|---|---|---|

## 6. SENSAÇÃO GERAL E PONTOS DE FRICÇÃO

Descreva objetivamente a atmosfera e transições, sem julgamento. Depois informe exatamente dois pontos observáveis:

| Timestamp | Tipo de fricção | Descrição objetiva do que ocorre |
|---|---|---|

Se não houver dois, use `NÃO IDENTIFICADO`; nunca invente.

## 7. CAMPOS DE DURAÇÃO

Esta seção deve ficar imediatamente antes do transcript e conter exatamente:

- DURAÇÃO TOTAL DO ANÚNCIO
- DURAÇÃO ÚTIL DE COPY
- ÚLTIMA FALA DE VENDA OU CTA (verbatim)
- TIMESTAMP DA ÚLTIMA FALA DE VENDA OU CTA
- FLAG DE CAUDA: Sim / Não
- INÍCIO DA CAUDA
- FIM DA CAUDA
- DURAÇÃO DA CAUDA
- CONTEÚDO DA CAUDA

## TRANSCRIPT

A última seção começa exatamente por:

`Fonte: transcript externo`

Em seguida reproduza a copy completa, verbatim, na mesma ordem, sem correção, tradução, resumo ou remoção de repetições e com timestamps originais quando disponíveis. Se ausente, escreva `NÃO INFORMADO`. Nada pode aparecer depois da última linha do transcript.
