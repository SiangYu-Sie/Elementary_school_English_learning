import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { LogIn, UserPlus, Sparkles, AlertCircle } from "lucide-react";

export const AuthForms: React.FC = () => {
  const { signIn, signUp } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<"student" | "teacher" | "parent">("student");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        await signIn(email, password);
      } else {
        if (!displayName.trim()) {
          throw new Error("請輸入稱呼/姓名");
        }
        await signUp(email, password, displayName, role);
      }
    } catch (err: any) {
      setError(err.message || "發生錯誤，請稍後再試。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <Sparkles className="logo-icon animated-sparkle" size={36} />
            <h2>英文單字魔法學院</h2>
          </div>
          <p className="auth-subtitle">
            {isLogin ? "歡迎回來！準備好開啟今天的英文冒險了嗎？" : "註冊一個新帳號，開始你的單字魔法之旅！"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && (
            <div className="auth-error-banner">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {!isLogin && (
            <div className="form-group">
              <label htmlFor="displayName">你希望大家怎麼稱呼你？</label>
              <input
                id="displayName"
                type="text"
                placeholder="例如：小明、魔法師 Tom"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={loading}
                required
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">電子信箱 (Email)</label>
            <input
              id="email"
              type="email"
              placeholder="example@mail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">密碼 (Password)</label>
            <input
              id="password"
              type="password"
              placeholder="請輸入密碼"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          {!isLogin && (
            <div className="form-group">
              <label>身分角色 (Role)</label>
              <div className="role-selector-grid">
                <button
                  type="button"
                  className={`role-btn ${role === "student" ? "active student" : ""}`}
                  onClick={() => setRole("student")}
                  disabled={loading}
                >
                  👶 我是學生
                </button>
                <button
                  type="button"
                  className={`role-btn ${role === "teacher" ? "active teacher" : ""}`}
                  onClick={() => setRole("teacher")}
                  disabled={loading}
                >
                  🧑‍🏫 我是老師
                </button>
                <button
                  type="button"
                  className={`role-btn ${role === "parent" ? "active parent" : ""}`}
                  onClick={() => setRole("parent")}
                  disabled={loading}
                >
                  👪 我是家長
                </button>
              </div>
            </div>
          )}

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? (
              <span className="spinner"></span>
            ) : isLogin ? (
              <>
                <LogIn size={20} /> 進入學院 (登入)
              </>
            ) : (
              <>
                <UserPlus size={20} /> 註冊入學 (註冊)
              </>
            )}
          </button>
        </form>

        <div className="auth-footer">
          {isLogin ? (
            <p>
              還沒有帳號嗎？{" "}
              <button type="button" className="toggle-auth-btn" onClick={() => setIsLogin(false)} disabled={loading}>
                立即註冊入學
              </button>
            </p>
          ) : (
            <p>
              已經有帳號了？{" "}
              <button type="button" className="toggle-auth-btn" onClick={() => setIsLogin(true)} disabled={loading}>
                立即登入學院
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
export default AuthForms;
