# Roadmap de Automacao da Tesouraria

## Objetivo principal

Reduzir o esforco operacional da tesouraria de 10+ horas/semana para 2-4 horas/semana, mantendo seguranca, controle e confiabilidade para a gestao atual e futura.

## KPIs de sucesso (acompanhamento semanal)

- Horas semanais gastas com operacao financeira
- Numero de lancamentos manuais vs. em lote
- Tempo medio de fechamento mensal
- Numero de ajustes/correcoes apos fechamento
- Numero de pendencias abertas por periodo
- Taxa de conciliacao automatica (quando aplicavel)

## Convencoes de status

- `pending`: ainda nao iniciado
- `in_progress`: em desenvolvimento
- `done`: concluido e validado
- `blocked`: depende de decisao/insumo externo

---

## Backlog mestre (priorizado)

### EPIC 0 - Diagnostico e baseline

| ID | Tarefa | Prioridade | Responsavel | Status | Criterio de aceite |
|---|---|---|---|---|---|
| E0-01 | Mapear fluxo atual ponta a ponta (lancamento, mensalidade, fechamento, reabertura) | Alta | Produto + Tesouraria | in_progress | Fluxograma validado com tesoureiro |
| E0-02 | Definir metas de KPI (alvo 30/60/90 dias) | Alta | Produto | pending | Documento de metas aprovado |
| E0-03 | Instrumentar metricas basicas no front/back | Alta | Dev | in_progress | Dashboard simples com dados reais |

### EPIC 1 - Produtividade operacional (quick wins)

| ID | Tarefa | Prioridade | Responsavel | Status | Criterio de aceite |
|---|---|---|---|---|---|
| E1-01 | Importacao em lote de lancamentos (CSV/Excel) | Alta | Dev | done | Importa arquivo com preview e salva lote |
| E1-02 | Validacao por linha com relatorio de erros | Alta | Dev | done | Linhas invalidas listadas sem abortar tudo |
| E1-03 | Templates de lancamentos recorrentes | Alta | Dev | done | Criar/aplicar template em 1 clique |
| E1-04 | Acao "Duplicar mes anterior" | Alta | Dev | done | Replica lancamentos recorrentes com revisao |
| E1-05 | Geracao automatica de mensalidades por periodo | Alta | Dev | done | Mensalidades criadas por regra do nucleo |
| E1-06 | Baixa coletiva de mensalidades | Alta | Dev | done | Confirmacao em massa com rastreabilidade |
| E1-07 | Melhorias de UX (filtros salvos, atalhos, defaults) | Media | Dev | in_progress | Reducao de cliques por tarefa |

### EPIC 2 - Evidencias fiscais + Google Drive

| ID | Tarefa | Prioridade | Responsavel | Status | Criterio de aceite |
|---|---|---|---|---|---|
| E2-01 | Definir estrategia de autenticacao (Service Account vs OAuth) | Alta | Arquitetura | done | Decisao tecnica registrada |
| E2-02 | Configurar credenciais seguras e escopos minimos | Alta | DevOps | done | Credenciais funcionando sem permissao excessiva |
| E2-03 | Modelar vinculo de evidencia no backend (`driveFileId`, `driveFolderId`, `webViewLink`) | Alta | Dev | done | Campos salvos e retornados via API |
| E2-04 | Implementar upload para Google Drive por pasta padrao (Nucleo/Ano/Mes/Tipo) | Alta | Dev | done | Arquivo sobe na pasta correta automaticamente |
| E2-05 | Implementar listagem e visualizacao de evidencias por lancamento/mensalidade | Alta | Dev | done | Usuario visualiza anexos vinculados |
| E2-06 | Definir e aplicar nomenclatura padrao de arquivos | Media | Produto + Dev | done | Nome de arquivo padrao gerado automaticamente |
| E2-07 | Tela de anexo/consulta no frontend integrada ao Drive | Alta | Dev | done | Fluxo completo anexar/abrir/remover vinculo |
| E2-08 | Migracao das evidencias antigas (vinculacao em lote) | Alta | Dev + Tesouraria | done | Importacao com log de sucesso/erro |
| E2-09 | Tratamento de arquivo movido/removido no Drive | Media | Dev | done | Sistema sinaliza link quebrado e permite relink |
| E2-10 | Auditoria de evidencias (quem anexou/trocou/quando) | Alta | Dev | done | Historico consultavel por registro |
| E2-11 | Regra de obrigatoriedade de comprovante por tipo/valor/status | Alta | Dev + Produto | done | Bloqueio/alerta aplicado conforme politica |

