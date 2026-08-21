import { InputHTMLAttributes, forwardRef } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  ({ label, error, id, required, className, ...inputProps }, ref) => {
    return (
      <div>
        <Label htmlFor={id} className="mb-1.5 block">
          {label} {required && <span className="text-brand-lime-dark">*</span>}
        </Label>
        <Input
          id={id}
          ref={ref}
          required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className={cn(error && "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/15", className)}
          {...inputProps}
        />
        {error && (
          <p id={`${id}-error`} role="alert" className="mt-1.5 text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
    );
  }
);

TextField.displayName = "TextField";

export default TextField;
