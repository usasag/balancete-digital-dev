"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { UsuarioService } from "@/services/usuario-service";
import { Usuario } from "@/types/usuario";
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

export default function UsuariosPage() {
  const { user } = useAuth();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUsuario, setSelectedUsuario] = useState<Usuario | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

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
                      <TableHead>Role</TableHead>
                      <TableHead>Valor Base (R$)</TableHead>
                      <TableHead className="w-[100px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usuarios.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">
                          {u.nomeCompleto}
                        </TableCell>
                        <TableCell>{u.email}</TableCell>
                        <TableCell>{u.role}</TableCell>
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
