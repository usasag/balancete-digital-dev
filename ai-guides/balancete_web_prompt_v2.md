# 📋 Manual Completo: Criação da Plataforma Web Balancete Digital

**Última atualização:** Janeiro 2026  
**Versão:** 2.0 (Atualizado com RBAC Hierárquico e Fluxo de Aprovação de Balancetes)  
**Objetivo:** Instruções detalhadas para gerar o backend + frontend web do "Balancete Digital" usando Google Antigravity ou similares.

---

## 📌 Visão Geral do Projeto

**Nome do Sistema:** Balancete Digital  
**Descrição:** Plataforma híbrida (web + mobile) para controle e gestão de tesouraria de instituições religiosas com múltiplos núcleos. Sistema de faturamento por mensalidades com taxas opcionais, geração automática de balancetes mensais, fluxo de aprovação colaborativa (Tesouraria + Conselho Fiscal), armazenamento de notas fiscais e publicação de balancetes para sócios.

**Escopo da Fase Web:** Backend API + Frontend web (dashboard de tesouraria, conselho fiscal, admin e sócios)  
**Escopo Futuro:** Mobile (FlutterFlow), integração ReUNI SSO, promoções/campanhas, regiões

---

## 🏗️ Arquitetura Macro

### Stack Tecnológico

```
Frontend Web:        Next.js 14+ (React, TypeScript, Tailwind CSS)
Backend API:         NestJS (TypeScript, Express)
Banco de dados:      PostgreSQL 15+ (com RLS para multi-tenant)
Autenticação:        Firebase Auth + JWT com roles hierárquicas
Storage:             Firebase Storage (notas fiscais, PDFs balancetes)
Notificações:        Firebase Cloud Messaging (FCM)
Containerização:     Docker + docker-compose
Infra:               VPS (deploy único container)
Automação:           n8n (workflows assíncronos dockerizados)
Pagamentos:          Feitos manualmente para não incorrer em gastos com gateway de pagamento
PDF Generation:      PDFKit ou Puppeteer (renderização balancete)
```

### Fluxo Central

```
[Usuário Web (Diversos roles)]
           ↓
[Next.js Frontend - Dashboard Contextual]
           ↓
[NestJS Backend API - RESTful + RBAC]
           ↓
[PostgreSQL RLS - Multi-tenant]
           ↓
[Firebase Auth, FCM, Storage]
           ↓
[n8n Workflows - Jobs assíncronos]
           ↓
[Docker Compose - VPS]
```

---

## 🔐 Sistema de Roles Hierárquico (NOVO)

### Hierarquia de Permissões

```
┌─────────────────────────────────────────────────────────────────┐
│              HIERARQUIA DE ROLES - BALANCETE DIGITAL             │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  7. PRESIDENTE (Super Admin do Núcleo)                           │
│     └─ Vê, edita, publica E aprova tudo                         │
│     └─ Pode publicar balancetes                                  │
│     └─ Pode aprovar balancetes (sem ressalvas pelo pres.)      │
│     └─ Acesso a TODAS as informações (exceto Regiões)          │
│                                                                   │
│  6. TESOURARIA_ADMIN (1º Tesoureiro - Chefe Tesouraria)        │
│     └─ Tudo da tesouraria + aprovar E publicar balancetes       │
│     └─ Única role que publica balancetes                        │
│     └─ Pode adicionar ressalvas ao aprovar                      │
│     └─ Vê histórico de aprovações                               │
│     └─ NÃO pode editar Regiões, Núcleos, roles acima            │
│                                                                   │
│  5. TESOURARIA (2º Tesoureiro, Tesoureiros Assistentes)        │
│     └─ CRUD manual: lançamentos, mensalidades, sócios, taxas    │
│     └─ PODE aprovar balancetes (mas NÃO publicar)               │
│     └─ Vê balancetes em rascunho (não publicados)               │
│     └─ Vê/edita notas fiscais                                   │
│     └─ Vê histórico de aprovações                               │
│     └─ NÃO pode: publicar, editar regiões/núcleos, sócios      │
│                                                                   │
│  4. CONSELHO_FISCAL (Membros do Conselho, Presidente Conselho) │
│     └─ Vê/aprova notas fiscais (reconhecimento)                 │
│     └─ PODE aprovar balancetes (mas NÃO publicar)               │
│     └─ Vê balancetes em rascunho (não publicados)               │
│     └─ Vê histórico de aprovações                               │
│     └─ NÃO pode: editar, deletar, publicar, sócios             │
│                                                                   │
│  3. REPRESENTANTE (Observador/Consultor)                        │
│     └─ Leitura de TUDO (informações)                            │
│     └─ NÃO pode criar, editar, deletar ou aprovar              │
│     └─ Acesso: balancetes (publicados), sócios, lançamentos    │
│                                                                   │
│  2. SOCIO (Membro/Associado)                                    │
│     └─ Leitura: próprias mensalidades, taxas, previsões        │
│     └─ Leitura: balancetes publicados apenas                   │
│     └─ Leitura: promoções ativas                                │
│     └─ Ação: marcar própria mensalidade como paga              │
│     └─ NÃO pode: ver dados de outros sócios, notas, lançamentos│
│                                                                   │
│  1. ADMIN_GLOBAL (Super Admin do Sistema - Não por núcleo)      │
│     └─ Gerencia Regiões, Núcleos, Usuários globais              │
│     └─ Raramente usado, apenas setup inicial                    │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘

Legenda:
─────────────────────────────────────────
✅ Completo    ✓ Parcial    ✗ Negado
```

### Mapeamento de Permissões por Role

