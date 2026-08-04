---
name: ad-video-reverse-engineering
description: Analisa anúncios em vídeo de até 10 minutos junto com sua transcrição e gera um relatório operacional, cronológico e estritamente descritivo de personagens, hook, blocos, provas, textos, cenários, edição, áudio e CTA. Use em criativos de Meta Ads, TikTok Ads, YouTube Ads ou outras plataformas; não use para VSLs longas, análise de performance, sugestões ou interpretação estratégica.
---

# Engenharia Reversa de Video Ads

## Escopo obrigatório

Use esta skill somente quando a duração verificada do vídeo for maior que zero e menor ou igual a 10 minutos.

- Se o vídeo tiver mais de 10 minutos, interrompa este fluxo e encaminhe para o Dissecador de VSL.
- Exija o vídeo e a transcrição. Não marque a análise como concluída se uma das duas fontes estiver ausente.
- Preserve o transcript original literalmente como a última seção.
- Descreva e catalogue evidências; não avalie performance, não sugira melhorias e não faça análise psicológica.
- Use `NÃO INFORMADO` para parâmetros não fornecidos e `NÃO IDENTIFICADO` para elementos não reconhecíveis.
- Leia integralmente [references/report-spec.md](references/report-spec.md) antes de produzir ou validar o relatório.

## Fluxo

1. Verifique a duração real e confirme que é um anúncio de até 10 minutos.
2. Reúna nicho, país-alvo, idioma, plataforma, vídeo e transcript. Não adivinhe metadados ausentes.
3. Inspecione a linha do tempo do vídeo, o áudio, o transcript e os frames de apoio em conjunto.
4. Obedeça à hierarquia: vídeo visível, áudio audível, transcript externo, inferência visual simples, contexto geral do país.
5. Gere todas as seções na ordem definida pela especificação.
6. Valide timestamps, citações literais de início/fim dos blocos e presença do transcript como última seção.
7. Só conclua quando todas as seções existirem. Preencha seções vazias com `NÃO IDENTIFICADO`.

## Critérios de conclusão

O resultado é completo somente quando:

- contém `RELATÓRIO GEMINI` no início;
- contém as seções numeradas 1 a 7;
- usa apenas os nomes canônicos autorizados no mapa de blocos;
- registra exatamente dois pontos de fricção ou usa `NÃO IDENTIFICADO` nos que faltarem;
- contém os campos de duração imediatamente antes do transcript;
- termina na seção `## TRANSCRIPT`, iniciada por `Fonte: transcript externo`;
- não contém qualquer comentário depois do transcript.

## Persistência no Swipe

Armazene o relatório separadamente da transcrição e de qualquer análise de VSL:

- `adVisualAnalysis`: relatório Markdown completo;
- `adAnalysisStatus`: `queued`, `working`, `complete` ou `error`;
- `adAnalysisPromptVersion`: versão da especificação;
- `adAnalysisUpdatedAt`: data ISO da última conclusão;
- `adAnalysisDuration`: duração verificada em segundos.

Nunca grave este relatório em `analysisDoc`, pois esse campo pertence ao Dissecador de VSL.