### EPIC 3 - Controle e governanca

| ID | Tarefa | Prioridade | Responsavel | Status | Criterio de aceite |
|---|---|---|---|---|---|
| E3-01 | Fechamento hard-lock de periodo | Alta | Dev | done | Periodo fechado nao permite alteracoes |
| E3-02 | Reabertura com justificativa obrigatoria | Alta | Dev | done | Reabertura salva justificativa e autor |
| E3-03 | Trilha de auditoria de-para nas entidades criticas | Alta | Dev | done | Alteracoes registradas com before/after |
| E3-04 | Permissoes granulares por acao | Alta | Dev | done | Acoes sensiveis restritas por permissao |
| E3-05 | Fluxo de aprovacao por alcada (dupla validacao) | Media | Dev + Produto | done | Valores acima do limite exigem aprovacao |

### EPIC 4 - Conciliacao e fechamento assistido

| ID | Tarefa | Prioridade | Responsavel | Status | Criterio de aceite |
|---|---|---|---|---|---|
| E4-01 | Importacao de extrato bancario (OFX/CSV) | Media | Dev | in_progress | Extrato processado com normalizacao |
| E4-02 | Matching semiautomatico lancamento x extrato | Media | Dev | pending | Sugestoes de conciliacao com score |
| E4-03 | Fila de divergencias para tratamento | Media | Dev | pending | Divergencias editaveis e rastreaveis |
| E4-04 | Checklist pre-fechamento automatico | Alta | Dev | done | Fechamento bloqueado com pendencias criticas |
| E4-05 | Alertas automáticos (pendencias, atraso de processo) | Media | Dev | done | Alertas visiveis no dashboard |

### EPIC 5 - Relatorios e continuidade institucional

| ID | Tarefa | Prioridade | Responsavel | Status | Criterio de aceite |
|---|---|---|---|---|---|
| E5-01 | Relatorios operacionais (pendencias, inadimplencia, aging) | Media | Dev | pending | Relatorios com filtro por periodo/nucleo |
| E5-02 | Relatorios gerenciais (fluxo de caixa e comparativos) | Media | Dev | pending | Indicadores mensais exportaveis |
| E5-03 | Exportacao oficial PDF/Excel com versao/hash | Media | Dev | pending | Arquivo exportado com integridade |
| E5-04 | Manual operacional da tesouraria (runbook) | Alta | Produto + Tesouraria | pending | Manual validado e usado no treinamento |

### EPIC 6 - Qualidade tecnica e resiliencia

| ID | Tarefa | Prioridade | Responsavel | Status | Criterio de aceite |
|---|---|---|---|---|---|
| E6-01 | Cobertura de testes para fluxos criticos | Alta | Dev | pending | Testes cobrindo fechamento/reabertura/importacoes |
| E6-02 | Logs estruturados e observabilidade | Media | Dev | pending | Erros e jobs rastreaveis por contexto |
| E6-03 | Politica de backup e teste de restauracao | Alta | DevOps | pending | Restore testado com sucesso |

---

## Planejamento por sprint (6 sprints)

## Sprint 1 (Semanas 1-2)
- E0-01, E0-02, E0-03
- E1-01, E1-02

**Meta:** medir baseline e liberar importacao em lote com validacao.

**Status atual:**
- E1-01 concluido (CSV/XLSX + OFX import)
- E1-02 concluido (preview e erros por linha)
- Logs de importacao implementados com acesso restrito a TESOURARIA e ADMIN_GLOBAL
- E0-01 e E0-03 em andamento

## Sprint 2 (Semanas 3-4)
- E1-03, E1-04, E1-05, E1-06, E1-07

**Meta:** reduzir tarefas repetitivas do tesoureiro no dia a dia.