```typescript
// src/common/constants/permissions.ts

export const ROLE_HIERARCHY = {
  ADMIN_GLOBAL: 10,
  PRESIDENTE: 9,
  TESOURARIA_ADMIN: 8,
  TESOURARIA: 7,
  CONSELHO_FISCAL: 6,
  REPRESENTANTE: 5,
  SOCIO: 1,
};

export const PERMISSIONS_BY_ROLE = {
  ADMIN_GLOBAL: {
    // Gestão global
    nucleos: ['create', 'read', 'update', 'delete'],
    regioes: ['create', 'read', 'update', 'delete'],
    usuarios: ['create', 'read', 'update', 'delete'],
  },
  PRESIDENTE: {
    // Super admin do núcleo
    socios: ['read', 'update', 'delete'],
    mensalidades: ['create', 'read', 'update', 'delete'],
    lancamentos: ['create', 'read', 'update', 'delete'],
    taxas: ['create', 'read', 'update', 'delete'],
    notasFiscais: ['create', 'read', 'update', 'delete'],
    balancetes: ['create', 'read', 'update', 'approve', 'publish'],
    balancetesAprovacao: ['see_approvals', 'approve', 'publish'],
    usuarios: ['read', 'update'], // não delete
  },
  TESOURARIA_ADMIN: {
    // 1º Tesoureiro
    socios: ['read'],
    mensalidades: ['create', 'read', 'update', 'delete'],
    lancamentos: ['create', 'read', 'update', 'delete'],
    taxas: ['create', 'read', 'update', 'delete'],
    notasFiscais: ['create', 'read', 'update', 'delete'],
    balancetes: ['read'],
    balancetesAprovacao: [
      'see_approvals',
      'approve_with_reservations',
      'publish',
      'add_reservations',
    ],
  },
  TESOURARIA: {
    // 2º Tesoureiro
    socios: ['read'],
    mensalidades: ['create', 'read', 'update', 'delete'],
    lancamentos: ['create', 'read', 'update', 'delete'],
    taxas: ['create', 'read', 'update', 'delete'],
    notasFiscais: ['create', 'read', 'update', 'delete'],
    balancetes: ['read'],
    balancetesAprovacao: ['see_approvals', 'approve'],
  },
  CONSELHO_FISCAL: {
    // Membros do Conselho
    socios: ['read'],
    notasFiscais: ['read', 'approve_recognition'],
    balancetes: ['read'],
    balancetesAprovacao: ['see_approvals', 'approve'],
  },
  REPRESENTANTE: {
    // Observador
    socios: ['read'],
    mensalidades: ['read'],
    lancamentos: ['read'],
    notasFiscais: ['read'],
    balancetes: ['read_published_only'],
    balancetesAprovacao: ['see_approvals'],
  },
  SOCIO: {
    // Membro
    mensalidades: ['read_own', 'mark_paid_own'],
    lancamentos: [],
    notasFiscais: [],
    balancetes: ['read_published_only'],
    promocoes: ['read_active'],
  },
};

export const FIELD_VISIBILITY_BY_ROLE = {
  // Campos visíveis por role (RLS + frontend)
  balancete: {
    SOCIO: ['total_receitas', 'total_despesas', 'saldo_final', 'data_publicacao'],
    REPRESENTANTE: [
      'total_receitas',
      'total_despesas',
      'saldo_final',
      'saldo_inicial',
      'data_publicacao',
    ],
    CONSELHO_FISCAL: [
      'total_receitas',
      'total_despesas',
      'saldo_inicial',
      'saldo_final',
      'taxa_inadimplentes',
      'taxa_atrasadas',
      'taxa_regularizadas',
      'conteudo_renderizado',
      'status_aprovacao',
      'aprovacoes',
      'ressalvas',
    ],
    TESOURARIA: [
      'total_receitas',
      'total_despesas',
      'saldo_inicial',
      'saldo_final',
      'taxa_inadimplentes',
      'taxa_atrasadas',
      'taxa_regularizadas',
      'conteudo_renderizado',
      'status_aprovacao',
      'aprovacoes',
      'ressalvas',
    ],
    PRESIDENTE: ['*'], // tudo
  },
};
```

---

## 🗄️ Estrutura de Banco de Dados (PostgreSQL) - ATUALIZADO

### Tabelas Principais (com Novos Campos para Aprovação)

#### 1. **usuario** (Atualizado com Role Hierárquica)
```sql
CREATE TABLE usuario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  nome_completo VARCHAR(255) NOT NULL,
  senha_hash VARCHAR(255),
  firebase_uid VARCHAR(255),
  
  -- Role com hierarquia
  role VARCHAR(50) NOT NULL DEFAULT 'SOCIO',
    -- ADMIN_GLOBAL, PRESIDENTE, TESOURARIA_ADMIN, TESOURARIA,
    -- CONSELHO_FISCAL, REPRESENTANTE, SOCIO
  
  -- Cargo específico (para auditoria e UI)
  cargo VARCHAR(255), -- ex: "1º Tesoureiro", "Presidente Conselho Fiscal"
  
  nucleo_id UUID NOT NULL REFERENCES nucleo(id) ON DELETE CASCADE,
  ativo BOOLEAN DEFAULT true,
  reuni_user_id VARCHAR(255),
  
  data_criacao TIMESTAMP DEFAULT NOW(),
  data_atualizacao TIMESTAMP DEFAULT NOW(),
);

CREATE INDEX idx_usuario_email ON usuario(email);
CREATE INDEX idx_usuario_nucleo_id ON usuario(nucleo_id);
CREATE INDEX idx_usuario_role ON usuario(role);
```

#### 2. **balancete_mensal** (ATUALIZADO com Fluxo de Aprovação)
```sql
CREATE TABLE balancete_mensal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nucleo_id UUID NOT NULL REFERENCES nucleo(id) ON DELETE CASCADE,
  ano_mes VARCHAR(7) NOT NULL,
  
  total_receitas DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_despesas DECIMAL(15,2) NOT NULL DEFAULT 0,
  saldo_inicial DECIMAL(15,2) NOT NULL DEFAULT 0,
  saldo_final DECIMAL(15,2) NOT NULL DEFAULT 0,
  
  taxa_regularizadas DECIMAL(5,2) DEFAULT 0,
  taxa_atrasadas DECIMAL(5,2) DEFAULT 0,
  taxa_inadimplentes DECIMAL(5,2) DEFAULT 0,
  taxa_em_acordo DECIMAL(5,2) DEFAULT 0,
  quantidade_mensalidades_devidas INT DEFAULT 0,
  
  conteudo_renderizado JSONB,
  
  -- NOVO: Status e Aprovação
  status VARCHAR(50) NOT NULL DEFAULT 'RASCUNHO',
    -- RASCUNHO, APROVANDO, APROVADO_COM_RESSALVAS, APROVADO, PUBLICADO
  
  publicado BOOLEAN DEFAULT false,
  data_publicacao TIMESTAMP,
  publicado_por UUID REFERENCES usuario(id) ON DELETE SET NULL,
  
  criado_por UUID NOT NULL REFERENCES usuario(id),
  data_criacao TIMESTAMP DEFAULT NOW(),
  data_atualizacao TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(nucleo_id, ano_mes)
);

CREATE INDEX idx_balancete_nucleo ON balancete_mensal(nucleo_id);
CREATE INDEX idx_balancete_status ON balancete_mensal(status);
CREATE INDEX idx_balancete_publicado ON balancete_mensal(publicado);
```

