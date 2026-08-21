import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface SelectFieldProps {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  options: readonly string[];
  placeholder: string;
  disabled?: boolean;
  value: string | undefined;
  onValueChange: (value: string) => void;
  onBlur?: () => void;
}

export default function SelectField({
  id,
  label,
  required,
  error,
  options,
  placeholder,
  disabled,
  value,
  onValueChange,
  onBlur,
}: SelectFieldProps) {
  return (
    <div>
      <Label htmlFor={id} className="mb-1.5 block">
        {label} {required && <span className="text-brand-lime-dark">*</span>}
      </Label>
      <Select value={value || undefined} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger
          id={id}
          onBlur={onBlur}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className={cn(
            error && "border-destructive focus:border-destructive focus:ring-destructive/15"
          )}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
