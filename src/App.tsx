import React, { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Navbar from "./components/Layout/Navbar";
import AuthForms from "./components/Auth/AuthForms";
import WordCard from "./components/Learning/WordCard";
import QuizEngine from "./components/Quiz/QuizEngine";
import ProgressDashboard from "./components/Scoreboard/ProgressDashboard";
import MagicShop from "./components/Learning/MagicShop";
import { VOCABULARY } from "./data/words";
import { Sparkles, ArrowLeft, GraduationCap } from "lucide-react";

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<"learn" | "quiz" | "dashboard" | "shop">("learn");
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);

  if (loading) {
    return (
      <div className="global-loader-container">
        <div className="academy-loader">
          <GraduationCap className="loader-cap animate-bounce" size={48} />
          <p>正在載入英文魔法學院...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return <AuthForms />;
  }

  const handleLevelSelect = (level: number) => {
    setSelectedLevel(level);
  };

  const handleBackToLevels = () => {
    setSelectedLevel(null);
  };

  const levelWords = selectedLevel ? VOCABULARY.filter((w) => w.level === selectedLevel) : [];

  return (
    <div className="academy-layout">
      <Navbar activeTab={activeTab} setActiveTab={(tab) => {
        setActiveTab(tab);
        setSelectedLevel(null); // Reset selected level on tab change
      }} />

      <main className="academy-main-content">
        {activeTab === "learn" && (
          <div className="section-container">
            {selectedLevel === null ? (
              <div className="level-select-view">
                <div className="section-header">
                  <Sparkles className="section-title-icon text-yellow" size={24} />
                  <h2>選擇你的單字學習等級 📖</h2>
                </div>
                <p className="section-subtitle">
                  從 Level 1 最簡單的單字開始，一步步解鎖高等級的單字魔法吧！
                </p>
                <div className="level-grid">
                  {[1, 2, 3, 4, 5].map((lvl) => (
                    <button
                      key={lvl}
                      className={`level-selection-card lvl-${lvl}`}
                      onClick={() => handleLevelSelect(lvl)}
                    >
                      <div className="level-number-badge">{lvl}</div>
                      <h3>Level {lvl} 難度</h3>
                      <p>適合 {lvl + 1} 歲以上的英文小冒險家</p>
                      <span className="word-count-tag">
                        共 {VOCABULARY.filter((w) => w.level === lvl).length} 個單字
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="learning-container">
                <div className="learning-header">
                  <button className="back-btn" onClick={handleBackToLevels}>
                    <ArrowLeft size={16} /> 返回等級選單
                  </button>
                  <h2 className="current-level-title">Level {selectedLevel} 單字探索中</h2>
                </div>
                <WordCard words={levelWords} />
              </div>
            )}
          </div>
        )}

        {activeTab === "quiz" && (
          <div className="section-container">
            {selectedLevel === null ? (
              <div className="level-select-view">
                <div className="section-header">
                  <GraduationCap className="section-title-icon text-indigo" size={24} />
                  <h2>挑戰單字魔法測驗 🏆</h2>
                </div>
                <p className="section-subtitle">
                  完成測驗來賺取分數與精通度！看看你能拿多少分？
                </p>
                <div className="level-grid">
                  {[1, 2, 3, 4, 5].map((lvl) => (
                    <button
                      key={lvl}
                      className={`level-selection-card lvl-${lvl}`}
                      onClick={() => handleLevelSelect(lvl)}
                    >
                      <div className="level-number-badge">{lvl}</div>
                      <h3>Level {lvl} 測驗</h3>
                      <p>測試你的 Level {lvl} 單字熟練度</p>
                      <span className="action-tag-quiz">開始測驗</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="quiz-container">
                <div className="quiz-header">
                  <button className="back-btn" onClick={handleBackToLevels}>
                    <ArrowLeft size={16} /> 放棄測驗
                  </button>
                  <h2 className="current-level-title">Level {selectedLevel} 魔法挑戰中</h2>
                </div>
                <QuizEngine
                  words={levelWords}
                  level={selectedLevel}
                  onFinished={handleBackToLevels}
                />
              </div>
            )}
          </div>
        )}

        {activeTab === "shop" && (
          <div className="section-container">
            <MagicShop />
          </div>
        )}

        {activeTab === "dashboard" && <ProgressDashboard />}
      </main>

      <footer className="academy-footer">
        <p>© 2026 英文單字魔法學院. 讓英語學習成為最棒的冒險！✨</p>
      </footer>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