#### 3. **balancete_aprovacao** (NOVO - Trilha de Aprovação)
```sql
CREATE TABLE balancete_aprovacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  balancete_id UUID NOT NULL REFERENCES balancete_mensal(id) ON DELETE CASCADE,
  nucleo_id UUID NOT NULL REFERENCES nucleo(id) ON DELETE CASCADE,
  
  -- Quem aprovou
  usuario_id UUID NOT NULL REFERENCES usuario(id) ON DELETE RESTRICT,
  cargo_aprovador VARCHAR(255), -- "1º Tesoureiro", "Membro Conselho Fiscal", etc
  role_aprovador VARCHAR(50) NOT NULL, -- TESOURARIA, CONSELHO_FISCAL, PRESIDENTE, etc.
  
  -- Status da aprovação
  status VARCHAR(50) NOT NULL, -- APROVADO, REPROVADO, RESERVA
  
  -- Observação/Ressalva (se houver)
  ressalva TEXT, -- "Valor de R$ 500 não foi reconhecido, aguardando nota fiscal"
  
  data_aprovacao TIMESTAMP DEFAULT NOW(),
  
  -- RLS: filtrado por nucleo_id
);

CREATE INDEX idx_aprovacao_balancete ON balancete_aprovacao(balancete_id);
CREATE INDEX idx_aprovacao_usuario ON balancete_aprovacao(usuario_id);
CREATE INDEX idx_aprovacao_status ON balancete_aprovacao(status);
```

#### 4. **nota_fiscal_reconhecimento** (NOVO - Reconhecimento pelo Conselho)
```sql
CREATE TABLE nota_fiscal_reconhecimento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nota_fiscal_id UUID NOT NULL REFERENCES nota_fiscal(id) ON DELETE CASCADE,
  balancete_id UUID NOT NULL REFERENCES balancete_mensal(id) ON DELETE CASCADE,
  nucleo_id UUID NOT NULL REFERENCES nucleo(id) ON DELETE CASCADE,
  
  -- Quem reconheceu
  usuario_id UUID NOT NULL REFERENCES usuario(id) ON DELETE RESTRICT,
  role VARCHAR(50) NOT NULL, -- CONSELHO_FISCAL, TESOURARIA
  
  -- Status
  reconhecido BOOLEAN DEFAULT false,
  data_reconhecimento TIMESTAMP,
  
  observacao TEXT, -- "Verificada contra comprovante bancário"
  
  data_criacao TIMESTAMP DEFAULT NOW(),
);

CREATE INDEX idx_reconhecimento_nota ON nota_fiscal_reconhecimento(nota_fiscal_id);
CREATE INDEX idx_reconhecimento_balancete ON nota_fiscal_reconhecimento(balancete_id);
CREATE INDEX idx_reconhecimento_usuario ON nota_fiscal_reconhecimento(usuario_id);
```

#### 5. **lancamento_sem_evidencia** (NOVO - Lançamentos sem Nota Fiscal)
```sql
CREATE TABLE lancamento_sem_evidencia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lancamento_id UUID NOT NULL REFERENCES lancamento_financeiro(id) ON DELETE CASCADE,
  balancete_id UUID NOT NULL REFERENCES balancete_mensal(id) ON DELETE CASCADE,
  nucleo_id UUID NOT NULL REFERENCES nucleo(id) ON DELETE CASCADE,
  
  motivo TEXT, -- "Valor mencionado verbalmente pelo presidente"
  
  pendente_evidencia BOOLEAN DEFAULT true,
  data_vencimento_evidencia DATE, -- prazo para apresentar
  
  criado_por UUID NOT NULL REFERENCES usuario(id),
  data_criacao TIMESTAMP DEFAULT NOW(),
  
  -- Se aprovado com ressalva
  aprovado_com_ressalva BOOLEAN DEFAULT false,
  ressalva_texto TEXT,
);

CREATE INDEX idx_sem_evidencia_lancamento ON lancamento_sem_evidencia(lancamento_id);
CREATE INDEX idx_sem_evidencia_balancete ON lancamento_sem_evidencia(balancete_id);
CREATE INDEX idx_sem_evidencia_pendente ON lancamento_sem_evidencia(pendente_evidencia);
```

#### 6. **balancete_publicacao_pdf** (NOVO - PDFs Publicados)
```sql
CREATE TABLE balancete_publicacao_pdf (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  balancete_id UUID NOT NULL REFERENCES balancete_mensal(id) ON DELETE CASCADE,
  nucleo_id UUID NOT NULL REFERENCES nucleo(id) ON DELETE CASCADE,
  
  pdf_url TEXT NOT NULL, -- Firebase Storage URL
  pdf_nome_arquivo VARCHAR(255),
  
  versao INT DEFAULT 1, -- permite regenar PDF se houver erro
  
  publicado_por UUID NOT NULL REFERENCES usuario(id),
  data_publicacao TIMESTAMP DEFAULT NOW(),
  
  -- RLS: filtrado por nucleo_id
);

CREATE INDEX idx_pdf_balancete ON balancete_publicacao_pdf(balancete_id);
```

---

## 🔐 Policies de RLS (Row Level Security) - ATUALIZADO

