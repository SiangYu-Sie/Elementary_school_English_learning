import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { dbService } from "../../services/db";
import type { QuizRecord, WordProgress } from "../../services/db";
import { VOCABULARY } from "../../data/words";
import { Trophy, Calendar, CheckCircle2, AlertTriangle, RefreshCw, BarChart2 } from "lucide-react";

export const ProgressDashboard: React.FC = () => {
  const { user } = useAuth();
  const [quizzes, setQuizzes] = useState<QuizRecord[]>([]);
  const [wordProgress, setWordProgress] = useState<WordProgress[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [qData, pData] = await Promise.all([
        dbService.getQuizResults(user.id),
        dbService.getWordProgress(user.id)
      ]);
      setQuizzes(qData);
      setWordProgress(pData);
    } catch (e) {
      console.error("無法載入學習統計資訊:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>正在載入你的學習進度魔法書...</p>
      </div>
    );
  }

  // --- STATS COMPUTING ---
  const totalQuizzes = quizzes.length;
  const avgScore = totalQuizzes > 0 
    ? Math.round(quizzes.reduce((acc, q) => acc + q.score, 0) / totalQuizzes)
    : 0;

  const totalMastered = wordProgress.filter(p => p.isMastered).length;

  // Level statistics
  const levelStats = [1, 2, 3, 4, 5].map(lvl => {
    const levelWords = VOCABULARY.filter(w => w.level === lvl);
    const levelWordIds = levelWords.map(w => w.id);
    
    // Mastered words in this level
    const masteredInLvl = wordProgress.filter(
      p => levelWordIds.includes(p.wordId) && p.isMastered
    ).length;

    const attemptedInLvl = wordProgress.filter(
      p => levelWordIds.includes(p.wordId)
    ).length;

    const percentMastered = levelWords.length > 0
      ? Math.round((masteredInLvl / levelWords.length) * 100)
      : 0;

    return {
      level: lvl,
      totalWords: levelWords.length,
      mastered: masteredInLvl,
      attempted: attemptedInLvl,
      percentMastered
    };
  });

  // Mistaken words list
  const mistakenWords = wordProgress
    .filter(p => p.incorrectCount > 0)
    .sort((a, b) => b.incorrectCount - a.incorrectCount)
    .map(p => {
      const wordDetail = VOCABULARY.find(w => w.id === p.wordId);
      return {
        ...p,
        detail: wordDetail
      };
    })
    .filter(p => p.detail !== undefined);

  return (
    <div className="dashboard-view">
      {/* Top Header Card */}
      <div className="dashboard-hero">
        <div className="hero-text">
          <h2>哈囉，{user?.displayName}！👋</h2>
          <p>
            {totalQuizzes === 0 
              ? "你還沒有進行過任何測驗，開始學習單字並接受挑戰吧！" 
              : `你已經完成了 ${totalQuizzes} 次測驗，平均得分是 ${avgScore} 分。繼續加油！`}
          </p>
        </div>
        <button className="refresh-dashboard-btn" onClick={fetchData} title="重新整理">
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Stats Counter Grid */}
      <div className="stats-counter-grid">
        <div className="stat-card">
          <div className="stat-icon-wrapper score">
            <Trophy size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{avgScore}%</span>
            <span className="stat-label">平均測驗分數</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper quiz-count">
            <Calendar size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{totalQuizzes}</span>
            <span className="stat-label">完成測驗次數</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper mastered">
            <CheckCircle2 size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{totalMastered} / {VOCABULARY.length}</span>
            <span className="stat-label">已精通單字量</span>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="dashboard-content-layout">
        {/* Left Column: Level Progress */}
        <div className="dashboard-section level-progress-section">
          <h3>難度級別學習進度</h3>
          <div className="level-progress-list">
            {levelStats.map(stat => (
              <div key={stat.level} className="level-progress-card">
                <div className="level-header">
                  <span className="level-name">Level {stat.level} 難度</span>
                  <span className="level-nums">{stat.mastered} / {stat.totalWords} 已精通</span>
                </div>
                <div className="level-bar-track">
                  <div 
                    className={`level-bar-fill lvl-${stat.level}`} 
                    style={{ width: `${stat.percentMastered}%` }}
                  ></div>
                </div>
                <div className="level-footer-info">
                  <span>完成度: {stat.percentMastered}%</span>
                  {stat.percentMastered === 100 && <span className="completed-badge">🏅 全通關</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Weak/Error words */}
        <div className="dashboard-section weak-words-section">
          <h3>
            <AlertTriangle className="section-title-icon text-red" size={18} />
            需要多加練習的單字 (常錯字)
          </h3>
          {mistakenWords.length === 0 ? (
            <div className="empty-state-box">
              🏆 太厲害了！你目前沒有答錯任何單字！
            </div>
          ) : (
            <div className="mistaken-words-list">
              {mistakenWords.slice(0, 8).map((p, idx) => (
                <div key={idx} className="mistaken-word-item">
                  <div className="mistaken-word-meta">
                    <span className="m-word">{p.detail?.word}</span>
                    <span className="m-trans">{p.detail?.translation}</span>
                  </div>
                  <div className="mistaken-word-score-badge">
                    答錯 <strong className="text-red">{p.incorrectCount}</strong> 次 / 答對 {p.correctCount} 次
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row: History */}
      <div className="dashboard-section history-section">
        <h3>
          <BarChart2 className="section-title-icon" size={18} />
          歷史測驗記錄
        </h3>
        {quizzes.length === 0 ? (
          <div className="empty-state-box">
            尚未有測驗記錄。
          </div>
        ) : (
          <div className="history-table-wrapper">
            <table className="history-table">
              <thead>
                <tr>
                  <th>測驗時間</th>
                  <th>難度等級</th>
                  <th>得分</th>
                  <th>答對題數</th>
                  <th>花費時間</th>
                </tr>
              </thead>
              <tbody>
                {quizzes.map((q) => (
                  <tr key={q.id}>
                    <td>{new Date(q.createdAt).toLocaleString()}</td>
                    <td><span className="level-table-badge">Level {q.level}</span></td>
                    <td>
                      <span className={`score-badge ${q.score >= 80 ? "high" : q.score >= 60 ? "medium" : "low"}`}>
                        {q.score} 分
                      </span>
                    </td>
                    <td>{q.correctCount} / {q.totalCount}</td>
                    <td>{q.durationSeconds} 秒</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
export default ProgressDashboard;
