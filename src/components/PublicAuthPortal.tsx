import type { FormEventHandler } from "react";
import { ArrowLeft, ArrowRight, Building2, CheckCircle2, Database, FileCheck2, Lock, Mail, ShieldCheck } from "lucide-react";
import AsymmetricInfinityLogo from "./AsymmetricInfinityLogo.tsx";

interface PublicAuthPortalProps {
  isSignUpMode: boolean;
  isForgotPasswordMode: boolean;
  loginError: string;
  signupError: string;
  passwordResetMessage: string;
  loginEmail: string;
  loginPassword: string;
  signupName: string;
  signupEmail: string;
  signupOrgName: string;
  signupPassword: string;
  setLoginEmail: (value: string) => void;
  setLoginPassword: (value: string) => void;
  setSignupName: (value: string) => void;
  setSignupEmail: (value: string) => void;
  setSignupOrgName: (value: string) => void;
  setSignupPassword: (value: string) => void;
  onLogin: FormEventHandler<HTMLFormElement>;
  onSignup: FormEventHandler<HTMLFormElement>;
  onPasswordReset: FormEventHandler<HTMLFormElement>;
  onShowReset: () => void;
  onShowSignup: () => void;
  onReturnToLogin: () => void;
  onHome: () => void;
}

const portalBenefits = [
  [ShieldCheck, "Isolated company workspace", "Your organisation, facilities and evidence remain separated by tenant-level controls."],
  [Database, "One sustainability record", "Manage activity data, calculations, projects and reporting from one governed platform."],
  [FileCheck2, "Audit-ready workflows", "Keep factor references, approvals and supporting documents connected to every result."],
] as const;

