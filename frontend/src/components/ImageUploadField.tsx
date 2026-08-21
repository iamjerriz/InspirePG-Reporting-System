import { ChangeEvent, Ref } from "react";
import { Upload } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface ImageUploadFieldProps {
  name: string;
  inputRef: Ref<HTMLInputElement>;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onBlur: (event: React.FocusEvent<HTMLInputElement>) => void;
  previewUrl: string | null;
  error?: string;
  onRemove: () => void;
}

export default function ImageUploadField({
  name,
  inputRef,
  onChange,
  onBlur,
  previewUrl,
  error,
  onRemove,
}: ImageUploadFieldProps) {
  return (
    <div>
      <Label htmlFor={name} className="mb-1.5 block">
        Proof of OOP Login <span className="text-brand-lime-dark">*</span>
      </Label>

      {!previewUrl && (
        <label
          htmlFor={name}
          className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-input bg-muted/40 px-4 py-5 text-center transition hover:border-primary/50 hover:bg-primary/5 active:bg-primary/10"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Upload className="h-4 w-4" />
          </span>
          <span className="text-sm font-semibold text-primary">Tap to upload image</span>
          <span className="text-xs text-muted-foreground">JPG, PNG, or WEBP, up to 5MB</span>
        </label>
      )}

      <input
        id={name}
        name={name}
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={onChange}
        onBlur={onBlur}
        className={previewUrl ? "hidden" : "sr-only"}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${name}-error` : undefined}
      />

      {previewUrl && (
        <div className="mt-1 flex items-center gap-4 rounded-xl border border-border bg-muted/40 p-3">
          <img
            src={previewUrl}
            alt="Proof of OOP Login preview"
            className="h-16 w-16 shrink-0 rounded-lg border border-border object-cover"
          />
          <div className="flex flex-1 flex-col gap-2">
            <span className="text-sm font-medium text-foreground">Image selected</span>
            <div className="flex gap-2">
              <label
                htmlFor={name}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "cursor-pointer")}
              >
                Change
              </label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onRemove}
                className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                Remove
              </Button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <p id={`${name}-error`} role="alert" className="mt-1.5 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
