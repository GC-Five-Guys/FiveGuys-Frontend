import { useState } from "react";
import { ApiError, login } from "../api";
import loginBg from "../assets/yggdrasil_background_exact.svg";
import appIcon from "../assets/yggdrasil_icon_transparent.svg";

type LoginPageProps = {
  onLogin?: () => void;
};

function UserIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}

function LoginPage({ onLogin }: LoginPageProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (event: { preventDefault: () => void }) => {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      await login({ email, password });
      onLogin?.();
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setErrorMessage("이메일 또는 비밀번호를 확인해 주세요.");
      } else {
        setErrorMessage("로그인 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      {/* 전체 배경 이미지 */}
      <img className="login-bg-image" src={loginBg} alt="" aria-hidden="true" />

      {/* 로그인 카드 */}
      <main className="login-card">
        {/* 앱 아이콘 */}
        <div className="login-logo-box">
          <div className="login-logo-wrap">
            <img className="login-logo-icon" src={appIcon} alt="Yggdrasil 아이콘" />
          </div>
        </div>

        <h1 className="login-title">Yggdrasil</h1>

        <form className="login-form" onSubmit={handleLogin}>
          <label className="login-label" htmlFor="email">이메일</label>
          <div className="login-input-wrap">
            <span className="login-input-icon"><UserIcon /></span>
            <input
              id="email"
              type="email"
              placeholder="이메일을 입력하세요"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>

          <label className="login-label" htmlFor="password">비밀번호</label>
          <div className="login-input-wrap">
            <span className="login-input-icon"><LockIcon /></span>
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="비밀번호를 입력하세요"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={isSubmitting}
              required
            />
            <button
              className="password-toggle"
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
              disabled={isSubmitting}
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>

          {errorMessage && (
            <p className="login-error" role="alert">{errorMessage}</p>
          )}

          <button className="login-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "로그인 중..." : "로그인"}
          </button>
        </form>

        <p className="signup-text">
          계정이 없나요?{" "}
          <button type="button" className="signup-link">회원가입</button>
        </p>
      </main>

    </div>
  );
}

export default LoginPage;
