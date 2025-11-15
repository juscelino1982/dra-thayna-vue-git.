import Anthropic from '@anthropic-ai/sdk'
import { PrismaClient } from '@prisma/client'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const prisma = new PrismaClient()

export interface ReportData {
  patientInfo: {
    fullName: string
    age?: number
    bloodType?: string
    phone: string
    email?: string
  }
  consultation?: {
    date: Date
    transcription?: string
    chiefComplaint?: string
    symptoms?: string
  }
  exams?: Array<{
    category: string
    examDate?: Date
    aiSummary?: string
    abnormalValues?: string
    keyFindings?: string
  }>
  medicalHistory?: string
  currentMedications?: string
  allergies?: string
}

/**
 * Gera um relatório completo usando Claude AI
 */
export async function generateReport(data: ReportData): Promise<{
  fullReportContent: string
  mainFindings: string[]
  recommendations: string[]
  summary: string
}> {
  try {
    console.log('[Relatório] Gerando relatório com Claude AI...')

    const prompt = buildReportPrompt(data)

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      temperature: 0.3,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    })

    const responseText =
      message.content[0].type === 'text' ? message.content[0].text : ''

    // Parsear a resposta estruturada
    const parsed = parseReportResponse(responseText)

    console.log('[Relatório] Relatório gerado com sucesso!')

    return parsed
  } catch (error: any) {
    console.error('[Relatório] Erro:', error)
    throw new Error(`Erro ao gerar relatório: ${error.message}`)
  }
}

/**
 * Constrói o prompt para geração do relatório
 */
function buildReportPrompt(data: ReportData): string {
  const { patientInfo, consultation, exams, medicalHistory, currentMedications, allergies } =
    data

  let prompt = `Você é uma assistente especializada em análise de sangue vivo e medicina integrativa.

Gere um relatório profissional completo para a Dra. Thayná Marra com base nas seguintes informações:

## INFORMAÇÕES DO PACIENTE
- Nome: ${patientInfo.fullName}
- Idade: ${patientInfo.age ? `${patientInfo.age} anos` : 'Não informada'}
- Tipo Sanguíneo: ${patientInfo.bloodType || 'Não informado'}
- Contato: ${patientInfo.phone}${patientInfo.email ? ` | ${patientInfo.email}` : ''}
`

  if (allergies) {
    prompt += `\n### Alergias
${allergies}
`
  }

  if (currentMedications) {
    prompt += `\n### Medicações Atuais
${currentMedications}
`
  }

  if (medicalHistory) {
    prompt += `\n### Histórico Médico
${medicalHistory}
`
  }

  if (consultation) {
    prompt += `\n## CONSULTA (${new Date(consultation.date).toLocaleDateString('pt-BR')})
`

    if (consultation.chiefComplaint) {
      prompt += `\n### Queixa Principal
${consultation.chiefComplaint}
`
    }

    if (consultation.symptoms) {
      prompt += `\n### Sintomas
${consultation.symptoms}
`
    }

    if (consultation.transcription) {
      prompt += `\n### Transcrição da Consulta
${consultation.transcription}
`
    }
  }

  if (exams && exams.length > 0) {
    prompt += `\n## EXAMES ANALISADOS
`

    exams.forEach((exam, index) => {
      prompt += `\n### Exame ${index + 1}: ${exam.category}
${exam.examDate ? `Data: ${new Date(exam.examDate).toLocaleDateString('pt-BR')}` : ''}

${exam.aiSummary || ''}

${
  exam.keyFindings
    ? `**Achados principais:**
${exam.keyFindings}
`
    : ''
}

${
  exam.abnormalValues
    ? `**Valores alterados:**
${exam.abnormalValues}
`
    : ''
}
`
    })
  }

  prompt += `

## INSTRUÇÕES PARA O RELATÓRIO

Gere um relatório médico profissional seguindo esta estrutura EXATA:

### RESUMO EXECUTIVO
[Resumo geral do estado de saúde do paciente em 2-3 parágrafos]

### ACHADOS PRINCIPAIS
- [Achado 1]
- [Achado 2]
- [Achado 3]
...

### ANÁLISE DETALHADA

#### Análise Microscópica - Campo Claro
- **Hemácias:** [descrição]
- **Leucócitos:** [descrição]
- **Plaquetas:** [descrição]
- **Plasma:** [descrição]

#### Análise Microscópica - Campo Escuro
- **Atividade Microbiana:** [descrição]
- **Cristalizações:** [descrição]
- **Debris Celulares:** [descrição]

### CORRELAÇÃO CLÍNICA
[Análise integrativa conectando os achados com sintomas e histórico]

### ORIENTAÇÕES TERAPÊUTICAS

#### Suplementação
- [Suplemento 1] - [dosagem] - [justificativa]
- [Suplemento 2] - [dosagem] - [justificativa]

#### Fitoterapia
- [Fitoterápico 1] - [forma de uso] - [benefícios]
- [Fitoterápico 2] - [forma de uso] - [benefícios]

#### Orientações Nutricionais
- [Orientação 1]
- [Orientação 2]

#### Estilo de Vida
- [Recomendação 1]
- [Recomendação 2]

### ACOMPANHAMENTO
- Retorno sugerido: [período]
- Exames complementares: [se necessário]

---

Responda APENAS com o relatório formatado em Markdown, sem nenhum texto adicional antes ou depois.`

  return prompt
}

