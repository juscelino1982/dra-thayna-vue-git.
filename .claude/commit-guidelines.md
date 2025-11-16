# Diretrizes para Commits

## IMPORTANTE: Não incluir assinatura do Claude

**NÃO** adicionar as seguintes linhas nos commits:

```
🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

## Formato padrão de commit

Usar apenas:
```
tipo: descrição breve

Descrição detalhada do que foi alterado e por quê (se necessário).
```

Exemplos:
- `feat: adicionar validação de CPF no cadastro de pacientes`
- `fix: corrigir erro 500 ao listar pacientes na Vercel`
- `refactor: implementar singleton do Prisma para ambientes serverless`
- `docs: atualizar README com instruções de deploy`
