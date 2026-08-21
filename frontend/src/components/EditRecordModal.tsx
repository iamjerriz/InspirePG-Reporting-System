import { zodResolver } from "@hookform/resolvers/zod";
import { useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { updateLogEntry } from "../api/admin";
import { AREAS, sellerTypesByArea, type Area } from "../config/sellerTypes";
import { editLogEntrySchema, type EditLogEntryValues } from "../schema";
import type { LogEntry } from "../types";
import ConfirmDialog from "./ConfirmDialog";
import ImageUploadField from "./ImageUploadField";
import SelectField from "./SelectField";
import TextField from "./TextField";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface EditRecordModalProps {
  entry: LogEntry;
  onClose: () => void;
  onSaved: () => void;
}

function existingProofUrl(filename: string): string | null {
  return filename ? `/api/admin/proof/${encodeURIComponent(filename)}` : null;
}

export default function EditRecordModal({ entry, onClose, onSaved }: EditRecordModalProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(existingProofUrl(entry.proofFilename));
  const [pendingValues, setPendingValues] = useState<EditLogEntryValues | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputElementRef = useRef<HTMLInputElement | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useForm<EditLogEntryValues>({
    resolver: zodResolver(editLogEntrySchema),
    defaultValues: {
      firstName: entry.firstName,
      lastName: entry.lastName,
      sid: entry.sid,
      area: entry.area as Area,
      sellerType: entry.sellerType,
    },
  });

  const selectedArea = watch("area") as Area | undefined;
  const sellerTypeOptions = selectedArea ? sellerTypesByArea[selectedArea] : [];

  const { ref: proofRegisterRef, ...proofRegisterRest } = register("proof", {
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      setPreviewUrl(file ? URL.createObjectURL(file) : existingProofUrl(entry.proofFilename));
    },
  });

  function handleRemoveImage() {
    setValue("proof", new DataTransfer().files, { shouldValidate: true });
    setPreviewUrl(null);
    if (fileInputElementRef.current) {
      fileInputElementRef.current.value = "";
    }
  }

  const onSubmit = handleSubmit((values) => {
    setError(null);
    setPendingValues(values);
  });

  async function confirmSave() {
    if (!pendingValues) return;
    setIsSaving(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("firstName", pendingValues.firstName);
      formData.append("lastName", pendingValues.lastName);
      formData.append("sid", pendingValues.sid);
      formData.append("area", pendingValues.area);
      formData.append("sellerType", pendingValues.sellerType);
      if (pendingValues.proof.length > 0) {
        formData.append("proof", pendingValues.proof[0]);
      }

      await updateLogEntry(entry.id, formData);
      setPendingValues(null);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save changes. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <Dialog open onOpenChange={(open) => !open && !pendingValues && onClose()}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Record</DialogTitle>
          </DialogHeader>

          <form onSubmit={onSubmit} noValidate className="space-y-4">
            <TextField
              id="edit-firstName"
              label="First Name"
              required
              error={errors.firstName?.message}
              {...register("firstName")}
            />

            <TextField
              id="edit-lastName"
              label="Last Name"
              required
              error={errors.lastName?.message}
              {...register("lastName")}
            />

            <TextField
              id="edit-sid"
              label="SID"
              required
              error={errors.sid?.message}
              {...register("sid")}
            />

            <Controller
              control={control}
              name="area"
              render={({ field }) => (
                <SelectField
                  id="edit-area"
                  label="Area"
                  required
                  placeholder="Select Area"
                  options={AREAS}
                  error={errors.area?.message}
                  value={field.value}
                  onValueChange={(value) => {
                    field.onChange(value);
                    setValue("sellerType", "", { shouldValidate: true });
                  }}
                  onBlur={field.onBlur}
                />
              )}
            />

            <Controller
              control={control}
              name="sellerType"
              render={({ field }) => (
                <SelectField
                  id="edit-sellerType"
                  label="Seller Type"
                  required
                  placeholder={selectedArea ? "Select Seller Type" : "Select an Area first"}
                  options={sellerTypeOptions}
                  disabled={!selectedArea}
                  error={errors.sellerType?.message}
                  value={field.value}
                  onValueChange={field.onChange}
                  onBlur={field.onBlur}
                />
              )}
            />

            <ImageUploadField
              name="edit-proof"
              inputRef={(element) => {
                proofRegisterRef(element);
                fileInputElementRef.current = element;
              }}
              onChange={proofRegisterRest.onChange}
              onBlur={proofRegisterRest.onBlur}
              previewUrl={previewUrl}
              error={errors.proof?.message as string | undefined}
              onRemove={handleRemoveImage}
            />

            {error && (
              <div
                role="alert"
                className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
              >
                {error}
              </div>
            )}

            <DialogFooter className="border-t border-border pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {pendingValues && (
        <ConfirmDialog
          title="Save changes?"
          message="Are you sure you want to save these changes to this record?"
          confirmLabel="Save"
          isLoading={isSaving}
          error={error}
          onConfirm={confirmSave}
          onCancel={() => setPendingValues(null)}
        />
      )}
    </>
  );
}
