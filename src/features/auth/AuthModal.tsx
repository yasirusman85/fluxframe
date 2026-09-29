import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LockKeyhole, Mail, UserRound } from "lucide-react";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { useAuthStore } from "../../store/auth-store";
import { useAccountStore } from "../../store/account-store";

export const AuthModal: React.FC = () => {
  const navigate = useNavigate();
  const { authOpen, authMode, returnTo, closeAuth, openAuth, login, signUp } = useAuthStore();
  const updateProfile = useAccountStore((state) => state.updateProfile);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authOpen) return;
    setError("");
    setPassword("");
  }, [authOpen, authMode]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError("Enter a valid email address.");
    if (password.length < 8) return setError("Password must contain at least 8 characters.");
    if (authMode === "signup" && name.trim().length < 2) return setError("Enter your name.");
    setSubmitting(true);
    try {
      const user = authMode === "signup" ? await signUp(name, email, password) : await login(email, password);
      updateProfile({ displayName: user.name, email: user.email, handle: user.email.split("@")[0] });
      const destination = returnTo;
      closeAuth();
      if (destination) navigate(destination);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Authentication failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={authOpen} onClose={closeAuth} size="sm" testId="auth-modal" title={authMode === "signup" ? "Create your account" : "Welcome back"} description="Continue to Higgsfield Studio">
      <form onSubmit={submit} className="space-y-4" noValidate>
        {authMode === "signup" && <Input testId="auth-name" label="Name" value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" leftIcon={<UserRound />} />}
        <Input testId="auth-email" label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" leftIcon={<Mail />} />
        <Input testId="auth-password" label="Password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={authMode === "signup" ? "new-password" : "current-password"} hint={authMode === "signup" ? "Use at least 8 characters." : undefined} leftIcon={<LockKeyhole />} />
        {error && <p role="alert" className="rounded-lg border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">{error}</p>}
        <Button type="submit" data-testid="auth-submit" isLoading={submitting} className="w-full">{authMode === "signup" ? "Create account" : "Login"}</Button>
        <p className="text-center text-xs text-zinc-400">
          {authMode === "signup" ? "Already have an account?" : "New to Higgsfield?"}{" "}
          <button type="button" className="font-semibold text-accent hover:underline" onClick={() => openAuth(authMode === "signup" ? "login" : "signup", returnTo ?? undefined)}>{authMode === "signup" ? "Login" : "Sign up"}</button>
        </p>
        <p className="text-center text-[10px] leading-relaxed text-zinc-500">Local demo authentication. Credentials stay in this browser and are not suitable for production.</p>
      </form>
    </Modal>
  );
};
