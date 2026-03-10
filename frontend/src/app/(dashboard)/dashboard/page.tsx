"use client";

import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardPage() {
  const { user, role } = useAuth();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">
        Bem-vindo, {user?.displayName || "Usuário"}
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Meu Núcleo</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {user?.nucleo?.nome || "Núcleo não definido"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Minha Função</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-medium text-muted-foreground">{role}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-green-600 dark:text-green-400 font-bold">
              Ativo
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
