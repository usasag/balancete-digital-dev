"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
// import { useAuth } from "@/contexts/AuthContext";
import { balanceteService } from "@/services/balancete-service";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";

export default function NovoBalancete() {
  const router = useRouter();
  // const { user } = useAuth();
  const [anoMes, setAnoMes] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await balanceteService.create({ ano_mes: anoMes });
      // Implicitly uses token for backend to know which nucleo
      router.push("/balancetes");
    } catch (error) {
      console.error(error);
      alert(
        "Erro ao criar balancete. Verifique se já existe um para este mês.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Novo Balancete</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Criar Balancete Mensal</CardTitle>
          <CardDescription>
            Inicie o processo de fechamento do mês.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="anoMes">Mês de Referência</Label>
              <Input
                id="anoMes"
                type="month"
                required
                value={anoMes}
                onChange={(e) => setAnoMes(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Criando..." : "Criar Balancete"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
