"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { periodoService, DashboardAlert } from "@/services/periodo-service";

export default function DashboardPage() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<DashboardAlert[]>([]);

  useEffect(() => {
    const fetchAlerts = async () => {
      if (!user?.nucleoId) return;
      try {
        const response = await periodoService.getAlertas(user.nucleoId);
        setAlerts(response.alertas || []);
      } catch {
        toast.error("Não foi possível carregar os alertas do dashboard.");
      }
    };

    fetchAlerts();
  }, [user?.nucleoId]);

  const alertColor = (severity: DashboardAlert["severity"]) => {
    if (severity === "critical") return "border-red-300 bg-red-50";
    if (severity === "warning") return "border-amber-300 bg-amber-50";
    return "border-blue-300 bg-blue-50";
  };

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
            <CardTitle>Meu Grau</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-medium text-muted-foreground">
              {user?.grau || "-"}
            </p>
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

      <Card>
        <CardHeader>
          <CardTitle>Alertas Automáticos</CardTitle>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum alerta ativo no momento.
            </p>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div
                  key={alert.code}
                  className={`rounded-md border p-3 ${alertColor(alert.severity)}`}
                >
                  <p className="font-semibold text-sm">{alert.title}</p>
                  <p className="text-sm text-muted-foreground">{alert.message}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