export default function PublicAuthPortal({
  isSignUpMode,
  isForgotPasswordMode,
  loginError,
  signupError,
  passwordResetMessage,
  loginEmail,
  loginPassword,
  signupName,
  signupEmail,
  signupOrgName,
  signupPassword,
  setLoginEmail,
  setLoginPassword,
  setSignupName,
  setSignupEmail,
  setSignupOrgName,
  setSignupPassword,
  onLogin,
  onSignup,
  onPasswordReset,
  onShowReset,
  onShowSignup,
  onReturnToLogin,
  onHome,
}: PublicAuthPortalProps) {
  const title = isForgotPasswordMode ? "Recover Your Access" : isSignUpMode ? "Create Your Workspace" : "Welcome Back";
  const eyebrow = isForgotPasswordMode ? "Secure recovery" : isSignUpMode ? "Company registration" : "Client portal";
  const description = isForgotPasswordMode
    ? "Enter your corporate email and we will start the secure password-recovery process."
    : isSignUpMode
      ? "Set up your organisation account and begin building a structured sustainability record."
      : "Sign in to manage emissions, facilities, evidence, reports and reduction programmes.";

  return (
    <section className="v1-auth-page">
      <div className="bc-shell v1-auth-shell">
        <aside className="v1-auth-story">
          <button type="button" className="v1-auth-brand" onClick={onHome} aria-label="Return to Balancing Carbon home">
            <AsymmetricInfinityLogo size="lg" variant="dark" />
          </button>
          <div className="v1-auth-story-copy">
            <span className="v1-section-label">Enterprise carbon intelligence</span>
            <h1>Turn sustainability information into <em>business action.</em></h1>
            <p>A secure operating workspace for carbon accounting, supplier readiness, ESG reporting and measurable decarbonisation.</p>
          </div>
          <div className="v1-auth-benefits">
            {portalBenefits.map(([Icon, benefitTitle, copy]) => (
              <article key={benefitTitle}>
                <Icon />
                <div><h2>{benefitTitle}</h2><p>{copy}</p></div>
              </article>
            ))}
          </div>
          <p className="v1-auth-assurance"><CheckCircle2 /> Secure access powered by your Balancing Carbon account.</p>
        </aside>

        <div className="v1-auth-panel-wrap">
          <div className="v1-auth-panel">
            <button type="button" className="v1-auth-back" onClick={onHome}><ArrowLeft /> Back to website</button>
            <div className="v1-auth-mode-switch" role="tablist" aria-label="Account access mode">
              <button type="button" role="tab" aria-selected={!isSignUpMode} onClick={onReturnToLogin}>Login</button>
              <button type="button" role="tab" aria-selected={isSignUpMode} onClick={onShowSignup}>Register</button>
            </div>
            <div className="v1-auth-heading">
              <span>{eyebrow}</span>
              <h2>{title}</h2>
              <p>{description}</p>
            </div>

            {!isSignUpMode && loginError && <div className="v1-auth-alert" role="alert">{loginError}</div>}
            {isSignUpMode && signupError && <div className="v1-auth-alert" role="alert">{signupError}</div>}

            {isForgotPasswordMode ? (
              <form onSubmit={onPasswordReset} className="v1-auth-form">
                <label htmlFor="reset-email">Corporate email address</label>
                <div className="v1-auth-input"><Mail /><input id="reset-email" type="email" required autoComplete="email" placeholder="you@company.com" value={loginEmail} onChange={(event) => setLoginEmail(event.target.value)} /></div>
                {passwordResetMessage && <div className="v1-auth-success" role="status">{passwordResetMessage}</div>}
                <button type="submit" className="v1-auth-submit"><Mail /> Send reset link <ArrowRight /></button>
                <button type="button" className="v1-auth-text-button" onClick={onReturnToLogin}>Return to sign in</button>
              </form>
            ) : !isSignUpMode ? (
              <form onSubmit={onLogin} className="v1-auth-form">
                <label htmlFor="login-email">Corporate email address</label>
                <div className="v1-auth-input"><Mail /><input id="login-email" type="email" required autoComplete="email" placeholder="you@company.com" value={loginEmail} onChange={(event) => setLoginEmail(event.target.value)} /></div>
                <div className="v1-auth-label-row"><label htmlFor="login-password">Password</label><button type="button" onClick={onShowReset}>Forgot password?</button></div>
                <div className="v1-auth-input"><Lock /><input id="login-password" type="password" required autoComplete="current-password" placeholder="Enter your password" value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} /></div>
                <button type="submit" className="v1-auth-submit"><Lock /> Sign in securely <ArrowRight /></button>
                <p className="v1-auth-switch">New to Balancing Carbon? <button type="button" onClick={onShowSignup}>Create a company workspace</button></p>
              </form>
            ) : (
              <form onSubmit={onSignup} className="v1-auth-form">
                <div className="v1-auth-field-grid">
                  <div><label htmlFor="signup-name">Full name</label><div className="v1-auth-input"><Building2 /><input id="signup-name" type="text" required autoComplete="name" placeholder="Your name" value={signupName} onChange={(event) => setSignupName(event.target.value)} /></div></div>
                  <div><label htmlFor="signup-email">Corporate email</label><div className="v1-auth-input"><Mail /><input id="signup-email" type="email" required autoComplete="email" placeholder="you@company.com" value={signupEmail} onChange={(event) => setSignupEmail(event.target.value)} /></div></div>
                </div>
                <label htmlFor="signup-organisation">Organisation or factory name</label>
                <div className="v1-auth-input"><Building2 /><input id="signup-organisation" type="text" required autoComplete="organization" placeholder="Company name" value={signupOrgName} onChange={(event) => setSignupOrgName(event.target.value)} /></div>
                <label htmlFor="signup-password">Create password</label>
                <div className="v1-auth-input"><Lock /><input id="signup-password" type="password" required minLength={10} autoComplete="new-password" aria-describedby="signup-password-help" placeholder="Create a secure password" value={signupPassword} onChange={(event) => setSignupPassword(event.target.value)} /></div>
                <p id="signup-password-help" className="v1-auth-field-help">Use at least 10 characters with a letter and number.</p>
                <button type="submit" className="v1-auth-submit"><Building2 /> Register company <ArrowRight /></button>
                <p className="v1-auth-switch">Already have an account? <button type="button" onClick={onReturnToLogin}>Sign in</button></p>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
