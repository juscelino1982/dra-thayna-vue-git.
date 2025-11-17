/**
 * Serviço de Armazenamento de Arquivos
 *
 * Suporta dois modos:
 * - Desenvolvimento: Armazenamento local (./uploads)
 * - Produção (Vercel): Vercel Blob Storage
 */

import { put, del } from '@vercel/blob';
import fs from 'fs';
import path from 'path';

const isProduction = process.env.NODE_ENV === 'production';
const isVercel = !!process.env.VERCEL;

/**
 * Faz upload de um arquivo
 *
 * @param file - Buffer ou stream do arquivo
 * @param filename - Nome do arquivo
 * @param folder - Pasta de destino (ex: 'consultations', 'exams')
 * @returns URL pública do arquivo
 */
export async function uploadFile(
  file: Buffer,
  filename: string,
  folder: string = 'uploads'
): Promise<string> {
  // Produção (Vercel): Usar Vercel Blob Storage
  if (isProduction && isVercel) {
    try {
      const blob = await put(`${folder}/${filename}`, file, {
        access: 'public',
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });

      console.log('✅ Arquivo enviado para Vercel Blob:', blob.url);
      return blob.url;
    } catch (error) {
      console.error('❌ Erro ao enviar para Vercel Blob:', error);
      throw new Error('Falha ao fazer upload do arquivo');
    }
  }

  // Desenvolvimento: Armazenamento local
  const uploadDir = path.join(process.cwd(), 'uploads', folder);

  // Criar diretório se não existir
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const filePath = path.join(uploadDir, filename);

  try {
    fs.writeFileSync(filePath, file);
    console.log('✅ Arquivo salvo localmente:', filePath);

    // Retornar URL relativa para desenvolvimento
    return `/uploads/${folder}/${filename}`;
  } catch (error) {
    console.error('❌ Erro ao salvar arquivo localmente:', error);
    throw new Error('Falha ao salvar arquivo');
  }
}

/**
 * Deleta um arquivo
 *
 * @param fileUrl - URL do arquivo (Blob URL ou path local)
 */
export async function deleteFile(fileUrl: string): Promise<void> {
  // Se for URL do Vercel Blob
  if (fileUrl.startsWith('https://') && fileUrl.includes('vercel-storage')) {
    try {
      await del(fileUrl, {
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });
      console.log('✅ Arquivo deletado do Vercel Blob:', fileUrl);
    } catch (error) {
      console.error('❌ Erro ao deletar do Vercel Blob:', error);
      throw error;
    }
    return;
  }

  // Se for path local
  if (fileUrl.startsWith('/uploads/')) {
    const filePath = path.join(process.cwd(), fileUrl);

    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log('✅ Arquivo deletado localmente:', filePath);
      }
    } catch (error) {
      console.error('❌ Erro ao deletar arquivo local:', error);
      throw error;
    }
    return;
  }

  console.warn('⚠️ URL de arquivo não reconhecida:', fileUrl);
}

/**
 * Valida o tipo de arquivo
 */
export function validateFileType(
  mimetype: string,
  allowedTypes: string[]
): boolean {
  return allowedTypes.some(type => {
    if (type.endsWith('/*')) {
      const baseType = type.replace('/*', '');
      return mimetype.startsWith(baseType);
    }
    return mimetype === type;
  });
}

/**
 * Valida o tamanho do arquivo
 */
export function validateFileSize(
  size: number,
  maxSize: number = 50 * 1024 * 1024 // 50MB padrão
): boolean {
  return size <= maxSize;
}

/**
 * Gera nome de arquivo único
 */
export function generateUniqueFilename(originalName: string): string {
  const ext = path.extname(originalName);
  const name = path.basename(originalName, ext);
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);

  return `${name}-${timestamp}-${random}${ext}`;
}

/**
 * Configuração do storage
 */
export const storageConfig = {
  isProduction,
  isVercel,
  storageType: isProduction && isVercel ? 'vercel-blob' : 'local',
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '52428800'), // 50MB
};

console.log('📁 Storage configurado:', storageConfig.storageType);
