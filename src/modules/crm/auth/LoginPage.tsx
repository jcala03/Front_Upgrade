import { FormEvent, useState } from "react";
import { login } from "../../../api/auth";
import { consumeAuthNotice, saveAuthUser } from "../../../utils/authStorage";
import "./LoginPage.css";

export const LoginPage = () => {
  const [email, setEmail] = useState("admin@upgrade79.com");
  const [password, setPassword] = useState("Admin12345*");
  const [error, setError] = useState(() => consumeAuthNotice());
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError("");

    try {
      setIsLoading(true);

      const response = await login(email, password);

      saveAuthUser(response.user);

      window.location.href = response.user.role === "admin" ? "/crm" : "/crm/me";
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "No se pudo iniciar sesión."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="crm-login">
      <section className="crm-login__panel">
        <div className="crm-login__brand">
          <span>UP GRADE 79</span>
          <h1>CRM Access</h1>
          <p>Acceso interno para administración y operación.</p>
        </div>

        <form className="crm-login__form" onSubmit={handleSubmit}>
          <label>
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <label>
            <span>Contraseña</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          {error ? <p className="crm-login__error">{error}</p> : null}

          <button type="submit" disabled={isLoading}>
            {isLoading ? "Entrando..." : "Entrar al CRM"}
          </button>
        </form>
      </section>
    </main>
  );
};
