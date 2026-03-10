"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { Role } from "@/types/role";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  FileText,
  DollarSign,
  Users,
  Settings,
  LogOut,
  Files,
  LucideIcon,
  Menu,
} from "lucide-react";
import { auth } from "@/lib/firebase";
import { useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ModeToggle } from "@/components/mode-toggle";

interface SidebarProps {
  className?: string;
  onClose?: () => void;
}

interface NavItemProps {
  href: string;
  icon: LucideIcon;
  label: string;
  onClose?: () => void;
}

function NavItem({ href, icon: Icon, label, onClose }: NavItemProps) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname?.startsWith(href + "/");

  return (
    <Link href={href} onClick={onClose}>
      <Button
        variant="ghost"
        className={cn(
          "w-full justify-start hover:bg-slate-800 hover:text-white",
          isActive && "bg-slate-800 text-white font-medium",
        )}
      >
        <Icon className="mr-2 h-4 w-4" />
        {label}
      </Button>
    </Link>
  );
}

export function Sidebar({ className, onClose }: SidebarProps) {
  const { role } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await auth.signOut();
    if (onClose) onClose();
    router.push("/login");
  };

  const handleLinkClick = () => {
    if (onClose) onClose();
  };

  return (
    <div
      className={cn(
        "flex flex-col h-full bg-slate-900 text-white w-64 p-4",
        className,
      )}
    >
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold">Balancete Digital</h1>
          <p className="text-xs text-slate-400 mt-1">Gestão de Tesouraria</p>
        </div>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="md:hidden text-white hover:bg-slate-800"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}
      </div>

      <nav className="flex-1 space-y-2 overflow-y-auto">
        <NavItem
          href="/dashboard"
          icon={LayoutDashboard}
          label="Dashboard"
          onClose={handleLinkClick}
        />

        {/* Tesouraria & Admin - Full Access */}
        {role && [Role.TESOURARIA, Role.ADMIN_GLOBAL].includes(role) && (
          <>
            <NavItem
              href="/balancetes"
              icon={FileText}
              label="Balancetes"
              onClose={handleLinkClick}
            />
            <NavItem
              href="/lancamentos"
              icon={DollarSign}
              label="Lançamentos"
              onClose={handleLinkClick}
            />
            <NavItem
              href="/mensalidades"
              icon={DollarSign}
              label="Mensalidades"
              onClose={handleLinkClick}
            />
            <NavItem
              href="/configuracoes/plano-contas"
              icon={FileText}
              label="Plano de Contas"
              onClose={handleLinkClick}
            />
            <NavItem
              href="/taxas"
              icon={DollarSign}
              label="Taxas e Caixas"
              onClose={handleLinkClick}
            />
            <NavItem
              href="/periodos"
              icon={Files}
              label="Períodos"
              onClose={handleLinkClick}
            />
            <NavItem
              href="/dashboard/usuarios"
              icon={Users}
              label="Usuários"
              onClose={handleLinkClick}
            />
          </>
        )}

        {/* Presidencia - Read Only mostly, Edit Users */}
        {role === Role.PRESIDENCIA && (
          <>
            <NavItem
              href="/balancetes"
              icon={FileText}
              label="Balancetes"
              onClose={handleLinkClick}
            />
            <NavItem
              href="/mensalidades"
              icon={DollarSign}
              label="Inadimplência"
              onClose={handleLinkClick}
            />
            <NavItem
              href="/taxas"
              icon={DollarSign}
              label="Taxas e Caixas"
              onClose={handleLinkClick}
            />
            <NavItem
              href="/periodos"
              icon={Files}
              label="Períodos"
              onClose={handleLinkClick}
            />
            <NavItem
              href="/dashboard/usuarios"
              icon={Users}
              label="Usuários"
              onClose={handleLinkClick}
            />
          </>
        )}

        {/* Contabilidade & Conselho - Audit View */}
        {role &&
          (role === Role.CONTABILIDADE_UNICA ||
            role === Role.CONSELHO_FISCAL) && (
            <>
              <NavItem
                href="/balancetes"
                icon={FileText}
                label="Balancetes"
                onClose={handleLinkClick}
              />
              <NavItem
                href="/lancamentos"
                icon={DollarSign}
                label="Lançamentos (Audit)"
                onClose={handleLinkClick}
              />
              <NavItem
                href="/periodos"
                icon={Files}
                label="Períodos"
                onClose={handleLinkClick}
              />
            </>
          )}

        {/* Socio - Self View */}
        {role === Role.SOCIO && (
          <>
            <NavItem
              href="/meus-balancetes"
              icon={FileText}
              label="Meus Balancetes"
              onClose={handleLinkClick}
            />
            <NavItem
              href="/minhas-mensalidades"
              icon={DollarSign}
              label="Minhas Mensalidades"
              onClose={handleLinkClick}
            />
            <NavItem
              href="/dashboard/perfil"
              icon={Settings}
              label="Perfil"
              onClose={handleLinkClick}
            />
          </>
        )}

        <div className="mt-auto pt-4 border-t border-slate-700">
          <NavItem
            href="/dashboard/perfil"
            icon={Settings}
            label="Configurações"
            onClose={handleLinkClick}
          />
        </div>
      </nav>

      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between px-2">
          <span className="text-sm">Tema</span>
          <ModeToggle />
        </div>
        <Button
          variant="destructive"
          className="w-full justify-start"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sair
        </Button>
      </div>
    </div>
  );
}