```sql
-- Habilitar RLS em todas as tabelas
ALTER TABLE balancete_mensal ENABLE ROW LEVEL SECURITY;
ALTER TABLE balancete_aprovacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE balancete_publicacao_pdf ENABLE ROW LEVEL SECURITY;
ALTER TABLE nota_fiscal_reconhecimento ENABLE ROW LEVEL SECURITY;
ALTER TABLE lancamento_sem_evidencia ENABLE ROW LEVEL SECURITY;

-- Política: Sócios veem apenas balancetes publicados
CREATE POLICY "Socios see published balancetes"
  ON balancete_mensal
  FOR SELECT
  USING (
    publicado = true
    OR nucleo_id IN (
      SELECT nucleo_id FROM usuario WHERE id = current_user_id
      AND role IN ('TESOURARIA', 'CONSELHO_FISCAL', 'TESOURARIA_ADMIN', 'PRESIDENTE')
    )
  );

-- Política: Tesouraria e Conselho veem todos os rascunhos
CREATE POLICY "Tesouraria and Conselho see all balancetes"
  ON balancete_mensal
  FOR SELECT
  USING (
    nucleo_id IN (
      SELECT nucleo_id FROM usuario WHERE id = current_user_id
      AND role IN ('TESOURARIA', 'CONSELHO_FISCAL', 'TESOURARIA_ADMIN', 'PRESIDENTE')
    )
  );

-- Política: Apenas Tesouraria e acima podem editar balancetes
CREATE POLICY "Only Tesouraria and above can edit balancetes"
  ON balancete_mensal
  FOR UPDATE
  USING (
    nucleo_id IN (
      SELECT nucleo_id FROM usuario WHERE id = current_user_id
      AND role IN ('TESOURARIA', 'TESOURARIA_ADMIN', 'PRESIDENTE')
    )
  );

-- Política: Aprovações são visíveis apenas para aprovadores e acima
CREATE POLICY "Only approvers see approvals"
  ON balancete_aprovacao
  FOR SELECT
  USING (
    nucleo_id IN (
      SELECT nucleo_id FROM usuario WHERE id = current_user_id
      AND role IN ('TESOURARIA', 'CONSELHO_FISCAL', 'TESOURARIA_ADMIN', 'PRESIDENTE', 'REPRESENTANTE')
    )
  );
```

---

## 🔌 Fluxo de Aprovação de Balancetes (NOVO)

### Estados do Balancete

```
┌──────────────────────────────────────────────────────────────────┐
│                  CICLO DE VIDA DO BALANCETE                       │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│  1. RASCUNHO                                                       │
│     └─ Tesouraria cria balancete, revisa lançamentos              │
│     └─ Conselho Fiscal revisa notas fiscais                       │
│     └─ Acesso: TESOURARIA, CONSELHO_FISCAL, TESOURARIA_ADMIN,    │
│                PRESIDENTE                                          │
│                                                                    │
│  2. APROVANDO (em transição)                                      │
│     └─ Tesouraria aprova (ou não)                                 │
│     └─ Conselho Fiscal aprova (ou não)                            │
│     └─ Espera ambos reconhecerem todas as notas fiscais           │
│                                                                    │
│  3a. APROVADO                                                      │
│     └─ Ambos (Tesouraria + Conselho) aprovaram                    │
│     └─ Sem ressalvas                                              │
│     └─ Pronto para publicar                                       │
│                                                                    │
│  3b. APROVADO_COM_RESSALVAS                                       │
│     └─ Ambos aprovaram, MAS com ressalvas                         │
│     └─ Alguns lançamentos sem evidência foram aceitos             │
│     └─ Tesouraria Admin adiciona observações internas             │
│     └─ Pronto para publicar (com nota interna)                    │
│                                                                    │
│  4. PUBLICADO                                                      │
│     └─ Tesouraria Admin OU Presidente publicou                    │
│     └─ PDF gerado e salvo em Firebase Storage                     │
│     └─ Visível para TODOS os sócios                               │
│     └─ Imutável a partir desse ponto                              │
│                                                                    │
└──────────────────────────────────────────────────────────────────┘

Atores e Ações:
─────────────────────────────────────────
TESOURARIA:
  ✓ Revisar lançamentos
  ✓ Aprovar/Reprovar balancete
  ✗ Publicar
  ✓ Ver ressalvas

CONSELHO_FISCAL:
  ✓ Revisar notas fiscais
  ✓ Reconhecer (aprovar) notas fiscais
  ✓ Aprovar/Reprovar balancete
  ✗ Publicar
  ✓ Ver ressalvas

TESOURARIA_ADMIN (1º Tesoureiro):
  ✓ Tudo da Tesouraria
  ✓ Adicionar ressalvas (observações internas)
  ✓ Publicar balancete
  ✓ Ver quem aprovou/reprovou

PRESIDENTE:
  ✓ Publicar balancete (se 1º Tesoureiro indisponível)
  ✓ Aprovar balancete
  ✓ Ver tudo
```

### Endpoints de Aprovação (NestJS)

