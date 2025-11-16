/**
 * Serviço de Análise de Exames com IA
 * Sistema Dra. Thayná Marra
 *
 * Utiliza Claude AI com visão para ler e categorizar exames
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL = 'claude-sonnet-4-5-20250929';

function resolveMediaType(filePath: string, fileType: 'pdf' | 'image'): string {
  if (fileType === 'pdf') {
    return 'application/pdf';
  }

  const ext = path.extname(filePath).toLowerCase();

  switch (ext) {
    case '.png':
      return 'image/png';
    case '.webp':
      return 'image/webp';
    case '.gif':
      return 'image/gif';
    case '.bmp':
      return 'image/bmp';
    case '.tif':
    case '.tiff':
      return 'image/tiff';
    case '.jpg':
    case '.jpeg':
    default:
      return 'image/jpeg';
  }
}

function logRawAnthropicResponse(examId: string, response: any) {
  // Usar /tmp em ambientes serverless (Vercel)
  const isVercel = process.env.VERCEL === '1';

  if (isVercel) {
    // Em produção Vercel, apenas fazer log no console
    console.log(`📝 Resposta da Anthropic para exame ${examId}:`, {
      model: response.model,
      usage: response.usage,
      role: response.role,
    });
    return;
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dir = path.join(process.cwd(), 'logs', 'anthropic');
  const filePath = path.join(dir, `${examId}-${timestamp}.json`);

  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(filePath, JSON.stringify(response, null, 2), 'utf-8');
    console.log(`📝 Resposta da Anthropic salva em ${filePath}`);
  } catch (error) {
    console.error('Erro ao salvar resposta bruta da Anthropic:', error);
  }
}

function ensureArray<T>(value: any): T[] {
  if (!value && value !== 0) {
    return []
  }

  return Array.isArray(value) ? value : [value]
}

/**
 * Categorias de exames suportadas
 */
export const EXAM_CATEGORIES = {
  HEMOGRAMA: 'Hemograma',
  LIPIDOGRAMA: 'Lipidograma',
  GLICEMIA: 'Glicemia',
  HORMONES: 'Hormônios',
  THYROID: 'Tireoide',
  LIVER: 'Função Hepática',
  KIDNEY: 'Função Renal',
  VITAMINS: 'Vitaminas e Minerais',
  URINE: 'Exame de Urina',
  STOOL: 'Exame de Fezes',
  IMAGING: 'Exames de Imagem',
  OTHER: 'Outros',
} as const;

/**
 * Interface para resultado da análise
 */
export interface ExamAnalysisResult {
  // Categorização
  category: string;
  subCategory?: string;
  examType: string;
  examDate?: Date;

  // Dados extraídos
  extractedData: Record<string, any>;
  keyFindings: Array<{
    parameter?: string;
    value?: string;
    reference?: string;
    status?: string;
    description?: string;
  }>;
  abnormalValues: Array<{
    parameter: string;
    value: string;
    reference: string;
    status: 'HIGH' | 'LOW' | 'CRITICAL';
  }>;

  // Resumo
  summary: string;
  recommendations?: string[];

  // Metadata
  confidence: number;
  aiModel: string;
}

/**
 * Analisa um exame em PDF ou imagem usando Claude AI
 */
