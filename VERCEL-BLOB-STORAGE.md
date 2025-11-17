# Vercel Blob Storage - Solução para Upload de Arquivos

## Problema

A Vercel usa **filesystem efêmero** em suas funções serverless. Isso significa que:

- ✅ Arquivos salvos em `/tmp` funcionam **durante a execução**
- ❌ Arquivos são **deletados** quando a função termina
- ❌ Erro **404** ao tentar acessar o arquivo depois

### Exemplo do problema:

```javascript
// ❌ NÃO FUNCIONA na Vercel
app.post('/upload', (req, res) => {
  const filePath = '/tmp/uploads/file.pdf'
  fs.writeFileSync(filePath, fileData) // Salva OK
  res.json({ url: filePath }) // ✅ Funciona agora
  // ❌ Mas depois de alguns segundos, o arquivo é DELETADO
})

// Quando tentar acessar depois:
// GET /tmp/uploads/file.pdf → 404 Not Found
```

## Solução: Vercel Blob Storage

Implementamos um serviço de armazenamento que funciona **tanto localmente quanto na Vercel**:

- 🏠 **Desenvolvimento local**: Salva em `./uploads/`
- ☁️ **Produção (Vercel)**: Usa Vercel Blob Storage

### Como funciona

```typescript
// server/services/file-storage.ts
export async function uploadFile(
  file: Buffer,
  filename: string,
  folder: string = 'uploads'
): Promise<string> {
  // Produção (Vercel): Vercel Blob Storage
  if (isProduction && isVercel) {
    const blob = await put(`${folder}/${filename}`, file, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    return blob.url; // https://xxxxx.public.blob.vercel-storage.com/...
  }

  // Desenvolvimento: Sistema de arquivos local
  const filePath = path.join(process.cwd(), 'uploads', folder, filename);
  fs.writeFileSync(filePath, file);
  return `/uploads/${folder}/${filename`; // /uploads/exams/file.pdf
}
```

## Configuração na Vercel

### 1. Criar Vercel Blob Storage

1. Acesse https://vercel.com/dashboard
2. Selecione seu projeto
3. Vá em **Storage** → **Create Database**
4. Escolha **Blob**
5. Clique em **Create**

### 2. Obter o Token

Após criar o Blob Storage:

1. Na página do Blob Storage, clique em **Settings**
2. Copie o valor de `BLOB_READ_WRITE_TOKEN`
3. Deve parecer com: `vercel_blob_rw_XXXXXXXXXXXXXXXXX`

### 3. Configurar Variável de Ambiente

**Opção A: Via Dashboard**

1. Vá em **Settings** → **Environment Variables**
2. Adicione:
   - **Name**: `BLOB_READ_WRITE_TOKEN`
   - **Value**: (cole o token copiado)
   - **Environments**: Production, Preview, Development

**Opção B: Via CLI**

```bash
vercel env add BLOB_READ_WRITE_TOKEN
```

Cole o token quando solicitado.

### 4. Fazer Redeploy

Após adicionar a variável:

```bash
vercel --prod
```

Ou faça commit e push para o repositório (se tiver deploy automático configurado).

## Arquivos Atualizados

### 1. `server/services/file-storage.ts` (NOVO)

Serviço central que gerencia upload/delete de arquivos:

```typescript
import { put, del } from '@vercel/blob';

// Detecta automaticamente o ambiente
const isProduction = process.env.NODE_ENV === 'production';
const isVercel = !!process.env.VERCEL;

// Upload: Vercel Blob ou local
export async function uploadFile(file: Buffer, filename: string, folder: string) {
  if (isProduction && isVercel) {
    // Vercel Blob
    const blob = await put(`${folder}/${filename}`, file, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    return blob.url;
  }

  // Local
  fs.writeFileSync(filePath, file);
  return `/uploads/${folder}/${filename}`;
}

// Delete: Vercel Blob ou local
export async function deleteFile(fileUrl: string) {
  if (fileUrl.startsWith('https://') && fileUrl.includes('vercel-storage')) {
    await del(fileUrl, { token: process.env.BLOB_READ_WRITE_TOKEN });
  } else {
    fs.unlinkSync(filePath);
  }
}
```

### 2. `server/routes/consultations.ts`

Atualizado para usar o novo serviço:

```typescript
import { uploadFile, generateUniqueFilename } from '../services/file-storage.js';

// Ler arquivo como buffer
const fileBuffer = await fs.readFile(audioFile.filepath);

// Gerar nome único
const uniqueFilename = generateUniqueFilename(audioFile.originalFilename);

// Upload (automático: Blob na Vercel, local em dev)
const fileUrl = await uploadFile(fileBuffer, uniqueFilename, 'consultations');

// Salvar URL no banco
await prisma.consultationAudio.create({
  data: {
    fileUrl: fileUrl, // URL pública do Vercel Blob ou path local
    // ...
  },
});
```

### 3. `server/routes/exams.ts`

Mesma abordagem:

```typescript
const fileBuffer = await fs.readFile(file.filepath);
const uniqueFilename = generateUniqueFilename(fileName);
const fileUrl = await uploadFile(fileBuffer, uniqueFilename, 'exams');

await prisma.exam.create({
  data: {
    fileUrl: fileUrl,
    // ...
  },
});
```

### 4. `server/services/exam-analysis.ts`

Suporta URLs remotas:

```typescript
export async function analyzeExam(
  filePathOrUrl: string,
  fileType: 'pdf' | 'image'
) {
  let fileBuffer: Buffer;

  if (filePathOrUrl.startsWith('http')) {
    // URL do Vercel Blob - baixar
    const response = await fetch(filePathOrUrl);
    const arrayBuffer = await response.arrayBuffer();
    fileBuffer = Buffer.from(arrayBuffer);
  } else {
    // Path local - ler
    fileBuffer = fs.readFileSync(filePathOrUrl);
  }

  // Converter para base64 e enviar para Claude AI
  const base64 = fileBuffer.toString('base64');
  // ...
}
```

## Fluxo de Upload

### Desenvolvimento Local

```
1. Cliente envia arquivo
   ↓
2. Formidable salva em /tmp
   ↓
3. file-storage.ts lê o buffer
   ↓
4. Salva em ./uploads/consultations/
   ↓
5. Retorna: "/uploads/consultations/arquivo.webm"
   ↓
6. Salva URL no banco
   ↓
7. Limpa arquivo temporário
```

### Produção (Vercel)

```
1. Cliente envia arquivo
   ↓
2. Formidable salva em /tmp
   ↓
3. file-storage.ts lê o buffer
   ↓
4. Envia para Vercel Blob via API
   ↓
5. Retorna: "https://xxx.blob.vercel-storage.com/consultations/arquivo.webm"
   ↓
6. Salva URL no banco
   ↓
7. Limpa arquivo temporário de /tmp
   ↓
8. Arquivo permanece no Blob (persistente!)
```

## Vantagens

### ✅ Funcionamento Dual

- Desenvolvimento: Sem custos, arquivos locais
- Produção: Armazenamento persistente na nuvem

### ✅ Transparente

O código da aplicação não precisa saber onde está rodando:

```typescript
// Mesmo código funciona em dev e prod!
const url = await uploadFile(buffer, filename, 'exams');
```

### ✅ URLs Públicas

Arquivos no Vercel Blob são acessíveis por URL pública:

```
https://xxxxx.public.blob.vercel-storage.com/exams/exame-123.pdf
```

### ✅ Análise com IA

O serviço de análise suporta ambos:

```typescript
// Local
await analyzeExam('/uploads/exams/file.pdf', 'pdf');

// Vercel Blob
await analyzeExam('https://xxx.blob.vercel-storage.com/exams/file.pdf', 'pdf');
```

## Custos

### Vercel Blob Storage

**Plano Hobby (Grátis):**
- 500 MB de armazenamento
- 1 GB de transferência/mês

**Plano Pro ($20/mês):**
- 100 GB de armazenamento incluído
- 1 TB de transferência incluído

**Excedente:**
- Armazenamento: $0.15/GB/mês
- Transferência: $0.15/GB

### Estimativa para Consultório

**Cenário típico:**
- 50 pacientes/mês
- 2 exames por paciente (média 5MB cada)
- 1 áudio por consulta (média 10MB)

**Total/mês:**
- Exames: 50 × 2 × 5MB = 500 MB
- Áudios: 50 × 10MB = 500 MB
- **Total: ~1 GB/mês**

**Custo:** Grátis no plano Hobby! 🎉

## Troubleshooting

### Erro: "Missing BLOB_READ_WRITE_TOKEN"

**Causa:** Token não configurado na Vercel

**Solução:**
1. Crie o Blob Storage na Vercel
2. Copie o token
3. Adicione em Environment Variables
4. Redeploy

### Erro: "Failed to upload to Vercel Blob"

**Causa:** Token inválido ou expirado

**Solução:**
1. Gere um novo token no dashboard
2. Atualize a variável de ambiente
3. Redeploy

### Arquivos ainda dando 404

**Causa:** Deploy antigo ainda em cache

**Solução:**
```bash
# Force redeploy
vercel --prod --force
```

### Desenvolvimento local não salva arquivos

**Causa:** Diretório `uploads/` não existe

**Solução:**
```bash
mkdir -p uploads/consultations
mkdir -p uploads/exams
```

## Migração de Dados Existentes

Se você já tem arquivos em `/tmp` ou `./uploads/` em produção e quer migrar para Vercel Blob:

```typescript
// Script de migração (exemplo)
import { put } from '@vercel/blob';
import fs from 'fs';
import { prisma } from './server/lib/prisma';

async function migrateToBlob() {
  const exams = await prisma.exam.findMany({
    where: {
      fileUrl: { startsWith: '/tmp' } // ou '/uploads'
    }
  });

  for (const exam of exams) {
    // Ler arquivo local
    const buffer = fs.readFileSync(exam.fileUrl);

    // Upload para Blob
    const blob = await put(`exams/${exam.fileName}`, buffer, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    // Atualizar URL no banco
    await prisma.exam.update({
      where: { id: exam.id },
      data: { fileUrl: blob.url }
    });

    console.log(`Migrado: ${exam.fileName}`);
  }
}
```

## Alternativas

Se você não quiser usar Vercel Blob, outras opções incluem:

1. **AWS S3** - Mais configuração, mas amplamente usado
2. **Cloudinary** - Ótimo para imagens, com otimização
3. **Google Cloud Storage** - Similar ao S3
4. **Supabase Storage** - Grátis até 1GB
5. **UploadThing** - Focado em Next.js/Vercel

## Referências

- [Vercel Blob Docs](https://vercel.com/docs/storage/vercel-blob)
- [Vercel Blob SDK](https://www.npmjs.com/package/@vercel/blob)
- [Vercel Filesystem](https://vercel.com/docs/functions/runtimes#filesystem)

---

**Versão:** 1.0.0
**Data:** 2025-11-16
**Status:** ✅ Implementado