```typescript
// src/balancetes/balancetes.controller.ts

// Tesouraria aprova balancete
@UseGuards(RolesGuard)
@Roles('TESOURARIA', 'TESOURARIA_ADMIN', 'PRESIDENTE')
@Post('/:id/approve')
async approveBalancete(
  @Param('id') balanceteId: string,
  @Body() dto: ApproveBalanceteDto, // { status: 'APROVADO' ou 'REPROVADO' }
  @CurrentUser() user: JwtPayload,
) {
  // Cria registro em balancete_aprovacao
  // Se TESOURARIA_ADMIN, pode adicionar ressalva
  // Valida se ambos (Tesouraria e Conselho) já aprovaram
  // Se sim, muda status para APROVADO ou APROVADO_COM_RESSALVAS
}

// Conselho Fiscal reconhece notas fiscais
@UseGuards(RolesGuard)
@Roles('CONSELHO_FISCAL', 'PRESIDENTE')
@Post('/:id/reconhecer-notas-fiscais')
async reconhecerNotasFiscais(
  @Param('id') balanceteId: string,
  @Body() dto: ReconhecerNotasDto, // { notas_reconhecidas: ['id1', 'id2'] }
  @CurrentUser() user: JwtPayload,
) {
  // Cria registros em nota_fiscal_reconhecimento
  // Se todas as notas do balancete foram reconhecidas
  // Aprova o balancete automaticamente para Conselho Fiscal
}

// Tesouraria Admin publica balancete
@UseGuards(RolesGuard)
@Roles('TESOURARIA_ADMIN', 'PRESIDENTE')
@Post('/:id/publish')
async publishBalancete(
  @Param('id') balanceteId: string,
  @Body() dto: PublishBalanceteDto, // { gerar_pdf: true }
  @CurrentUser() user: JwtPayload,
) {
  // Valida se balancete está APROVADO
  // Gera PDF (Puppeteer/PDFKit)
  // Salva PDF em Firebase Storage
  // Cria registro em balancete_publicacao_pdf
  // Muda status para PUBLICADO
  // Envia notificação FCM para sócios
}

// Ver histórico de aprovações (Tesouraria + Conselho veem)
@UseGuards(RolesGuard)
@Roles('TESOURARIA', 'CONSELHO_FISCAL', 'TESOURARIA_ADMIN', 'PRESIDENTE', 'REPRESENTANTE')
@Get('/:id/approvals')
async getApprovalHistory(
  @Param('id') balanceteId: string,
  @CurrentUser() user: JwtPayload,
) {
  // Retorna:
  // [
  //   {
  //     usuario: { nome, cargo, role },
  //     status: 'APROVADO',
  //     data: '2026-01-18',
  //     ressalva: null | 'observação'
  //   },
  //   ...
  // ]
}

// Adicionar ressalva (Tesouraria Admin apenas)
@UseGuards(RolesGuard)
@Roles('TESOURARIA_ADMIN')
@Post('/:id/add-reservations')
async addReservations(
  @Param('id') balanceteId: string,
  @Body() dto: AddReservationsDto, // { reservations: [{ lancamento_id, texto }] }
  @CurrentUser() user: JwtPayload,
) {
  // Cria registros em lancamento_sem_evidencia
  // Com status aprovado_com_ressalva
}

// Marcar lançamento como "sem evidência" (durante aprovação)
@UseGuards(RolesGuard)
@Roles('TESOURARIA', 'TESOURARIA_ADMIN', 'CONSELHO_FISCAL')
@Post('/lancamentos/:id/marcar-sem-evidencia')
async markAsNoEvidence(
  @Param('id') lancamentoId: string,
  @Body() dto: NoEvidenceDto, // { motivo, data_vencimento }
) {
  // Cria registro em lancamento_sem_evidencia
  // Sinaliza no balancete que há pendência
}
```

---

## 📱 Fluxo de UX para Aprovação de Balancete

### Tela: Balancete em Rascunho (Tesouraria + Conselho Fiscal)

```
┌─────────────────────────────────────────────────────────────────┐
│  BALANCETE JANEIRO 2026 - EM RASCUNHO                            │
│  Status: 🟡 RASCUNHO                                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  📊 RESUMO FINANCEIRO                                            │
│  ─────────────────────────                                       │
│  Saldo Inicial:    R$ 10.000,00                                 │
│  Receitas:         R$ 8.500,00                                  │
│  Despesas:         R$ 6.200,00                                  │
│  Saldo Final:      R$ 12.300,00                                 │
│                                                                   │
│  📋 CATEGORIAS (Receitas/Despesas)                              │
│  ─────────────────────────────────                              │
│  [Expandível] Mensalidades           R$ 8.000,00   ✅ Tudo OK  │
│  [Expandível] Doações                R$ 500,00     ⚠️ Sem nota │
│  [Expandível] Aluguel                R$ 5.000,00   ✅ Tudo OK  │
│  [Expandível] Água/Luz               R$ 1.200,00   ✅ Tudo OK  │
│                                                                   │
│  👥 STATUS DE APROVAÇÕES                                         │
│  ────────────────────────                                        │
│  Tesouraria:       [ ] Aguardando    ⟵ VOCÊ AQUI (Tesouraria)  │
│  Conselho Fiscal:  [ ] Aguardando                               │
│  Publicação:       [ ] Aguardando                               │
│                                                                   │
│  [Aprovar] [Reprovar] [Ver Notas Fiscais] [Detalhes]            │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘

Se clica [Aprovar]:
├─ Se há lançamentos sem nota fiscal:
│  └─ Popup: "Existem 2 lançamentos sem evidência (notas fiscais)."
│     Opções:
│     ├─ Rejeitar o balancete
│     ├─ Aprovar com ressalva (requer cargo TESOURARIA_ADMIN)
│     └─ Marcar esses lançamentos como "Pendente de Evidência"
│
└─ Se tudo OK:
   └─ Balancete marcado como APROVADO
      Notificação: "Tesouraria aprovou! Aguardando Conselho Fiscal."
```

### Tela: Reconhecimento de Notas Fiscais (Conselho Fiscal)

```
┌─────────────────────────────────────────────────────────────────┐
│  RECONHECIMENTO DE NOTAS FISCAIS - JANEIRO 2026                 │
│  Role: Conselho Fiscal                                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  📄 NOTAS FISCAIS PARA RECONHECIMENTO                            │
│  ───────────────────────────────────────                         │
│                                                                   │
│  [ ] RECEITA - Mensalidades             R$ 8.000,00             │
│      Anexada em: 10/01/2026 por Tesouraria                      │
│      Status: Reconhecida ✅                                      │
│      [Ver Imagem] [Marcar como Não Reconhecida]                 │
│                                                                   │
│  [ ] DESPESA - Aluguel                  R$ 5.000,00             │
│      Anexada em: 12/01/2026 por Tesouraria                      │
│      Status: Pendente ⏳                                          │
│      [Ver Imagem] [Reconhecer] [Rejeitar]                       │
│      Observação: ___________________________                      │
│                                                                   │
│  [ ] RECEITA - Doação anônima           R$ 500,00               │
│      Anexada em: 15/01/2026                                      │
│      Status: Sem Nota Fiscal ⚠️                                  │
│      [Não tem imagem]                                            │
│      Observação: __________________________                      │
│      [Aprovar com Ressalva] [Rejeitar] [Pedir Evidência]        │
│                                                                   │
│  ═════════════════════════════════════════════════════════════   │
│  TOTAL RECONHECIDO:  R$ 13.000,00 (3/3)                         │
│  [Aprovar Tudo]  [Reprovações Pendentes]                        │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Tela: Histórico de Aprovações (Todos veem)

```
┌─────────────────────────────────────────────────────────────────┐
│  HISTÓRICO DE APROVAÇÕES - JANEIRO 2026                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  👤 João Silva (1º Tesoureiro)                                  │
│     Role: TESOURARIA_ADMIN                                       │
│     Status: ✅ APROVADO com ressalvas                           │
│     Data: 16/01/2026 às 14:30                                   │
│     Ressalvas adicionadas:                                       │
│     └─ "Doação de R$500 foi aprovada com ressalva - pendente    │
│          evidência até 20/01/2026"                              │
│                                                                   │
│  👤 Maria Santos (Presidente Conselho Fiscal)                   │
│     Role: CONSELHO_FISCAL                                        │
│     Status: ✅ APROVADO                                         │
│     Data: 16/01/2026 às 15:00                                   │
│     Notas Reconhecidas: 3/3                                      │
│                                                                   │
│  ───────────────────────────────────────────────────────────────│
│  RESULTADO FINAL: ✅ PRONTO PARA PUBLICAR                       │
│  Publicar por: João Silva (1º Tesoureiro)                       │
│  [Publicar Agora] [Agendar Publicação]                          │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📊 Tela de Balancete Publicado (Para Sócios)

