import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { Eye, EyeOff } from "lucide-react";

type Mode = "login" | "signup" | "forgot";

const Auth = () => {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) navigate("/");
  }, [user, navigate]);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      else navigate("/");
    } else if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName, phone },
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) setError(error.message);
      else setSuccess("Account created! Check your email to verify, or login if auto-confirm is enabled.");
    } else {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) setError(error.message);
      else setSuccess("If an account exists for that email, a password reset link has been sent.");
    }
    setLoading(false);
  };

  const titles: Record<Mode, { heading: string; sub: string }> = {
    login: { heading: "Welcome Back", sub: "Login to your BuenoExports account" },
    signup: { heading: "Create Account", sub: "Sign up to start shopping" },
    forgot: { heading: "Reset Password", sub: "Enter your email to receive a reset link" },
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="rounded-xl border border-border bg-card p-8 shadow-lg">
          <h1 className="text-2xl font-bold text-center mb-2">{titles[mode].heading}</h1>
          <p className="text-sm text-muted-foreground text-center mb-6">{titles[mode].sub}</p>

          {error && (
            <div className="rounded-lg bg-destructive/10 p-3 mb-4 text-sm text-destructive">{error}</div>
          )}
          {success && (
            <div className="rounded-lg bg-green-100 p-3 mb-4 text-sm text-green-800">{success}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1">Full Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm outline-none focus:border-secondary focus:ring-1 focus:ring-secondary/30"
                    placeholder="Your full name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Phone</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm outline-none focus:border-secondary focus:ring-1 focus:ring-secondary/30"
                    placeholder="+91 XXXXX XXXXX"
                  />
                </div>
              </>
            )}
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm outline-none focus:border-secondary focus:ring-1 focus:ring-secondary/30"
                placeholder="you@example.com"
              />
            </div>
            {mode !== "forgot" && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium">Password</label>
                  {mode === "login" && (
                    <button
                      type="button"
                      onClick={() => switchMode("forgot")}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm outline-none focus:border-secondary focus:ring-1 focus:ring-secondary/30 pr-10"
                    placeholder="Min 6 characters"
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-2.5 text-muted-foreground">
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-md transition-all hover:shadow-lg active:scale-[0.98] disabled:opacity-50"
            >
              {loading
                ? "Please wait..."
                : mode === "login" ? "Login" : mode === "signup" ? "Create Account" : "Send Reset Link"}
            </button>
          </form>

          {mode === "forgot" ? (
            <p className="text-sm text-center mt-6 text-muted-foreground">
              <button onClick={() => switchMode("login")} className="font-semibold text-primary hover:underline">
                Back to Login
              </button>
            </p>
          ) : (
            <p className="text-sm text-center mt-6 text-muted-foreground">
              {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
              <button
                onClick={() => switchMode(mode === "login" ? "signup" : "login")}
                className="font-semibold text-primary hover:underline"
              >
                {mode === "login" ? "Sign Up" : "Login"}
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;
