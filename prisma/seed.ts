/**
 * Script de Seed - Dados Iniciais para Desenvolvimento
 * Sistema Dra. Thayná Marra
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...');

  // Limpar dados existentes (cuidado em produção!)
  if (process.env.NODE_ENV === 'development') {
    console.log('🗑️  Limpando dados antigos...');
    await prisma.apiUsage.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.chatMessage.deleteMany();
    await prisma.chatConversation.deleteMany();
    await prisma.reportTemplate.deleteMany();
    await prisma.report.deleteMany();
    await prisma.consultation.deleteMany();
    await prisma.patient.deleteMany();
    await prisma.user.deleteMany();
  }

  // 1. Criar usuário admin (Dra. Thayná)
  console.log('👩‍⚕️ Criando usuário admin...');
  const admin = await prisma.user.create({
    data: {
      email: 'drathaynamarra@email.com',
      name: 'Dra. Thayná Marra',
      // Senha: "senha123" (você deve usar bcrypt em produção)
      passwordHash: '$2a$10$rOjLHZhxSz9YK9YqYqYqYe9YqYqYqYqYqYqYqYqYqYqYqYqYqYqYq',
      role: 'ADMIN', // String: "ADMIN" ou "STAFF"
    },
  });
  console.log(`✅ Admin criado: ${admin.email}`);

  // 2. Criar pacientes de teste
  console.log('🩸 Criando pacientes de teste...');

  const paciente1 = await prisma.patient.create({
    data: {
      fullName: 'Ana Paula Costa Silva',
      email: 'anapaula@email.com',
      phone: '(61) 98765-4321',
      birthDate: new Date('1982-03-15'),
      cpf: '123.456.789-00',
      city: 'Brasília',
      state: 'DF',
      bloodType: 'O+',
      currentMedications: 'Omeprazol 20mg',
      medicalHistory: 'Gastrite há 3 anos',
      consentGiven: true,
      consentDate: new Date(),
      consentVersion: '1.0',
      totalConsultations: 1,
    },
  });

  const paciente2 = await prisma.patient.create({
    data: {
      fullName: 'Carlos Eduardo Santos',
      email: 'carlos@email.com',
      phone: '(61) 99876-5432',
      birthDate: new Date('1975-07-22'),
      cpf: '987.654.321-00',
      city: 'Brasília',
      state: 'DF',
      bloodType: 'A+',
      allergies: 'Dipirona',
      currentMedications: 'Nenhuma',
      consentGiven: true,
      consentDate: new Date(),
      consentVersion: '1.0',
    },
  });

  const paciente3 = await prisma.patient.create({
    data: {
      fullName: 'Maria Oliveira',
      email: 'maria@email.com',
      phone: '(61) 97654-3210',
      birthDate: new Date('1990-11-08'),
      city: 'São Paulo',
      state: 'SP',
      bloodType: 'B+',
      consentGiven: true,
      consentDate: new Date(),
      consentVersion: '1.0',
    },
  });

  console.log(`✅ ${3} pacientes criados`);

  // 3. Criar consulta de exemplo
  console.log('📋 Criando consulta de exemplo...');

  const consulta = await prisma.consultation.create({
    data: {
      patientId: paciente1.id,
      conductedBy: admin.id,
      date: new Date(),
      chiefComplaint: 'Cansaço constante há 6 meses',
      symptoms: 'Fadiga crônica, insônia, dores articulares nas mãos, constipação intestinal',
      medicalHistory: 'Gastrite há 3 anos em uso de Omeprazol',
      currentMedications: 'Omeprazol 20mg/dia',
      transcriptionStatus: 'COMPLETED',
      transcription: `Paciente relata cansaço intenso há aproximadamente 6 meses.
      Acorda cansada, sem disposição durante o dia, e à noite tem dificuldade para dormir.
      Também apresenta dores nas articulações das mãos, principalmente pela manhã.
      Intestino preso, evacuando a cada 4-5 dias. Histórico de gastrite há 3 anos.`,
      status: 'COMPLETED',
    },
  });

  console.log(`✅ Consulta criada`);

  // 4. Criar relatório de exemplo
  console.log('📄 Criando relatório de exemplo...');

  const relatorio = await prisma.report.create({
    data: {
      consultationId: consulta.id,
      patientId: paciente1.id,
      generatedBy: admin.id,

      // Campo Claro
      redBloodCells: 'Rouleaux intenso (85%), indicando acidose metabólica',
      whiteBloodCells: 'Mobilidade reduzida, alguns aderidos',
      platelets: 'Leve agregação',
      plasma: 'Turvo com presença de lipídios',

      // Campo Escuro
      microbialActivity: 'Discreta',
      crystallizations: 'Cristais abundantes (oxalato de cálcio)',
      cellularDebris: 'Debris celulares ++ (processo inflamatório)',

      // Achados
      mainFindings: JSON.stringify([
        'Acidose metabólica importante (rouleaux intenso)',
        'Sobrecarga de oxalato (cristalizações + dores articulares)',
        'Processo inflamatório sistêmico (debris celulares)',
        'Disbiose intestinal provável',
      ]),

      clinicalCorrelation: `O quadro de fadiga crônica correlaciona-se com acidose metabólica severa.
      As cristalizações de oxalato explicam as dores articulares matinais.
      O uso crônico de Omeprazol pode estar contribuindo para má absorção de nutrientes.`,

      // Orientações
      supplementation: JSON.stringify([
        'Magnésio Dimalato 400mg - 1x ao dia',
        'Vitamina D3 10.000 UI - 1x ao dia',
        'Probióticos multi-cepas - 2x ao dia',
        'Ômega 3 1000mg - 2x ao dia',
      ]),

      phytotherapy: JSON.stringify([
        'Cúrcuma 500mg - 2x ao dia',
        'Gengibre em chá - 2-3x ao dia',
        'Cardo Mariano 150mg - 2x ao dia',
      ]),

      nutritionalGuidance: JSON.stringify([
        'Reduzir: café, laticínios, chocolate',
        'Aumentar: água (2L/dia), vegetais verdes',
        'Alimentos alcalinizantes: limão, pepino, couve',
      ]),

      followUpDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 dias

      status: 'APPROVED',
      aiGenerated: true,
      aiModel: 'claude-sonnet-4-5',
      reviewedAt: new Date(),
    },
  });

  console.log(`✅ Relatório criado`);

  // 5. Criar templates de relatório
  console.log('📋 Criando templates...');

  await prisma.reportTemplate.create({
    data: {
      name: 'Template Padrão',
      description: 'Template completo para todos os tipos de análise',
      content: `# RELATÓRIO DE ANÁLISE DO SANGUE VIVO

## IDENTIFICAÇÃO DO PACIENTE
[Nome, data de nascimento, etc]

## ANAMNESE
[Queixa principal e sintomas]

## ANÁLISE MICROSCÓPICA
### Campo Claro
### Campo Escuro

## ACHADOS PRINCIPAIS
## CORRELAÇÃO CLÍNICA
## ORIENTAÇÕES TERAPÊUTICAS
## ACOMPANHAMENTO`,
      isDefault: true,
      isActive: true,
    },
  });

  await prisma.reportTemplate.create({
    data: {
      name: 'Template Detox',
      description: 'Foco em limpeza e eliminação de toxinas',
      content: `# PROTOCOLO DETOX - ANÁLISE DO SANGUE VIVO

## ANÁLISE DE TOXICIDADE
[Debris celulares, cristalizações]

## PROTOCOLO DE DESINTOXICAÇÃO
[Orientações específicas para detox]`,
      isDefault: false,
      isActive: true,
    },
  });

  console.log(`✅ ${2} templates criados`);

  // 6. Criar configurações do sistema
  console.log('⚙️ Criando configurações...');

  await prisma.systemConfig.createMany({
    data: [
      { key: 'clinic_name', value: 'Consultório Dra. Thayná Marra' },
      { key: 'clinic_phone', value: '(61) XXXXX-XXXX' },
      { key: 'clinic_email', value: 'contato@drathaynamarra.com.br' },
      { key: 'report_footer', value: 'Instagram: @drathaynamarra' },
    ],
  });

  console.log(`✅ Configurações criadas`);

  // 7. Criar conversas de chatbot de exemplo
  console.log('💬 Criando conversas de exemplo...');

  const conversation = await prisma.chatConversation.create({
    data: {
      patientId: paciente1.id,
      phone: '5561987654321',
      platform: 'whatsapp',
    },
  });

  await prisma.chatMessage.createMany({
    data: [
      {
        conversationId: conversation.id,
        sender: 'patient',
        content: 'Oi! O que é análise do sangue vivo?',
      },
      {
        conversationId: conversation.id,
        sender: 'bot',
        content: 'Olá! A Análise do Sangue Vivo é uma técnica que permite observar seu sangue em tempo real através de microscopia. É uma ferramenta complementar de avaliação da saúde. A Dra. Thayná é especialista nesta técnica! 🔬',
      },
      {
        conversationId: conversation.id,
        sender: 'patient',
        content: 'Quanto custa uma consulta?',
      },
      {
        conversationId: conversation.id,
        sender: 'bot',
        content: 'A consulta com análise do sangue vivo custa R$ 400. Inclui a coleta, análise completa e relatório detalhado. Gostaria de agendar?',
      },
    ],
  });

  console.log(`✅ Conversa de exemplo criada`);

  // Estatísticas finais
  const stats = {
    users: await prisma.user.count(),
    patients: await prisma.patient.count(),
    consultations: await prisma.consultation.count(),
    reports: await prisma.report.count(),
    templates: await prisma.reportTemplate.count(),
    chatConversations: await prisma.chatConversation.count(),
  };

  console.log('\n✅ Seed concluído com sucesso!\n');
  console.log('📊 Estatísticas:');
  console.log(`   👥 Usuários: ${stats.users}`);
  console.log(`   🩸 Pacientes: ${stats.patients}`);
  console.log(`   📋 Consultas: ${stats.consultations}`);
  console.log(`   📄 Relatórios: ${stats.reports}`);
  console.log(`   📋 Templates: ${stats.templates}`);
  console.log(`   💬 Conversas: ${stats.chatConversations}`);
  console.log('\n🎉 Banco pronto para uso!\n');
  console.log('👉 Execute "npm run db:studio" para visualizar os dados');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