/**
 * Parseia a resposta do Claude e extrai informações estruturadas
 */
function parseReportResponse(responseText: string): {
  fullReportContent: string
  mainFindings: string[]
  recommendations: string[]
  summary: string
} {
  // Extrair resumo (primeira seção)
  const summaryMatch = responseText.match(/### RESUMO EXECUTIVO\n([\s\S]*?)###/)
  const summary = summaryMatch ? summaryMatch[1].trim() : ''

  // Extrair achados principais
  const findingsMatch = responseText.match(/### ACHADOS PRINCIPAIS\n([\s\S]*?)###/)
  const findingsText = findingsMatch ? findingsMatch[1].trim() : ''
  const mainFindings = findingsText
    .split('\n')
    .filter((line) => line.trim().startsWith('-'))
    .map((line) => line.replace(/^-\s*/, '').trim())

  // Extrair recomendações (todas as orientações terapêuticas)
  const recommendationsMatch = responseText.match(
    /### ORIENTAÇÕES TERAPÊUTICAS\n([\s\S]*?)###/
  )
  const recommendationsText = recommendationsMatch ? recommendationsMatch[1].trim() : ''
  const recommendations = recommendationsText
    .split('\n')
    .filter((line) => line.trim().startsWith('-'))
    .map((line) => line.replace(/^-\s*/, '').trim())

  return {
    fullReportContent: responseText,
    mainFindings,
    recommendations,
    summary,
  }
}

/**
 * Gera um relatório completo para um paciente específico
 */
export async function generatePatientReport(
  patientId: string,
  consultationId?: string
): Promise<any> {
  try {
    // Buscar dados do paciente
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      include: {
        exams: {
          where: {
            processingStatus: 'COMPLETED',
          },
          orderBy: {
            examDate: 'desc',
          },
          take: 10, // Últimos 10 exames
        },
        consultations: consultationId
          ? {
              where: { id: consultationId },
            }
          : {
              orderBy: {
                date: 'desc',
              },
              take: 1,
            },
      },
    })

    if (!patient) {
      throw new Error('Paciente não encontrado')
    }

    // Calcular idade
    const age = patient.birthDate
      ? new Date().getFullYear() - new Date(patient.birthDate).getFullYear()
      : undefined

    // Preparar dados para o relatório
    const reportData: ReportData = {
      patientInfo: {
        fullName: patient.fullName,
        age,
        bloodType: patient.bloodType || undefined,
        phone: patient.phone,
        email: patient.email || undefined,
      },
      consultation: patient.consultations[0]
        ? {
            date: patient.consultations[0].date,
            transcription: patient.consultations[0].transcription || undefined,
            chiefComplaint: patient.consultations[0].chiefComplaint || undefined,
            symptoms: patient.consultations[0].symptoms || undefined,
          }
        : undefined,
      exams: patient.exams.map((exam) => ({
        category: exam.category || 'Outros',
        examDate: exam.examDate || undefined,
        aiSummary: exam.aiSummary || undefined,
        abnormalValues: exam.abnormalValues || undefined,
        keyFindings: exam.keyFindings || undefined,
      })),
      medicalHistory: patient.medicalHistory || undefined,
      currentMedications: patient.currentMedications || undefined,
      allergies: patient.allergies || undefined,
    }

    // Gerar relatório
    const report = await generateReport(reportData)

    return report
  } catch (error: any) {
    console.error('[Relatório] Erro ao gerar relatório do paciente:', error)
    throw error
  }
}