```
┌─────────────────────────────────────────────────────────────────┐
│  BALANCETE JANEIRO 2026 - PUBLICADO ✅                           │
│  Publicado em: 17/01/2026 às 18:00                              │
│  Responsável: João Silva (1º Tesoureiro)                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  📊 RESUMO FINANCEIRO                                            │
│  ─────────────────────────                                       │
│  Saldo Anterior:    R$ 10.000,00                                │
│  Total de Receitas: R$ 8.500,00                                 │
│  Total de Despesas: R$ 6.200,00                                 │
│  Saldo Atual:       R$ 12.300,00                                │
│                                                                   │
│  📈 INDICADORES DE MENSALIDADES                                 │
│  ───────────────────────────────────                            │
│  Regularizadas:     75%  ✅                                      │
│  Em Atraso:         15%  ⏳                                       │
│  Inadimplentes:      5%  ⚠️                                      │
│  Em Acordo:          5%  📋                                      │
│                                                                   │
│  [Download PDF] [Imprimir] [Compartilhar] [Voltar]              │
│                                                                   │
│  ℹ️ Este balancete foi aprovado e publicado após reconhecimento  │
│     integral da Tesouraria e Conselho Fiscal.                   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔌 Arquitetura Backend (NestJS) - ATUALIZADO

### Novo Serviço: BalanceteApprovalService

```typescript
// src/balancetes/balancete-approval.service.ts

@Injectable()
export class BalanceteApprovalService {
  constructor(
    @InjectRepository(BalanceteMensal)
    private balanceteRepo: Repository<BalanceteMensal>,
    
    @InjectRepository(BalanceteAprovacao)
    private aprovacaoRepo: Repository<BalanceteAprovacao>,
    
    @InjectRepository(NotaFiscalReconhecimento)
    private reconhecimentoRepo: Repository<NotaFiscalReconhecimento>,
    
    @InjectRepository(LancamentoSemEvidencia)
    private semEvidenciaRepo: Repository<LancamentoSemEvidencia>,
    
    @InjectRepository(BalancetePublicacaoPdf)
    private pdfRepo: Repository<BalancetePublicacaoPdf>,
    
    private pdfService: PdfGeneratorService,
    private storageService: FirebaseStorageService,
    private notificacaoService: NotificacaoService,
    private auditoria: AuditoriaService,
  ) {}

  // Tesouraria/Conselho aprova balancete
  async approveBalancete(
    balanceteId: string,
    usuarioId: string,
    status: 'APROVADO' | 'REPROVADO',
    ressalva?: string,
  ) {
    const balancete = await this.balanceteRepo.findOne(balanceteId);
    if (!balancete) throw new NotFoundException('Balancete não encontrado');

    const usuario = // get user with role

    // Validar hierarquia: só TESOURARIA, CONSELHO_FISCAL, TESOURARIA_ADMIN, PRESIDENTE
    if (!['TESOURARIA', 'CONSELHO_FISCAL', 'TESOURARIA_ADMIN', 'PRESIDENTE'].includes(usuario.role)) {
      throw new ForbiddenException('Sem permissão para aprovar');
    }

    // Criar registro de aprovação
    const aprovacao = await this.aprovacaoRepo.save({
      balancete_id: balanceteId,
      usuario_id: usuarioId,
      cargo_aprovador: usuario.cargo, // "1º Tesoureiro"
      role_aprovador: usuario.role,
      status: status === 'APROVADO' ? 'APROVADO' : 'REPROVADO',
      ressalva: ressalva || null,
    });

    // Verificar se ambos (Tesouraria + Conselho) já aprovaram
    const aprovacoes = await this.aprovacaoRepo.find({
      where: { balancete_id: balanceteId, status: 'APROVADO' },
    });

    const temTesouraria = aprovacoes.some(a => 
      a.role_aprovador === 'TESOURARIA' || a.role_aprovador === 'TESOURARIA_ADMIN'
    );
    const temConselho = aprovacoes.some(a => a.role_aprovador === 'CONSELHO_FISCAL');

    // Se ambos aprovaram, muda status
    if (temTesouraria && temConselho) {
      const temRessalvas = aprovacoes.some(a => a.ressalva !== null);
      balancete.status = temRessalvas ? 'APROVADO_COM_RESSALVAS' : 'APROVADO';
      await this.balanceteRepo.save(balancete);

      // Log auditoria
      await this.auditoria.log({
        nucleo_id: balancete.nucleo_id,
        usuario_id: usuarioId,
        entidade_tipo: 'balancete_mensal',
        entidade_id: balanceteId,
        acao: 'APPROVE_COMPLETE',
        valores_depois: { status: balancete.status },
      });
    }

    return aprovacao;
  }

