import { zodResolver } from "@hookform/resolvers/zod";
import { useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { AREAS, sellerTypesByArea, type Area } from "../config/sellerTypes";
import { loggerFormSchema, type LoggerFormValues } from "../schema";
import ImageUploadField from "./ImageUploadField";
import SelectField from "./SelectField";
import TextField from "./TextField";

type SubmitStatus = { type: "success" | "error"; message: string } | null;

export default function LoggerForm() {
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputElementRef = useRef<HTMLInputElement | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LoggerFormValues>({
    resolver: zodResolver(loggerFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      sid: "",
      area: undefined,
      sellerType: "",
    },
  });

  const selectedArea = watch("area") as Area | undefined;
  const sellerTypeOptions = selectedArea ? sellerTypesByArea[selectedArea] : [];

  const [watchedFirstName, watchedLastName, watchedSid, watchedSellerType, watchedProof] = watch([
    "firstName",
    "lastName",
    "sid",
    "sellerType",
    "proof",
  ]);

  const isFormIncomplete =
    !watchedFirstName?.trim() ||
    !watchedLastName?.trim() ||
    !watchedSid?.trim() ||
    !selectedArea ||
    !watchedSellerType ||
    !watchedProof ||
    watchedProof.length === 0;

  const { ref: proofRegisterRef, ...proofRegisterRest } = register("proof", {
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        setPreviewUrl(URL.createObjectURL(file));
      } else {
        setPreviewUrl(null);
      }
    },
  });

  function handleRemoveImage() {
    setValue("proof", new DataTransfer().files, { shouldValidate: true });
    setPreviewUrl(null);
    if (fileInputElementRef.current) {
      fileInputElementRef.current.value = "";
    }
  }

  const onSubmit = handleSubmit(async (values) => {
    setSubmitStatus(null);
    try {
      const formData = new FormData();
      formData.append("firstName", values.firstName);
      formData.append("lastName", values.lastName);
      formData.append("sid", values.sid);
      formData.append("area", values.area);
      formData.append("sellerType", values.sellerType);
      formData.append("proof", values.proof[0]);

      const response = await fetch("/api/log", {
        method: "POST",
        body: formData,
      });

      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.success) {
        throw new Error(result?.message || "Unable to save the record. Please try again.");
      }

      setSubmitStatus({ type: "success", message: result.message });
      reset();
      setPreviewUrl(null);
      if (fileInputElementRef.current) {
        fileInputElementRef.current.value = "";
      }
    } catch (err) {
      setSubmitStatus({
        type: "error",
        message: err instanceof Error ? err.message : "Unable to save the record. Please try again.",
      });
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <TextField
        id="firstName"
        label="First Name"
        required
        placeholder="Juan"
        error={errors.firstName?.message}
        {...register("firstName")}
      />

      <TextField
        id="lastName"
        label="Last Name"
        required
        placeholder="Dela Cruz"
        error={errors.lastName?.message}
        {...register("lastName")}
      />

      <TextField
        id="sid"
        label="SID"
        required
        placeholder="SID12345"
        error={errors.sid?.message}
        {...register("sid")}
      />

      <Controller
        control={control}
        name="area"
        render={({ field }) => (
          <SelectField
            id="area"
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
            id="sellerType"
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
        name="proof"
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

      {submitStatus && (
        <div
          role="status"
          className={`rounded-xl border px-4 py-3 text-sm ${
            submitStatus.type === "success"
              ? "border-brand-lime/40 bg-brand-lime/10 text-brand-lime-dark"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {submitStatus.type === "success" ? (
            <>
              <p className="font-semibold">✓ Successfully Logged</p>
              <p>{submitStatus.message}</p>
            </>
          ) : (
            <>
              <p className="font-semibold">Unable to save the record.</p>
              <p>{submitStatus.message}</p>
            </>
          )}
        </div>
      )}

      <Button
        type="submit"
        size="lg"
        disabled={isSubmitting || isFormIncomplete}
        className="w-full bg-brand-blue text-white hover:bg-brand-indigo active:bg-brand-navy disabled:bg-slate-300 disabled:text-slate-500"
      >
        {isSubmitting ? "Submitting..." : "Submit"}
      </Button>
    </form>
  );
}
