"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { UsuarioService } from "@/services/usuario-service";
import { Usuario } from "@/types/usuario";
import { GRAU_OPTIONS } from "@/types/grau";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Edit, Loader2 } from "lucide-react";
import { UsuarioFormDialog } from "@/components/usuarios/usuario-form-dialog";
import { MensalidadeReport } from "@/components/usuarios/mensalidade-report";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function UsuariosPage() {
  const ALL_FILTER_VALUE = "__ALL__";
  const { user } = useAuth();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUsuario, setSelectedUsuario] = useState<Usuario | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [grauFilter, setGrauFilter] = useState<string>(ALL_FILTER_VALUE);
  const [statusFilter, setStatusFilter] = useState<string>(ALL_FILTER_VALUE);
  const [sortBy, setSortBy] = useState<string>("nome-asc");

  const fetchUsuarios = async () => {
    if (!user || !user.nucleoId) return;
    setLoading(true);
    try {
      const data = await UsuarioService.getByNucleo(user.nucleoId);
      setUsuarios(data);
    } catch (error) {
      console.error("Erro ao buscar usuários:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsuarios();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleEdit = (usuario: Usuario) => {
    setSelectedUsuario(usuario);
    setIsDialogOpen(true);
  };

  const graus = useMemo(
    () => GRAU_OPTIONS.filter((g) => usuarios.some((u) => u.grau === g)),
    [usuarios],
  );

  const filteredAndSortedUsuarios = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    const filtered = usuarios.filter((u) => {
      const matchesSearch =
        !normalizedSearch ||
        u.nomeCompleto.toLowerCase().includes(normalizedSearch) ||
        u.email.toLowerCase().includes(normalizedSearch);

      const matchesGrau =
        grauFilter === ALL_FILTER_VALUE || (u.grau || "") === grauFilter;

      const matchesStatus =
        statusFilter === ALL_FILTER_VALUE ||
        (statusFilter === "ATIVO" ? u.ativo : !u.ativo);

      return matchesSearch && matchesGrau && matchesStatus;
    });

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case "nome-asc":
          return a.nomeCompleto.localeCompare(b.nomeCompleto);
        case "nome-desc":
          return b.nomeCompleto.localeCompare(a.nomeCompleto);
        case "email-asc":
          return a.email.localeCompare(b.email);
        case "email-desc":
          return b.email.localeCompare(a.email);
        case "mensalidade-desc":
          return Number(b.valor_base || 0) - Number(a.valor_base || 0);
        case "mensalidade-asc":
          return Number(a.valor_base || 0) - Number(b.valor_base || 0);
        default:
          return 0;
      }
    });
  }, [usuarios, search, grauFilter, statusFilter, sortBy]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">
          Gestão de Usuários
        </h1>
      </div>

      <Tabs defaultValue="lista" className="space-y-4">
        <TabsList>
          <TabsTrigger value="lista">Lista de Membros</TabsTrigger>
          <TabsTrigger value="mensalidades">Mensalidades</TabsTrigger>
        </TabsList>

        <TabsContent value="lista">
          <Card>
            <CardHeader>
              <CardTitle>Lista de Membros</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-4">
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por nome ou email"
                  className="md:col-span-2"
                />

                <Select value={grauFilter} onValueChange={setGrauFilter}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Filtrar por grau" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_FILTER_VALUE}>Todos os graus</SelectItem>
                    {graus.map((grau) => (
                      <SelectItem key={grau} value={grau}>
                        {grau}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="grid grid-cols-2 gap-2">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_FILTER_VALUE}>Todos</SelectItem>
                      <SelectItem value="ATIVO">Ativos</SelectItem>
                      <SelectItem value="INATIVO">Inativos</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Ordenar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nome-asc">Nome (A-Z)</SelectItem>
                      <SelectItem value="nome-desc">Nome (Z-A)</SelectItem>
                      <SelectItem value="email-asc">Email (A-Z)</SelectItem>
                      <SelectItem value="email-desc">Email (Z-A)</SelectItem>
                      <SelectItem value="mensalidade-desc">
                        Mensalidade (maior)
                      </SelectItem>
                      <SelectItem value="mensalidade-asc">
                        Mensalidade (menor)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {loading ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Grau</TableHead>
                      <TableHead>Mensalidade Base (R$)</TableHead>
                      <TableHead className="w-[100px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAndSortedUsuarios.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">
                          {u.nomeCompleto}
                        </TableCell>
                        <TableCell>{u.email}</TableCell>
                        <TableCell>{u.grau || "-"}</TableCell>
                        <TableCell>
                          {u.valor_base
                            ? new Intl.NumberFormat("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                              }).format(Number(u.valor_base))
                            : "R$ 0,00"}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(u)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredAndSortedUsuarios.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="h-20 text-center text-muted-foreground"
                        >
                          Nenhum membro encontrado para os filtros atuais.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mensalidades">
          <MensalidadeReport />
        </TabsContent>
      </Tabs>

      <UsuarioFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        usuario={selectedUsuario}
        onSuccess={fetchUsuarios}
      />
    </div>
  );
}
