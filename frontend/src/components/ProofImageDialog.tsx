import { ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { LogEntry } from "../types";

interface ProofImageDialogProps {
  entry: LogEntry | null;
  onClose: () => void;
}

export default function ProofImageDialog({ entry, onClose }: ProofImageDialogProps) {
  if (!entry || !entry.proofFilename) return null;

  const src = `/api/admin/proof/${encodeURIComponent(entry.proofFilename)}`;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Proof of OOP Login — {entry.firstName} {entry.lastName}
          </DialogTitle>
        </DialogHeader>

        <div className="flex max-h-[70vh] items-center justify-center overflow-auto rounded-lg border border-border bg-muted/40">
          <img
            src={src}
            alt={`Proof of OOP Login for ${entry.firstName} ${entry.lastName}`}
            className="max-h-[70vh] w-auto max-w-full object-contain"
          />
        </div>

        <a
          href={src}
          target="_blank"
          rel="noreferrer"
          className="inline-flex w-fit items-center gap-1 text-sm font-medium text-primary hover:text-primary/80 hover:underline"
        >
          Open original in new tab
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </DialogContent>
    </Dialog>
  );
}