  // Conselho reconhece notas fiscais
  async reconhecerNotasFiscais(
    balanceteId: string,
    usuarioId: string,
    notasReconhecidas: string[], // array de nota_fiscal_ids
  ) {
    const balancete = await this.balanceteRepo.findOne(balanceteId);
    
    // Criar registros de reconhecimento
    for (const notaId of notasReconhecidas) {
      await this.reconhecimentoRepo.save({
        nota_fiscal_id: notaId,
        balancete_id: balanceteId,
        usuario_id: usuarioId,
        role: 'CONSELHO_FISCAL',
        reconhecido: true,
        data_reconhecimento: new Date(),
      });
    }

    // Se todas as notas foram reconhecidas, aprova automaticamente Conselho
    const notasTotal = await this.notaFiscalRepo.count({
      where: { /* notas do balancete */ },
    });
    const notasReconhecidas = await this.reconhecimentoRepo.count({
      where: { balancete_id: balanceteId, reconhecido: true },
    });

    if (notasReconhecidas === notasTotal) {
      // Auto-aprovação do Conselho
      await this.aprovacaoRepo.save({
        balancete_id: balanceteId,
        usuario_id: usuarioId,
        cargo_aprovador: 'Conselho Fiscal',
        role_aprovador: 'CONSELHO_FISCAL',
        status: 'APROVADO',
      });
    }

    return { reconhecidas: notasReconhecidas.length, total: notasTotal };
  }

  // Publicar balancete (Tesouraria Admin ou Presidente)
  async publishBalancete(
    balanceteId: string,
    usuarioId: string,
    gerarPdf: boolean = true,
  ) {
    const balancete = await this.balanceteRepo.findOne(balanceteId);
    if (balancete.status !== 'APROVADO' && balancete.status !== 'APROVADO_COM_RESSALVAS') {
      throw new BadRequestException('Balancete não está aprovado para publicação');
    }

    // Gerar PDF
    let pdfUrl: string = null;
    if (gerarPdf) {
      const pdfBuffer = await this.pdfService.generateBalancetePdf(balancete);
      const pdfNome = `balancete_${balancete.nucleo_id}_${balancete.ano_mes}.pdf`;
      pdfUrl = await this.storageService.uploadFile(pdfBuffer, pdfNome);

      // Salvar registro de PDF
      await this.pdfRepo.save({
        balancete_id: balanceteId,
        pdf_url: pdfUrl,
        pdf_nome_arquivo: pdfNome,
        publicado_por: usuarioId,
      });
    }

    // Marcar como publicado
    balancete.publicado = true;
    balancete.status = 'PUBLICADO';
    balancete.data_publicacao = new Date();
    balancete.publicado_por = usuarioId;
    await this.balanceteRepo.save(balancete);

    // Notificar sócios
    await this.notificacaoService.notifyAllSocios(
      balancete.nucleo_id,
      `Balancete de ${balancete.ano_mes} foi publicado!`,
      { balancete_id: balanceteId },
    );

    // Log auditoria
    await this.auditoria.log({
      nucleo_id: balancete.nucleo_id,
      usuario_id: usuarioId,
      entidade_tipo: 'balancete_mensal',
      entidade_id: balanceteId,
      acao: 'PUBLISH',
      valores_depois: { status: 'PUBLICADO', publicado: true },
    });

    return { status: 'PUBLICADO', pdf_url: pdfUrl };
  }

  // Obter histórico de aprovações com detalhes
  async getApprovalHistory(balanceteId: string) {
    const aprovacoes = await this.aprovacaoRepo.find({
      where: { balancete_id: balanceteId },
      relations: ['usuario_id'],
      order: { data_aprovacao: 'ASC' },
    });

    return aprovacoes.map(a => ({
      usuario: {
        nome: a.usuario_id.nome_completo,
        cargo: a.cargo_aprovador,
        role: a.role_aprovador,
      },
      status: a.status,
      data: a.data_aprovacao,
      ressalva: a.ressalva,
    }));
  }

  // Adicionar ressalvas (Tesouraria Admin)
  async addReservations(
    balanceteId: string,
    usuarioId: string,
    reservations: { lancamento_id: string; texto: string }[],
  ) {
    for (const res of reservations) {
      await this.semEvidenciaRepo.save({
        lancamento_id: res.lancamento_id,
        balancete_id: balanceteId,
        motivo: res.texto,
        aprovado_com_ressalva: true,
        ressalva_texto: res.texto,
        criado_por: usuarioId,
      });
    }

    return { reservations_added: reservations.length };
  }
}
```

---

## 📚 Endpoints Atualizados para Aprovação

```typescript
// Tesouraria aprova balancete
POST   /balancetes/:id/approve
  Body: { status: 'APROVADO' | 'REPROVADO', ressalva?: string }
  Roles: TESOURARIA, TESOURARIA_ADMIN, CONSELHO_FISCAL, PRESIDENTE
  Response: { aprovacao_id, status, cargo_aprovador, data }

// Conselho reconhece notas fiscais
POST   /balancetes/:id/reconhecer-notas
  Body: { notas_reconhecidas: ['id1', 'id2', ...] }
  Roles: CONSELHO_FISCAL, PRESIDENTE
  Response: { reconhecidas: 3, total: 3, auto_aprovado: true }

// Publicar balancete
POST   /balancetes/:id/publish
  Body: { gerar_pdf: true }
  Roles: TESOURARIA_ADMIN, PRESIDENTE
  Response: { status: 'PUBLICADO', pdf_url: 'https://...' }

// Ver histórico de aprovações
GET    /balancetes/:id/approvals
  Roles: TESOURARIA, CONSELHO_FISCAL, TESOURARIA_ADMIN, PRESIDENTE, REPRESENTANTE
  Response: [{ usuario, status, data, ressalva }, ...]

// Adicionar ressalvas
POST   /balancetes/:id/add-reservations
  Body: { reservations: [{ lancamento_id, texto }] }
  Roles: TESOURARIA_ADMIN
  Response: { reservations_added: 2 }

// Marcar lançamento como sem evidência
POST   /lancamentos/:id/mark-no-evidence
  Body: { motivo: string, data_vencimento: date }
  Roles: TESOURARIA, CONSELHO_FISCAL
  Response: { lancamento_sem_evidencia_id }

// Listar balancetes em rascunho (Tesouraria)
GET    /balancetes?status=RASCUNHO
  Roles: TESOURARIA, CONSELHO_FISCAL, TESOURARIA_ADMIN, PRESIDENTE
  Response: [{ id, ano_mes, status, data_criacao, aprovacoes_count }]