**Status atual:**
- Sprint 2 iniciada
- E1-05 concluido (geracao por referencia MM/YYYY)
- E1-06 concluido (baixa coletiva por selecao)
- E1-03 concluido (templates recorrentes no formulario de lancamentos)
- E1-04 concluido (duplicacao de lancamentos por mes)
- E1-07 em andamento (acoes em massa + simplificacao de operacao)

## Sprint 3 (Semanas 5-6)
- E2-01, E2-02, E2-03, E2-04, E2-05, E2-06, E2-07

**Meta:** fluxo completo de evidencias fiscais via Google Drive (novo + consulta).

**Status atual:**
- Sprint 3 iniciada
- E2-03 concluido (modelagem de vinculo de evidencia em lancamento e mensalidade)
- Endpoint de status do provider de evidencia implementado (`/lancamentos/evidencia/drive-status`)
- E2-01 concluido (estrategia adotada: Service Account)
- E2-02 concluido (config por env + escopo minimo drive.file)
- E2-04 concluido (upload com hierarquia Nucleo/Ano/Mes/Domain/Tipo)
- E2-05 concluido (coluna de evidencia com acesso direto em lancamentos e mensalidades)
- E2-06 concluido (nomenclatura padrao automatica no upload)
- E2-07 concluido (fluxo completo no frontend: anexar/abrir/remover vinculo em lancamentos e mensalidades, com status do provider)

## Sprint 4 (Semanas 7-8)
- E2-08, E2-09, E2-10, E2-11
- E3-01, E3-02

**Meta:** migrar acervo existente e travar processo por governanca.

**Status atual:**
- E2-08 concluido (importacao em lote de evidencias antigas para lancamentos/mensalidades com preview, processamento e logs)
- E2-09 concluido (verificacao de saude da evidencia com status HEALTHY/BROKEN/UNKNOWN e suporte de relink no frontend)
- E2-10 concluido (auditoria de evidencias com trilha ATTACH/RELINK/REMOVE/MIGRATION_LINK e consulta por entidade/registro)
- E2-11 concluido (politica configuravel de recibo por multiplo de salario minimo na data do lancamento + suporte a baixa parcial em mensalidades)

## Sprint 5 (Semanas 9-10)
- E3-03, E3-04, E3-05
- E4-04, E4-05

**Meta:** auditoria forte + controles de aprovacao + fechamento assistido.

**Status atual:**
- E3-01 concluido (hard-lock efetivo no create/update/remove de lancamentos e em fluxos que dependem de checkPermissao)
- E3-02 concluido (reabertura exige justificativa minima, salva autor correto e registra historico no periodo)
- E3-03 concluido (auditoria centralizada em lancamentos, mensalidades e periodos com before/after e endpoint de consulta por nucleo)
- E3-04 concluido (permissoes por acao aplicadas em lancamentos, mensalidades, periodos e auditoria via matriz ROLE x ACTION)
- E3-05 concluido (dupla validacao por alcada configuravel em balancetes com limite por valor de despesas)
- E4-04 concluido (checklist pre-fechamento com bloqueio por rascunhos e mensalidades pendentes + endpoint e UI dedicados)
- E4-05 concluido (alertas automaticos de rascunho, pendencias, periodo anterior aberto e inadimplencia no dashboard)

## Sprint 6 (Semanas 11-12)
- E4-01, E4-02, E4-03
- E5-01, E5-02, E5-03, E5-04
- E6-01, E6-02, E6-03

**Meta:** consolidar robustez institucional e reduzir dependencia operacional.

---

## Riscos principais e mitigacoes

- Mudanca de rotina do tesoureiro: fazer rollout por fases, com treinamento curto e suporte.
- Dados historicos inconsistentes: usar migracao com preview, validacao e log por item.
- Integracao Google Drive instavel: incluir retries, fallback e monitoramento de erros.
- Excesso de burocracia: aplicar controle forte no critico e UX agil no operacional.

## Decisoes em aberto (para destravar execucao)

- Qual modelo de autenticacao no Drive sera adotado oficialmente?
- Quais tipos/valores exigem comprovante obrigatorio?
- Qual limite de aprovacao por alcada?
- Quem sera owner funcional para validacao final de cada sprint?
