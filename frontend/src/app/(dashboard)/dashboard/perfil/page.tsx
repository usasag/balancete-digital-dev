"use strict";
"use client";

import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ProfilePage() {
  const { user, role } = useAuth();

  if (!user) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">
        Meu Perfil/Configurações
      </h1>

      <Card>
        <CardHeader>
          <CardTitle>Dados do Usuário</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <span className="font-semibold text-muted-foreground block">
              Nome:
            </span>
            <span>{user.displayName || "N/A"}</span>
          </div>
          <div>
            <span className="font-semibold text-muted-foreground block">
              Email:
            </span>
            <span>{user.email}</span>
          </div>
          <div>
            <span className="font-semibold text-muted-foreground block">
              Função (Role):
            </span>
            <span className="px-2 py-1 rounded bg-blue-100 text-blue-800 text-sm font-bold dark:bg-blue-900 dark:text-blue-100">
              {role}
            </span>
          </div>
          <div>
            <span className="font-semibold text-muted-foreground block">
              UID (Firebase):
            </span>
            <code className="text-xs bg-muted p-1 rounded">{user.uid}</code>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Meu Núcleo</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg">
            {user.nucleo?.nome || "Nenhum núcleo vinculado"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
