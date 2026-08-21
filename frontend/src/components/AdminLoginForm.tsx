import { FormEvent, useState } from "react";
import { adminLogin } from "../api/admin";
import BrandMark from "./BrandMark";
import ThemeToggle from "./ThemeToggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AdminLoginFormProps {
  onLoggedIn: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
}

export default function AdminLoginForm({ onLoggedIn, isDark, onToggleTheme }: AdminLoginFormProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    setError(null);
    setIsSubmitting(true);
    try {
      await adminLogin(username, password);
      onLoggedIn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to log in. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-[100dvh] flex-col items-center justify-center bg-background px-4 py-10">
      <div className="absolute right-4 top-4">
        <ThemeToggle isDark={isDark} onToggle={onToggleTheme} />
      </div>

      <Card className="w-full max-w-sm shadow-brand">
        <CardContent className="p-6">
          <div className="mb-5 flex justify-center">
            <BrandMark
              iconClassName="h-12 sm:h-14"
              wordmarkClassName="text-xl text-foreground sm:text-2xl"
              taglineClassName="text-xs text-muted-foreground sm:text-sm"
            />
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div>
              <Label htmlFor="username" className="mb-1.5 block">
                Username
              </Label>
              <Input
                id="username"
                type="text"
                required
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="password" className="mb-1.5 block">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
              >
                {error}
              </div>
            )}

            <Button type="submit" size="lg" disabled={isSubmitting} className="w-full">
              {isSubmitting ? "Logging in..." : "Log In"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
