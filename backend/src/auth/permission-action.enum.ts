import { Role } from '../common/enums/role.enum';

export enum PermissionAction {
  LANCAMENTO_CREATE = 'LANCAMENTO_CREATE',
  LANCAMENTO_EDIT = 'LANCAMENTO_EDIT',
  LANCAMENTO_DELETE = 'LANCAMENTO_DELETE',
  LANCAMENTO_IMPORT = 'LANCAMENTO_IMPORT',
  EVIDENCIA_MANAGE = 'EVIDENCIA_MANAGE',
  MENSALIDADE_EDIT = 'MENSALIDADE_EDIT',
  MENSALIDADE_DELETE = 'MENSALIDADE_DELETE',
  MENSALIDADE_PAY = 'MENSALIDADE_PAY',
  MENSALIDADE_AGREEMENT = 'MENSALIDADE_AGREEMENT',
  PERIODO_MANAGE = 'PERIODO_MANAGE',
  AUDITORIA_VIEW = 'AUDITORIA_VIEW',
}

export const ROLE_PERMISSIONS: Record<Role, PermissionAction[]> = {
  [Role.ADMIN_GLOBAL]: Object.values(PermissionAction),
  [Role.PRESIDENCIA]: [
    PermissionAction.MENSALIDADE_PAY,
    PermissionAction.MENSALIDADE_AGREEMENT,
    PermissionAction.PERIODO_MANAGE,
    PermissionAction.AUDITORIA_VIEW,
  ],
  [Role.TESOURARIA]: [
    PermissionAction.LANCAMENTO_CREATE,
    PermissionAction.LANCAMENTO_EDIT,
    PermissionAction.LANCAMENTO_DELETE,
    PermissionAction.LANCAMENTO_IMPORT,
    PermissionAction.EVIDENCIA_MANAGE,
    PermissionAction.MENSALIDADE_EDIT,
    PermissionAction.MENSALIDADE_DELETE,
    PermissionAction.MENSALIDADE_PAY,
    PermissionAction.MENSALIDADE_AGREEMENT,
    PermissionAction.PERIODO_MANAGE,
    PermissionAction.AUDITORIA_VIEW,
  ],
  [Role.CONSELHO_FISCAL]: [PermissionAction.AUDITORIA_VIEW],
  [Role.CONTABILIDADE_UNICA]: [PermissionAction.AUDITORIA_VIEW],
  [Role.SOCIO]: [],
};