export async function analyzeExam(
  filePath: string,
  fileType: 'pdf' | 'image'
): Promise<ExamAnalysisResult> {
  try {
    console.log('📄 Analisando exame:', filePath);

    // Ler arquivo
    const fileBuffer = fs.readFileSync(filePath);
    const base64 = fileBuffer.toString('base64');

    // Determinar media type dinamicamente
    const mediaType = resolveMediaType(filePath, fileType);

    // Prompt especializado para análise de exames
    const prompt = `Você é um especialista em análise de exames laboratoriais e está ajudando a Dra. Thayná Marra, farmacêutica especializada em Análise do Sangue Vivo.

Analise este exame laboratorial e extraia as seguintes informações:

1. **CATEGORIZAÇÃO:**
   - Tipo de exame (Hemograma, Lipidograma, Hormônios, etc.)
   - Subcategoria específica
   - Data do exame (se visível)

2. **DADOS EXTRAÍDOS:**
   - Todos os parâmetros e seus valores
   - Valores de referência
   - Unidades de medida

3. **ACHADOS PRINCIPAIS:**
   - Valores alterados (acima ou abaixo da referência)
   - Valores críticos (se houver)
   - Padrões importantes

4. **RESUMO CLÍNICO:**
   - Resumo geral do exame
   - Interpretação dos achados
   - Possíveis correlações clínicas

Retorne um JSON estruturado com todas essas informações.

**IMPORTANTE:**
- Seja preciso com números e unidades
- Identifique claramente valores alterados
- Use terminologia médica adequada
- Se não conseguir ler algo, indique "Não identificado"`;

    // Fazer análise com Claude (suporta imagens e PDFs)
    const fileContent: any = fileType === 'pdf'
      ? ({
          type: 'document' as const,
          source: {
            type: 'base64' as const,
            media_type: 'application/pdf' as const,
            data: base64,
          },
        })
      : ({
          type: 'image' as const,
          source: {
            type: 'base64' as const,
            media_type: mediaType as 'image/png' | 'image/webp' | 'image/gif' | 'image/bmp' | 'image/tiff' | 'image/jpeg',
            data: base64,
          },
        });

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      temperature: 0.2, // Baixa para maior precisão
      messages: [
        {
          role: 'user',
          content: [
            fileContent,
            {
              type: 'text',
              text: prompt,
            },
          ],
        },
      ],
    });

    // Registrar resposta crua para depuração
    try {
      logRawAnthropicResponse(path.basename(filePath), response);
    } catch (error) {
      console.error('Falha ao logar resposta da Anthropic:', error);
    }

    // Extrair resposta
    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Resposta inesperada da API');
    }

    const rawText = content.text.trim();

    // Tentar extrair JSON da resposta (considerando blocos ```json``` ou primeiro objeto encontrado)
    const fencedJson = rawText.match(/```json\s*([\s\S]*?)```/i);
    const plainJson = rawText.match(/\{[\s\S]*\}/);

    let parsed: any | null = null;

    if (fencedJson && fencedJson[1]) {
      try {
        parsed = JSON.parse(fencedJson[1]);
      } catch (error) {
        console.warn('Falha ao parsear JSON dentro de bloco ```json```:', error);
      }
    }

    if (!parsed && plainJson) {
      try {
        parsed = JSON.parse(plainJson[0]);
      } catch (error) {
        console.warn('Falha ao parsear JSON simples:', error);
      }
    }

    // Se não conseguiu JSON, retorna fallback com texto bruto
    if (!parsed) {
      return {
        category: EXAM_CATEGORIES.OTHER,
        subCategory: undefined,
        examType: 'Não identificado',
        examDate: undefined,
        extractedData: { rawText },
        keyFindings: [],
        abnormalValues: [],
        summary: rawText,
        recommendations: [],
        confidence: 0.5,
        aiModel: MODEL,
      };
    }

    const result = parsed;

    console.log('✅ Exame analisado com sucesso');

    const categorizacao = result.categorizacao || {};
    const resumoClinico = result.resumo_clinico || {};
    const achadosPrincipais = result.achados_principais || {};

    const principaisAchadosResumo: string[] = []
    ensureArray(achadosPrincipais.valores_alterados).forEach((item: any) => {
      const parametro = item.parametro || item.nome
      const texto =
        item.significado ||
        item.observacao ||
        item.status ||
        item.classificacao ||
        ''
      if (parametro && texto) {
        principaisAchadosResumo.push(`${parametro}: ${texto}`)
      }
    })

    ensureArray(achadosPrincipais.valores_limites).forEach((item: any) => {
      const parametro = item.parametro || item.nome
      const texto =
        item.observacao ||
        item.significado ||
        item.status ||
        ''
      if (parametro && texto) {
        principaisAchadosResumo.push(`${parametro}: ${texto}`)
      }
    })

    const summaryCandidates = [
      result.summary,
      resumoClinico.resumo_geral,
      resumoClinico.status_geral,
      resumoClinico.interpretacao_geral,
      resumoClinico.conclusao,
      resumoClinico.resumo,
      Array.isArray(resumoClinico.interpretacao_achados)
        ? resumoClinico.interpretacao_achados.join(" ")
        : resumoClinico.interpretacao_achados,
    ].filter(
      (value): value is string =>
        typeof value === "string" && value.trim().length > 0
    );

    let summary = summaryCandidates[0];

    if (!summary) {
      const seriesKeys = [
        "serie_vermelha",
        "serie_branca",
        "serie_plaquetaria",
        "serie_plaq",
        "serie_vermelha_plaquetas",
      ];
      const extraParts: string[] = [];

      if (
        typeof resumoClinico.status_geral === "string" &&
        resumoClinico.status_geral.trim()
      ) {
        extraParts.push(resumoClinico.status_geral.trim());
      }

      seriesKeys.forEach((key) => {
        const section = resumoClinico[key];
        if (
          section?.interpretacao &&
          typeof section.interpretacao === "string"
        ) {
          extraParts.push(section.interpretacao.trim());
        }
      });

      if (principaisAchadosResumo.length > 0) {
        extraParts.push(
          `Principais achados: ${principaisAchadosResumo.join('; ')}`
        )
      }

      if (extraParts.length > 0) {
        summary = extraParts.join(" ");
      }
    }

    if (!summary) {
      summary = "Análise não disponível";
    }

    const examType = result.examType || categorizacao.tipo_exame || 'Não identificado';
    const category =
      result.category ||
      categorizacao.tipo_exame ||
      categorizacao.area ||
      categorizacao.grupo ||
      EXAM_CATEGORIES.OTHER;

    const examDateRaw = result.examDate || categorizacao.data_coleta || categorizacao.data || categorizacao.data_liberacao;
    const examDate = examDateRaw ? new Date(examDateRaw) : undefined;

    const abnormalValues = Array.isArray(result.abnormalValues)
      ? result.abnormalValues
      : (achadosPrincipais.valores_alterados || []).map((item: any) => ({
          parameter: item.parametro || item.nome || item.campo || 'Parâmetro não identificado',
          value: String(item.valor ?? item.valor_atual ?? ''),
          reference: item.referencia || item.intervalo_referencia || '',
          status: (item.status || item.classificacao || 'ALTERADO').toUpperCase(),
        }));

    const keyFindingsList: Array<{
      parameter?: string
      value?: string
      reference?: string
      status?: string
      description?: string
    }> = [];

    const keyFindingsArray = Array.isArray(result.keyFindings) ? result.keyFindings : [];

    keyFindingsArray.forEach((item: any) => {
      if (!item && item !== 0) {
        return
      }

      if (typeof item === 'string') {
        keyFindingsList.push({ description: item })
        return
      }

      keyFindingsList.push({
        parameter: item.parameter || item.parametro || item.nome,
        value: item.value ?? item.valor ?? item.valor_atual,
        reference: item.reference || item.referencia || item.intervalo_referencia,
        status: item.status || item.classificacao,
        description: item.description || item.descricao || item.achado || item.significado,
      })
    })

    ;(achadosPrincipais.valores_alterados || []).forEach((item: any) => {
      keyFindingsList.push({
        parameter: item.parametro || item.nome,
        value: item.valor ?? item.valor_atual,
        reference: item.referencia,
        status: item.status || item.classificacao,
        description: item.significado || item.observacao,
      })
    })

    ;(achadosPrincipais.valores_limites || []).forEach((item: any) => {
      keyFindingsList.push({
        parameter: item.parametro || item.nome,
        value: item.valor,
        reference: item.referencia,
        status: item.status || 'Limite',
        description: item.observacao,
      })
    })

    ;(achadosPrincipais.valores_normais_relevantes || []).forEach((item: any) => {
      keyFindingsList.push({
        parameter: item.parametro || item.nome,
        value: item.valor,
        reference: item.referencia,
        status: item.status || 'Normal',
        description: item.descricao || item.significado,
      })
    })

    ensureArray(resumoClinico.correlacoes_clinicas).forEach((item: any) => {
      keyFindingsList.push({
        parameter: item.achado || item.descricao,
        description: item.significado || item.interpretacao || item.achado,
        status: item.status,
      })
    })

    const keyFindings = keyFindingsList.filter(
      finding => finding.parameter || finding.description
    )

    const recommendationsSource = result.recommendations || (
      ensureArray(resumoClinico.correlacoes_clinicas).flatMap((item: any) => item?.recomendacoes || [])
        .concat(ensureArray(resumoClinico.recomendacoes))
    );

    const recommendations = Array.isArray(recommendationsSource)
      ? recommendationsSource
      : recommendationsSource
        ? [String(recommendationsSource)]
        : [];

    let extractedData: Record<string, any>;
    if (result.extractedData) {
      extractedData = typeof result.extractedData === 'string'
        ? JSON.parse(result.extractedData)
        : result.extractedData;
    } else {
      extractedData = result;
    }

    return {
      category,
      subCategory: result.subCategory || categorizacao.subtipo,
      examType,
      examDate: examDate && !Number.isNaN(examDate.getTime()) ? examDate : undefined,
      extractedData,
      keyFindings,
      abnormalValues,
      summary,
      recommendations,
      confidence: Number(result.confidence || resumoClinico.confianca || 0.9),
      aiModel: MODEL,
    };

  } catch (error) {
    console.error('❌ Erro ao analisar exame:', error);

    const message = error instanceof Error ? error.message : 'Erro desconhecido';

    if (message.includes('credit balance')) {
      throw new Error('Falha na análise: créditos insuficientes na Anthropic. Acesse o painel da Anthropic para recarregar antes de tentar novamente.');
    }

    throw new Error(`Falha na análise: ${message}`);
  }
}

