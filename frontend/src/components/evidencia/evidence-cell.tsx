"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface EvidenceCellProps {
  link?: string;
  healthStatus?: "HEALTHY" | "BROKEN" | "MISSING" | "UNKNOWN";
  healthMessage?: string;
  canManage: boolean;
  disabled?: boolean;
  disabledLabel?: string;
  onUpload: (file: File) => Promise<void>;
  onRemove: () => Promise<void>;
  onCheckHealth?: () => Promise<void>;
}

export function EvidenceCell({
  link,
  healthStatus,
  healthMessage,
  canManage,
  disabled,
  disabledLabel,
  onUpload,
  onRemove,
  onCheckHealth,
}: EvidenceCellProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [checking, setChecking] = useState(false);

  const openPicker = () => {
    if (disabled) return;
    inputRef.current?.click();
  };

  const handleFile = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    try {
      await onUpload(file);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleRemove = async () => {
    if (!confirm("Remover vínculo da evidência deste registro?")) return;
    setRemoving(true);
    try {
      await onRemove();
    } finally {
      setRemoving(false);
    }
  };

  const handleCheck = async () => {
    if (!onCheckHealth) return;
    setChecking(true);
    try {
      await onCheckHealth();
    } finally {
      setChecking(false);
    }
  };

  if (!canManage && !link) {
    return <span className="text-xs text-muted-foreground">-</span>;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {link ? (
        <div className="flex flex-col gap-1">
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs underline text-primary"
          >
            Abrir
          </a>
          {healthStatus === "BROKEN" && (
            <span className="text-[11px] text-red-600">Link quebrado</span>
          )}
          {healthStatus === "UNKNOWN" && healthMessage && (
            <span className="text-[11px] text-yellow-700">{healthMessage}</span>
          )}
        </div>
      ) : (
        <span className="text-xs text-muted-foreground">
          {disabled ? disabledLabel || "Indisponível" : "Sem evidência"}
        </span>
      )}

      {canManage && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={disabled || uploading || removing}
            onClick={openPicker}
          >
            {uploading && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
            {link ? "Trocar" : "Anexar"}
          </Button>
          {link && (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={checking || uploading || removing}
              onClick={handleCheck}
            >
              {checking && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
              Verificar
            </Button>
          )}
          {link && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={removing || uploading}
              onClick={handleRemove}
              className="text-red-600 hover:text-red-700"
            >
              {removing && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
              Remover
            </Button>
          )}
        </>
      )}
    </div>
  );
}