// Download PDF publicado (Sócios)
GET    /balancetes/:id/pdf
  Roles: Todos (mas apenas se publicado)
  Response: PDF file stream

// Ver balancete publicado (Sócios)
GET    /balancetes/:id/published
  Roles: SOCIO, REPRESENTANTE (e acima)
  Filtro: Só retorna se status = 'PUBLICADO'
  Response: { total_receitas, total_despesas, saldo, pdf_url }
```

---

## 🎨 Estrutura de Pastas - Frontend (ATUALIZADO)

```
src/app/dashboard/
├── balancetes/
│   ├── page.tsx                    # Lista de balancetes
│   ├── [ano_mes]/
│   │   ├── page.tsx                # Detalhe balancete
│   │   ├── approve/page.tsx        # Tela de aprovação (Tesouraria)
│   │   ├── recognize/page.tsx      # Reconhecimento notas (Conselho)
│   │   ├── publish/page.tsx        # Publicar (Admin)
│   │   ├── approvals/page.tsx      # Ver histórico de aprovações
│   │   └── reservations/page.tsx   # Adicionar ressalvas
│   └── published/page.tsx           # Balancetes publicados (Sócios)
```

---

## ✅ Checklist Atualizado

### Fase 1: Setup e Autenticação (com Roles Hierárquicos)
- [ ] Implementar JWT com campo `role` hierárquico
- [ ] Implementar `RolesGuard` que respeita hierarquia (PRESIDENTE > TESOURARIA_ADMIN > ...)
- [ ] Tabela `usuario` com campo `cargo` (texto descritivo)
- [ ] Testes de RBAC com múltiplas roles

### Fase 4: Balancete com Aprovação (NOVO)
- [ ] Criar tabelas: `balancete_aprovacao`, `nota_fiscal_reconhecimento`, `lancamento_sem_evidencia`, `balancete_publicacao_pdf`
- [ ] Implementar `BalanceteApprovalService`
- [ ] Estados do balancete: RASCUNHO → APROVANDO → APROVADO/COM_RESSALVAS → PUBLICADO
- [ ] Endpoints de aprovação/reconhecimento/publicação
- [ ] Validar que ambos (Tesouraria + Conselho) aprovaram antes de permitir publicação
- [ ] PDF generator (Puppeteer/PDFKit)
- [ ] Upload de PDF para Firebase Storage

### Fase 7: Frontend de Aprovação (NOVO)
- [ ] Página de aprovação (Tesouraria)
- [ ] Página de reconhecimento de notas (Conselho)
- [ ] Página de publicação (Admin)
- [ ] Página de histórico de aprovações (todos veem)
- [ ] Página de balancete publicado (Sócios)
- [ ] Componente de ressalvas (observações internas)
- [ ] Download PDF para sócios

---

## 🎯 Prompt Atualizado para Google Antigravity

```
[Incluir o prompt anterior + adicionar:]

## FUNCIONALIDADES CRÍTICAS - ATUALIZADO

### 8. Sistema de Aprovação de Balancetes (NOVO)

**Estados:**
- RASCUNHO: Tesouraria revisa, Conselho reconhece notas
- APROVANDO: Aguardando aprovações finais
- APROVADO: Ambos aprovaram, sem ressalvas
- APROVADO_COM_RESSALVAS: Ambos aprovaram, mas com observações internas
- PUBLICADO: PDF gerado e visível para sócios

**Atores e Ações:**
- TESOURARIA: Aprova balancete (não publica)
- CONSELHO_FISCAL: Reconhece notas fiscais, aprova balancete
- TESOURARIA_ADMIN: Tudo de Tesouraria + publica + adiciona ressalvas
- PRESIDENTE: Publica se Tesouraria Admin indisponível

**Validações:**
- Só publica se AMBOS (Tesouraria + Conselho) aprovaram
- Lançamentos sem nota fiscal → apontados como "sem evidência"
- Tesouraria Admin pode aprová-los com ressalva
- Ressalvas são observações internas (não aparecem no PDF público)

### 9. Roles Hierárquicas (NOVO)

Ordem de Hierarquia:
1. ADMIN_GLOBAL (setup global apenas)
2. PRESIDENTE (super admin do núcleo)
3. TESOURARIA_ADMIN (1º Tesoureiro)
4. TESOURARIA (2º Tesoureiro)
5. CONSELHO_FISCAL (membros)
6. REPRESENTANTE (observador)
7. SOCIO (membro comum)

Permissões cascata: PRESIDENTE vê tudo, TESOURARIA vê menos, SOCIO vê mínimo

### 10. Publicação de Balancetes para Sócios (NOVO)

- Sócios só veem balancetes publicados
- Após publicação, gera PDF estilizado
- PDF disponível para download
- Notificação push quando balancete é publicado

---

### TABELAS NOVAS:
- balancete_aprovacao (trilha de quem aprovou/reprovou)
- nota_fiscal_reconhecimento (reconhecimento pelo Conselho)
- lancamento_sem_evidencia (lançamentos sem nota fiscal)
- balancete_publicacao_pdf (PDFs gerados e publicados)

### ENDPOINTS NOVOS:
- POST /balancetes/:id/approve (Tesouraria aprova)
- POST /balancetes/:id/reconhecer-notas (Conselho reconhece)
- POST /balancetes/:id/publish (Publica)
- GET /balancetes/:id/approvals (Ver histórico)
- GET /balancetes/:id/pdf (Download PDF)
- POST /balancetes/:id/add-reservations (Adicionar ressalvas)
```

---

**Versão 2.0 Completa - Pronta para Antigravity! 🚀**

Este manual agora inclui:
✅ Roles Hierárquicas com 7 níveis  
✅ Fluxo de Aprovação de Balancetes (Tesouraria + Conselho)  
✅ Sistema de Ressalvas e Observações Internas  
✅ Publicação e Download de PDFs  
✅ Trilha Completa de Auditoria de Aprovações  
✅ Visibilidade Diferenciada por Role (Sócios veem só publicados)  
✅ Reconhecimento de Notas Fiscais pelo Conselho  
✅ Lançamentos sem Evidência com Prazos  
✅ Endpoints, Schema SQL, e Serviços Completos