/**
 * Analisa múltiplos exames em lote
 */
export async function analyzeExamBatch(
  files: Array<{ path: string; type: 'pdf' | 'image' }>
): Promise<ExamAnalysisResult[]> {
  const results: ExamAnalysisResult[] = [];

  for (const file of files) {
    try {
      const result = await analyzeExam(file.path, file.type);
      results.push(result);
    } catch (error) {
      console.error(`Erro ao analisar ${file.path}:`, error);
      // Continua com os outros arquivos
    }
  }

  return results;
}

/**
 * Compara valores de exame com referências
 */
export function compareWithReference(
  value: number,
  minRef: number,
  maxRef: number
): 'NORMAL' | 'HIGH' | 'LOW' | 'CRITICAL_HIGH' | 'CRITICAL_LOW' {
  const criticalThreshold = 0.3; // 30% além dos limites = crítico

  if (value < minRef) {
    const deviation = (minRef - value) / minRef;
    return deviation > criticalThreshold ? 'CRITICAL_LOW' : 'LOW';
  }

  if (value > maxRef) {
    const deviation = (value - maxRef) / maxRef;
    return deviation > criticalThreshold ? 'CRITICAL_HIGH' : 'HIGH';
  }

  return 'NORMAL';
}

/**
 * Gera resumo consolidado de múltiplos exames
 */
export async function generateExamsSummary(
  exams: ExamAnalysisResult[]
): Promise<string> {
  try {
    const prompt = `Com base nestes ${exams.length} exames laboratoriais, gere um resumo consolidado:

${JSON.stringify(exams, null, 2)}

Crie um resumo clínico que inclua:
1. Visão geral dos exames realizados
2. Principais alterações encontradas
3. Padrões ou correlações importantes
4. Recomendações gerais

Use linguagem técnica mas acessível.`;

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Resposta inesperada');
    }

    return content.text;

  } catch (error) {
    console.error('Erro ao gerar resumo:', error);
    return 'Não foi possível gerar resumo consolidado.';
  }
}

/**
 * Calcula custo da análise
 * Claude Sonnet 4.5 com visão: ~$3/milhão input, ~$15/milhão output
 */
export function estimateAnalysisCost(
  fileSize: number, // bytes
  inputTokens: number,
  outputTokens: number
): number {
  // Custo base por imagem/PDF
  const baseCost = 0.05;

  // Custo por tokens
  const inputCost = (inputTokens / 1_000_000) * 3;
  const outputCost = (outputTokens / 1_000_000) * 15;

  return baseCost + inputCost + outputCost;
}
