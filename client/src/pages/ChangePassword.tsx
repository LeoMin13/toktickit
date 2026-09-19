import { useState, FormEvent } from "react";
import { useAuth } from "../context/AuthContext.js";
import { changePassword } from "../api.js";

function checkRules(password: string) {
  return {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };
}

export default function ChangePassword() {
  const { refresh } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const rules = checkRules(newPassword);
  const allRulesPass = Object.values(rules).every(Boolean);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const canSubmit = allRulesPass && passwordsMatch && currentPassword.length > 0;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError("");
    try {
      await changePassword(currentPassword, newPassword);
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="container py-5" style={{ maxWidth: 420 }}>
      <h1 className="h5 mb-2">Change Your Password</h1>
      <p className="text-muted small mb-4">You must change your password to continue.</p>

      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label htmlFor="currentPassword" className="form-label fw-semibold">
            Current (temporary) password
          </label>
          <input
            id="currentPassword"
            type="password"
            className="form-control"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </div>
        <div className="mb-3">
          <label htmlFor="newPassword" className="form-label fw-semibold">New password</label>
          <input
            id="newPassword"
            type="password"
            className="form-control"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </div>
        <div className="mb-3">
          <label htmlFor="confirmPassword" className="form-label fw-semibold">Confirm new password</label>
          <input
            id="confirmPassword"
            type="password"
            className="form-control"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>

        <ul className="list-unstyled small mb-3">
          <li className={rules.length ? "text-success" : "text-muted"}>✓ At least 8 characters</li>
          <li className={rules.upper && rules.lower ? "text-success" : "text-muted"}>
            ✓ Upper and lower case letters
          </li>
          <li className={rules.number && rules.special ? "text-success" : "text-muted"}>
            ✓ A number and a special character
          </li>
        </ul>

        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}

        <button className="btn btn-success w-100" type="submit" disabled={!canSubmit || submitting}>
          {submitting ? "Saving…" : "Continue"}
        </button>
      </form>
    </div>
  );
}