import React from "react";
import { useAuth } from "../../context/AuthContext";
import { BookOpen, Award, BarChart2, LogOut, Sparkles, ShoppingBag } from "lucide-react";

interface NavbarProps {
  activeTab: "learn" | "quiz" | "dashboard" | "shop";
  setActiveTab: (tab: "learn" | "quiz" | "dashboard" | "shop") => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const { user, signOut } = useAuth();

  return (
    <nav className="main-navbar">
      <div className="navbar-container">
        <div className="nav-brand">
          <Sparkles className="brand-logo-icon animated-sparkle" size={24} />
          <span className="brand-name">英文單字魔法學院</span>
        </div>

        <div className="nav-links">
          <button 
            className={`nav-link-btn ${activeTab === "learn" ? "active" : ""}`}
            onClick={() => setActiveTab("learn")}
          >
            <BookOpen size={18} />
            <span>學習單字</span>
          </button>
          
          <button 
            className={`nav-link-btn ${activeTab === "quiz" ? "active" : ""}`}
            onClick={() => setActiveTab("quiz")}
          >
            <Award size={18} />
            <span>單字挑戰</span>
          </button>

          <button 
            className={`nav-link-btn ${activeTab === "shop" ? "active" : ""}`}
            onClick={() => setActiveTab("shop")}
          >
            <ShoppingBag size={18} />
            <span>魔法扭蛋屋</span>
          </button>
          
          <button 
            className={`nav-link-btn ${activeTab === "dashboard" ? "active" : ""}`}
            onClick={() => setActiveTab("dashboard")}
          >
            <BarChart2 size={18} />
            <span>魔法學習進度</span>
          </button>
        </div>

        {user && (
          <div className="nav-user-panel">
            <div className="rpg-stats-nav">
              <div className="rpg-badge-lvl" title={`冒險等級: Lv.${user.level}`}>
                Lv.{user.level}
              </div>
              <div className="rpg-exp-track" title={`經驗值: ${user.exp % 100} / 100`}>
                <div className="rpg-exp-fill" style={{ width: `${user.exp % 100}%` }}></div>
              </div>
              <div className="rpg-coins-nav">
                <span>🪙</span>
                <strong>{user.coins}</strong>
              </div>
            </div>

            <div className="user-avatar-badge">
              {user.role === "student" ? "👶" : user.role === "teacher" ? "🧑‍🏫" : "👪"}
            </div>
            <div className="user-details-hidden-mobile">
              <span className="user-name">{user.displayName}</span>
              <span className="user-role-label">
                {user.role === "student" ? "學生" : user.role === "teacher" ? "教師" : "家長"}
              </span>
            </div>
            <button className="logout-btn-nav" onClick={signOut} title="登出">
              <LogOut size={16} />
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};
export default Navbar;
