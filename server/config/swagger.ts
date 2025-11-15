import swaggerJsdoc from 'swagger-jsdoc'
import { Request, Response } from 'express'

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API Dra. Thayná Marra - Sistema de Análise do Sangue Vivo',
      version: '1.0.0',
      description: 'API completa para gerenciamento de pacientes, consultas, exames e relatórios de análise do sangue vivo',
      contact: {
        name: 'Suporte Técnico',
        email: 'suporte@drathayná.com.br'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Servidor de Desenvolvimento'
      },
      {
        url: 'https://api.drathayná.com.br',
        description: 'Servidor de Produção'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Insira o token JWT para autenticação'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Mensagem de erro'
            },
            message: {
              type: 'string',
              description: 'Descrição detalhada do erro'
            }
          }
        },
        Patient: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'ID único do paciente'
            },
            fullName: {
              type: 'string',
              description: 'Nome completo do paciente'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'E-mail do paciente'
            },
            phone: {
              type: 'string',
              description: 'Telefone do paciente'
            },
            birthDate: {
              type: 'string',
              format: 'date-time',
              description: 'Data de nascimento'
            },
            cpf: {
              type: 'string',
              description: 'CPF do paciente'
            },
            address: {
              type: 'string',
              description: 'Endereço completo'
            },
            city: {
              type: 'string',
              description: 'Cidade'
            },
            state: {
              type: 'string',
              description: 'Estado (UF)'
            },
            bloodType: {
              type: 'string',
              description: 'Tipo sanguíneo'
            },
            allergies: {
              type: 'string',
              description: 'Alergias conhecidas'
            },
            currentMedications: {
              type: 'string',
              description: 'Medicações em uso'
            },
            medicalHistory: {
              type: 'string',
              description: 'Histórico médico'
            },
            notes: {
              type: 'string',
              description: 'Observações gerais'
            },
            consentGiven: {
              type: 'boolean',
              description: 'Consentimento LGPD concedido'
            },
            totalConsultations: {
              type: 'integer',
              description: 'Total de consultas realizadas'
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        PatientInput: {
          type: 'object',
          required: ['fullName', 'phone'],
          properties: {
            fullName: {
              type: 'string',
              description: 'Nome completo do paciente'
            },
            email: {
              type: 'string',
              format: 'email'
            },
            phone: {
              type: 'string',
              description: 'Telefone do paciente'
            },
            birthDate: {
              type: 'string',
              format: 'date-time'
            },
            cpf: {
              type: 'string'
            },
            address: {
              type: 'string'
            },
            city: {
              type: 'string'
            },
            state: {
              type: 'string'
            },
            bloodType: {
              type: 'string'
            },
            allergies: {
              type: 'string'
            },
            currentMedications: {
              type: 'string'
            },
            medicalHistory: {
              type: 'string'
            },
            notes: {
              type: 'string'
            },
            consentGiven: {
              type: 'boolean'
            }
          }
        },
        Consultation: {
          type: 'object',
          properties: {
            id: {
              type: 'string'
            },
            patientId: {
              type: 'string'
            },
            conductedBy: {
              type: 'string'
            },
            date: {
              type: 'string',
              format: 'date-time'
            },
            chiefComplaint: {
              type: 'string',
              description: 'Queixa principal'
            },
            symptoms: {
              type: 'string',
              description: 'Sintomas relatados'
            },
            medicalHistory: {
              type: 'string'
            },
            currentMedications: {
              type: 'string'
            },
            status: {
              type: 'string',
              enum: ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']
            },
            transcription: {
              type: 'string',
              description: 'Transcrição do áudio da consulta'
            },
            transcriptionStatus: {
              type: 'string',
              enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED']
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        ConsultationInput: {
          type: 'object',
          required: ['patientId', 'conductedBy'],
          properties: {
            patientId: {
              type: 'string'
            },
            conductedBy: {
              type: 'string'
            },
            date: {
              type: 'string',
              format: 'date-time'
            },
            chiefComplaint: {
              type: 'string'
            },
            symptoms: {
              type: 'string'
            },
            medicalHistory: {
              type: 'string'
            },
            currentMedications: {
              type: 'string'
            },
            status: {
              type: 'string',
              enum: ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']
            }
          }
        },
        Exam: {
          type: 'object',
          properties: {
            id: {
              type: 'string'
            },
            patientId: {
              type: 'string'
            },
            fileName: {
              type: 'string'
            },
            fileUrl: {
              type: 'string'
            },
            fileType: {
              type: 'string'
            },
            fileSize: {
              type: 'integer'
            },
            category: {
              type: 'string',
              description: 'Categoria do exame'
            },
            examDate: {
              type: 'string',
              format: 'date-time'
            },
            aiSummary: {
              type: 'string',
              description: 'Resumo gerado pela IA'
            },
            extractedData: {
              type: 'string',
              description: 'Dados extraídos em JSON'
            },
            processingStatus: {
              type: 'string',
              enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED']
            },
            notes: {
              type: 'string'
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        Report: {
          type: 'object',
          properties: {
            id: {
              type: 'string'
            },
            consultationId: {
              type: 'string'
            },
            patientId: {
              type: 'string'
            },
            generatedBy: {
              type: 'string'
            },
            redBloodCells: {
              type: 'string',
              description: 'Análise das hemácias'
            },
            whiteBloodCells: {
              type: 'string',
              description: 'Análise dos leucócitos'
            },
            platelets: {
              type: 'string',
              description: 'Análise das plaquetas'
            },
            plasma: {
              type: 'string',
              description: 'Análise do plasma'
            },
            microbialActivity: {
              type: 'string',
              description: 'Atividade microbiana'
            },
            crystallizations: {
              type: 'string',
              description: 'Cristalizações observadas'
            },
            mainFindings: {
              type: 'string',
              description: 'Principais achados (JSON)'
            },
            clinicalCorrelation: {
              type: 'string',
              description: 'Correlação clínica'
            },
            supplementation: {
              type: 'string',
              description: 'Suplementação recomendada'
            },
            phytotherapy: {
              type: 'string',
              description: 'Fitoterapia recomendada'
            },
            nutritionalGuidance: {
              type: 'string',
              description: 'Orientações nutricionais'
            },
            otherRecommendations: {
              type: 'string',
              description: 'Outras recomendações'
            },
            followUpDate: {
              type: 'string',
              format: 'date-time',
              description: 'Data de retorno'
            },
            fullReportContent: {
              type: 'string',
              description: 'Conteúdo completo do relatório'
            },
            pdfUrl: {
              type: 'string',
              description: 'URL do PDF gerado'
            },
            status: {
              type: 'string',
              enum: ['DRAFT', 'PENDING_REVIEW', 'APPROVED', 'SENT']
            },
            aiGenerated: {
              type: 'boolean'
            },
            aiModel: {
              type: 'string'
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        ReportInput: {
          type: 'object',
          required: ['consultationId', 'patientId', 'generatedBy'],
          properties: {
            consultationId: {
              type: 'string'
            },
            patientId: {
              type: 'string'
            },
            generatedBy: {
              type: 'string'
            },
            redBloodCells: {
              type: 'string'
            },
            whiteBloodCells: {
              type: 'string'
            },
            platelets: {
              type: 'string'
            },
            plasma: {
              type: 'string'
            },
            microbialActivity: {
              type: 'string'
            },
            crystallizations: {
              type: 'string'
            },
            mainFindings: {
              type: 'string'
            },
            clinicalCorrelation: {
              type: 'string'
            },
            supplementation: {
              type: 'string'
            },
            phytotherapy: {
              type: 'string'
            },
            nutritionalGuidance: {
              type: 'string'
            },
            otherRecommendations: {
              type: 'string'
            },
            followUpDate: {
              type: 'string',
              format: 'date-time'
            },
            status: {
              type: 'string',
              enum: ['DRAFT', 'PENDING_REVIEW', 'APPROVED', 'SENT']
            }
          }
        }
      }
    },
    security: []
  },
  apis: ['./server/routes/*.ts', './server/index.ts']
}

export const swaggerSpec = swaggerJsdoc(options)

export const swaggerUiOptions = {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'API Dra. Thayná Marra',
  customfavIcon: '/favicon.ico'
}
