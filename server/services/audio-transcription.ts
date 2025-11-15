import OpenAI from 'openai'
import fs from 'fs/promises'
import path from 'path'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export interface TranscriptionResult {
  text: string
  duration?: number
  language?: string
  segments?: Array<{
    start: number
    end: number
    text: string
  }>
}

/**
 * Transcreve um arquivo de áudio usando OpenAI Whisper API
 * @param audioFilePath - Caminho completo do arquivo de áudio
 * @returns Resultado da transcrição
 */
export async function transcribeAudio(
  audioFilePath: string
): Promise<TranscriptionResult> {
  try {
    console.log(`[Transcrição] Iniciando transcrição do arquivo: ${audioFilePath}`)

    // Verificar se o arquivo existe
    const fileStats = await fs.stat(audioFilePath)
    if (!fileStats.isFile()) {
      throw new Error('Arquivo não encontrado')
    }

    // Criar stream do arquivo
    const audioStream = await fs.readFile(audioFilePath)
    const file = new File([audioStream], path.basename(audioFilePath), {
      type: getAudioMimeType(audioFilePath),
    })

    // Chamar Whisper API
    const startTime = Date.now()
    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: 'whisper-1',
      language: 'pt', // Português
      response_format: 'verbose_json', // Retorna mais detalhes
      temperature: 0.2, // Mais conservador = mais preciso
    })

    const duration = Date.now() - startTime

    console.log(`[Transcrição] Concluída em ${duration}ms`)
    console.log(`[Transcrição] Idioma detectado: ${transcription.language}`)
    console.log(`[Transcrição] Texto: ${transcription.text.substring(0, 100)}...`)

    return {
      text: transcription.text,
      duration: transcription.duration,
      language: transcription.language,
      segments: transcription.segments?.map((seg: any) => ({
        start: seg.start,
        end: seg.end,
        text: seg.text,
      })),
    }
  } catch (error: any) {
    console.error('[Transcrição] Erro:', error)
    throw new Error(`Erro ao transcrever áudio: ${error.message}`)
  }
}

/**
 * Detecta o MIME type baseado na extensão do arquivo
 */
function getAudioMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  const mimeTypes: Record<string, string> = {
    '.mp3': 'audio/mpeg',
    '.mp4': 'audio/mp4',
    '.m4a': 'audio/mp4',
    '.wav': 'audio/wav',
    '.webm': 'audio/webm',
    '.ogg': 'audio/ogg',
    '.mpeg': 'audio/mpeg',
  }
  return mimeTypes[ext] || 'audio/mpeg'
}

/**
 * Processa a transcrição e extrai informações estruturadas usando Claude
 */
export async function extractConsultationData(transcription: string): Promise<{
  chiefComplaint: string
  symptoms: string[]
  medicalHistory: string[]
  recommendations: string[]
  summary: string
}> {
  // Aqui podemos usar Claude para estruturar melhor a transcrição
  // Por enquanto, retornamos a transcrição como está
  // TODO: Implementar extração estruturada com Claude AI

  return {
    chiefComplaint: transcription.split('\n')[0] || '',
    symptoms: [],
    medicalHistory: [],
    recommendations: [],
    summary: transcription,
  }
}
