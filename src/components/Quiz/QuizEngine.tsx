import React, { useState, useEffect, useRef } from "react";
import type { Word } from "../../data/words";
import { useAuth } from "../../context/AuthContext";
import { dbService } from "../../services/db";
import { Volume2, Award, RefreshCw, Star, Play, CheckCircle2, XCircle } from "lucide-react";
import confetti from "canvas-confetti";
import { GACHA_CARDS, getCardStats } from "../Learning/MagicShop";

interface QuizEngineProps {
  words: Word[];
  level: number;
  onFinished: () => void;
}

type QuestionType = "english-to-chinese" | "chinese-to-english" | "listening" | "spelling";

interface Question {
  word: Word;
  type: QuestionType;
  options: string[]; // Chinese translations or English words depending on type
  correctOption: string;
  hollowedWord?: string;
  missingLetter?: string;
}

export const QuizEngine: React.FC<QuizEngineProps> = ({ words, level, onFinished }) => {
  const { user, refreshUser } = useAuth();
  const [gameState, setGameState] = useState<"intro" | "playing" | "results">("intro");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<{ wordId: string; isCorrect: boolean }[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [spellingInput, setSpellingInput] = useState("");
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [startTime, setStartTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [rewards, setRewards] = useState<{ expGained: number; coinsGained: number; leveledUp: boolean } | null>(null);
  const [monsterHp, setMonsterHp] = useState(100);
  const [maxMonsterHp, setMaxMonsterHp] = useState(100);
  const [playerHp, setPlayerHp] = useState(100);
  const [isMonsterDamaged, setIsMonsterDamaged] = useState(false);
  const [isPlayerDamaged, setIsPlayerDamaged] = useState(false);
  const [attemptsCount, setAttemptsCount] = useState(0);

  // RPG Combat Pets States
  const [activeCard, setActiveCard] = useState<any | null>(null);
  const [cardStats, setCardStats] = useState<{ atk: number; hp: number } | null>(null);
  const [petHp, setPetHp] = useState(100);
  const [maxPetHp, setMaxPetHp] = useState(100);
  const [battleLogs, setBattleLogs] = useState<string[]>([]);
  const [combatDamageText, setCombatDamageText] = useState<{ target: "monster" | "player" | "pet" | null; amount: number }>({ target: null, amount: 0 });
  const [isKo, setIsKo] = useState(false);

  const loadActiveCard = async () => {
    if (user) {
      const activeId = await dbService.getActiveCard(user.id);
      if (activeId) {
        const originalCard = GACHA_CARDS.find(c => c.id === activeId);
        if (originalCard) {
          const inventory = await dbService.getCardInventory(user.id);
          const invItem = inventory.find(i => i.cardId === activeId);
          const cardLvl = invItem?.level ?? 1;
          const stats = getCardStats(originalCard.atk, originalCard.hp, cardLvl);
          setActiveCard({ ...originalCard, level: cardLvl });
          setCardStats(stats);
          setPetHp(stats.hp);
          setMaxPetHp(stats.hp);
          return;
        }
      }
    }
    setActiveCard(null);
    setCardStats(null);
  };

  useEffect(() => {
    const fetchAttempts = async () => {
      if (user) {
        try {
          const records = await dbService.getQuizResults(user.id);
          const levelRecords = records.filter(r => r.level === level);
          setAttemptsCount(levelRecords.length);
        } catch (e) {
          console.error("無法讀取測驗次數:", e);
        }
      }
    };
    fetchAttempts();
  }, [user, level, gameState]);

  // Play audio synthesizer tones
  const audioCtxRef = useRef<AudioContext | null>(null);
  const playTone = (freq: number, duration: number, type: OscillatorType = "sine") => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      console.warn("音效播放失敗:", e);
    }
  };

  const playCorrectSound = () => {
    playTone(523.25, 0.1); // C5
    setTimeout(() => playTone(659.25, 0.15), 100); // E5
  };

  const playIncorrectSound = () => {
    playTone(220, 0.3, "triangle"); // A3
  };

  const playLevelUpSound = () => {
    const tones = [261.63, 329.63, 392.00, 523.25];
    tones.forEach((freq, idx) => {
      setTimeout(() => playTone(freq, 0.15, "triangle"), idx * 120);
    });
    setTimeout(() => {
      playTone(587.33, 0.1, "sine"); // D5
      playTone(659.25, 0.3, "sine"); // E5
    }, tones.length * 120);
  };

  const speak = (text: string, spellOut = false) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const cleanText = text.trim();
      const isSingleWord = !cleanText.includes(" ");

      if (isSingleWord && spellOut) {
        // Spell it letter by letter first
        const spellingText = cleanText.split("").join(" - ");
        const spellUtterance = new SpeechSynthesisUtterance(spellingText);
        spellUtterance.lang = "en-US";
        spellUtterance.rate = 0.7; // A bit faster for spelling
        
        const wordUtterance = new SpeechSynthesisUtterance(cleanText);
        wordUtterance.lang = "en-US";
        wordUtterance.rate = 0.8;

        window.speechSynthesis.speak(spellUtterance);
        window.speechSynthesis.speak(wordUtterance);
      } else {
        // Just read
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = "en-US";
        utterance.rate = 0.8;
        window.speechSynthesis.speak(utterance);
      }
    }
  };

  // Generate a random set of 10 questions
  const startQuiz = async () => {
    if (words.length < 10) {
      alert("單字庫數量不足，無法生成測驗（至少需要 10 個單字）。");
      return;
    }

    await loadActiveCard();

    // Pick 10 random words (or less if words count is less than 10)
    const shuffledWords = [...words].sort(() => 0.5 - Math.random());
    const selectedWords = shuffledWords.slice(0, Math.min(10, words.length));

    const generatedQuestions = selectedWords.map((word) => {
      // Choose a random question type
      const types: QuestionType[] = ["english-to-chinese", "chinese-to-english", "listening", "spelling"];
      const chosenType = types[Math.floor(Math.random() * types.length)];

      let options: string[] = [];
      let correctOption = "";
      let hollowedWord = "";

      if (chosenType === "english-to-chinese") {
        correctOption = word.translation;
        // Distractors (Chinese translations)
        const others = words.filter((w) => w.id !== word.id).map((w) => w.translation);
        const uniqueOthers = [...new Set(others)].sort(() => 0.5 - Math.random());
        options = [correctOption, ...uniqueOthers.slice(0, 3)].sort(() => 0.5 - Math.random());
      } else if (chosenType === "chinese-to-english" || chosenType === "listening") {
        correctOption = word.word;
        // Distractors (English words)
        const others = words.filter((w) => w.id !== word.id).map((w) => w.word);
        options = [correctOption, ...others.slice(0, 3)].sort(() => 0.5 - Math.random());
      } else if (chosenType === "spelling") {
        const wordStr = word.word.toLowerCase();
        const chars = wordStr.split("");
        const len = chars.length;
        
        // Pick one index to hallow out. If word length > 2, exclude start and end letters.
        let randIdx = 0;
        if (len > 2) {
          randIdx = Math.floor(Math.random() * (len - 2)) + 1;
        } else {
          randIdx = Math.floor(Math.random() * len);
        }

        const missingLetter = wordStr[randIdx];
        hollowedWord = chars.map((char, idx) => idx === randIdx ? "_" : char).join(" ");
        correctOption = word.word;

        return {
          word,
          type: chosenType,
          options,
          correctOption,
          hollowedWord,
          missingLetter
        };
      }

      return {
        word,
        type: chosenType,
        options,
        correctOption,
        hollowedWord
      };
    });

    const stage = attemptsCount >= 10 ? 3 : attemptsCount >= 5 ? 2 : 1;
    let initialMonsterHp = 100;
    if (stage === 2) initialMonsterHp = 250;
    if (stage === 3) initialMonsterHp = 600;

    setQuestions(generatedQuestions);
    setCurrentIdx(0);
    setAnswers([]);
    setGameState("playing");
    setStartTime(Date.now());
    setIsAnswered(false);
    setSelectedOption(null);
    setSpellingInput("");
    setRewards(null);
    setMonsterHp(initialMonsterHp);
    setMaxMonsterHp(initialMonsterHp);
    setPlayerHp(100);
    setIsKo(false);
    setBattleLogs(["⚔️ 戰鬥開始！怪獸發出了咆哮！"]);
    setIsMonsterDamaged(false);
    setIsPlayerDamaged(false);
  };

  const checkAnswer = () => {
    if (isAnswered) return;

    const currentQ = questions[currentIdx];
    let correct = false;

    if (currentQ.type === "spelling") {
      correct = spellingInput.trim().toLowerCase() === (currentQ.missingLetter || "").toLowerCase();
    } else {
      correct = selectedOption === currentQ.correctOption;
    }

    setIsCorrect(correct);
    setIsAnswered(true);
    speak(currentQ.word.word);

    if (correct) {
      playCorrectSound();
      
      const baseDamage = 15;
      const petDamage = cardStats ? cardStats.atk : 0;
      const totalDamage = baseDamage + petDamage;

      setIsMonsterDamaged(true);
      setMonsterHp((prev) => {
        const remaining = Math.max(0, prev - totalDamage);
        if (remaining === 0 && !isKo) {
          setIsKo(true);
          setBattleLogs(prevLogs => [...prevLogs, `💥 K.O.！出戰寵物與你合力擊敗了 ${monster.name}！`]);
        }
        return remaining;
      });

      setCombatDamageText({ target: "monster", amount: totalDamage });
      setBattleLogs(prevLogs => [...prevLogs, `🎯 答對了！${activeCard ? activeCard.name : "你"} 對怪獸造成了 ${totalDamage} 點傷害！`]);
      
      setTimeout(() => {
        setIsMonsterDamaged(false);
        setCombatDamageText({ target: null, amount: 0 });
      }, 800);
    } else {
      playIncorrectSound();
      
      const monsterDamage = 10 * level;

      if (activeCard && petHp > 0) {
        setIsPlayerDamaged(true);
        setPetHp((prev) => {
          const remaining = Math.max(0, prev - monsterDamage);
          if (remaining === 0) {
            setBattleLogs(prevLogs => [...prevLogs, `💀 哎呀！你的出戰寵物 ${activeCard.name} 倒下了！`]);
          }
          return remaining;
        });
        setCombatDamageText({ target: "pet", amount: monsterDamage });
        setBattleLogs(prevLogs => [...prevLogs, `⚡ 答錯了！怪獸發動反擊，對 ${activeCard.name} 造成 ${monsterDamage} 點傷害！`]);
      } else {
        setIsPlayerDamaged(true);
        setPlayerHp((prev) => Math.max(0, prev - 15));
        setCombatDamageText({ target: "player", amount: 15 });
        setBattleLogs(prevLogs => [...prevLogs, `⚡ 答錯了！怪獸攻擊了你，造成 15 點傷害！`]);
      }

      setTimeout(() => {
        setIsPlayerDamaged(false);
        setCombatDamageText({ target: null, amount: 0 });
      }, 800);
    }

    setAnswers((prev) => [...prev, { wordId: currentQ.word.id, isCorrect: correct }]);
  };

  const nextQuestion = () => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    if (monsterHp <= 0 || isKo || currentIdx + 1 >= questions.length) {
      // Quiz Finished Early (K.O.) or Normal End
      const durationSeconds = Math.round((Date.now() - startTime) / 1000);
      setDuration(durationSeconds);
      finishQuiz(durationSeconds);
    } else {
      setCurrentIdx((prev) => prev + 1);
      setIsAnswered(false);
      setSelectedOption(null);
      setSpellingInput("");
    }
  };

  const finishQuiz = async (durationSecs: number) => {
    setGameState("results");
    const correctCount = answers.filter((a) => a.isCorrect).length;
    const finalScore = Math.round((correctCount / questions.length) * 100);
    const isMonsterDefeated = monsterHp <= 0 || isKo;

    let expGained = (correctCount * 10) + (correctCount === questions.length ? 30 : 0) + (isMonsterDefeated ? 50 : 0);
    let coinsGained = (correctCount * 5) + (correctCount === questions.length ? 15 : 0) + (isMonsterDefeated ? 30 : 0);
    let leveledUp = false;

    if (user) {
      setLoading(true);
      try {
        const result = await dbService.saveQuizResult(
          user.id,
          level,
          correctCount,
          questions.length,
          durationSecs,
          answers,
          isMonsterDefeated
        );

        expGained = result.expGained ?? expGained;
        coinsGained = result.coinsGained ?? coinsGained;
        leveledUp = result.leveledUp ?? false;

        setRewards({
          expGained,
          coinsGained,
          leveledUp
        });

        // Trigger context update immediately to reflect on Navbar
        await refreshUser();

        // Level up effects
        if (leveledUp) {
          playLevelUpSound();
          confetti({
            particleCount: 150,
            spread: 80,
            origin: { y: 0.5 }
          });
          // Multiple waves of confetti for level up
          setTimeout(() => {
            confetti({
              particleCount: 100,
              spread: 60,
              origin: { x: 0.3, y: 0.6 }
            });
            confetti({
              particleCount: 100,
              spread: 60,
              origin: { x: 0.7, y: 0.6 }
            });
          }, 400);
        } else if (finalScore >= 80) {
          // Normal score confetti
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
          });
        }
      } catch (e) {
        console.error("儲存測驗成績失敗:", e);
        setRewards({ expGained, coinsGained, leveledUp });
      } finally {
        setLoading(false);
      }
    } else {
      setRewards({ expGained, coinsGained, leveledUp });
      if (finalScore >= 80) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      }
    }
  };

  // Audio prompt for listening questions
  useEffect(() => {
    if (gameState === "playing" && !isAnswered) {
      const currentQ = questions[currentIdx];
      if (currentQ && currentQ.type === "listening") {
        setTimeout(() => speak(currentQ.word.word), 300);
      }
    }
  }, [currentIdx, gameState, isAnswered]);

  if (gameState === "intro") {
    return (
      <div className="quiz-intro-card">
        <div className="quiz-intro-icon">
          <Award size={48} className="medal-icon animate-bounce" />
        </div>
        <h2>Level {level} 單字魔法挑戰</h2>
        <p className="quiz-intro-desc">
          挑戰包含 5 題不同類型的測驗題（選擇題、聽力測驗、拼字測驗）。準備好測試你的英文魔法實力了嗎？
        </p>
        <button className="play-quiz-btn" onClick={startQuiz}>
          <Play size={20} fill="currentColor" /> 開始測驗
        </button>
      </div>
    );
  }

  if (gameState === "results") {
    const correctCount = answers.filter((a) => a.isCorrect).length;
    const finalScore = Math.round((correctCount / questions.length) * 100);

    return (
      <div className="quiz-results-card">
        {rewards?.leveledUp && (
          <div className="level-up-banner-glow">
            <div className="level-up-animation-icon">⭐</div>
            <h2>等級提升！恭喜晉升 Lv.{user?.level}</h2>
            <p>你獲得了更強大的英文單字魔法！</p>
          </div>
        )}

        <h2>🎉 魔法挑戰結束 🎉</h2>
        <div className="score-wheel">
          <div className="score-number">{finalScore}</div>
          <div className="score-label">得分</div>
        </div>

        {rewards && (
          <div className="quiz-rewards-container">
            <div className="reward-badge-card reward-exp">
              <span className="reward-icon-rpg">✨</span>
              <div className="reward-texts-rpg">
                <span className="reward-lbl-rpg">獲得經驗</span>
                <strong className="reward-val-rpg">+{rewards.expGained} EXP</strong>
              </div>
            </div>
            <div className="reward-badge-card reward-coins">
              <span className="reward-icon-rpg">🪙</span>
              <div className="reward-texts-rpg">
                <span className="reward-lbl-rpg">獲得金幣</span>
                <strong className="reward-val-rpg">+{rewards.coinsGained} 金幣</strong>
              </div>
            </div>
          </div>
        )}

        <div className="results-info-grid">
          <div className="info-box">
            <span className="info-title">答對題數</span>
            <span className="info-value text-green">{correctCount} / {questions.length}</span>
          </div>
          <div className="info-box">
            <span className="info-title">測驗時間</span>
            <span className="info-value">{duration} 秒</span>
          </div>
        </div>

        <div className="review-list">
          <h3>單字回顧</h3>
          {questions.map((q, idx) => {
            const isAnsCorrect = answers[idx]?.isCorrect;
            return (
              <div key={idx} className={`review-item ${isAnsCorrect ? "correct" : "incorrect"}`}>
                <div className="review-item-main">
                  {isAnsCorrect ? <CheckCircle2 size={18} className="text-green" /> : <XCircle size={18} className="text-red" />}
                  <span className="review-word">{q.word.word}</span>
                  <span className="review-translation">({q.word.translation})</span>
                </div>
                <button className="sound-btn-mini" onClick={() => speak(q.word.word)}>
                  <Volume2 size={14} />
                </button>
              </div>
            );
          })}
        </div>

        <div className="quiz-actions">
          <button className="retry-btn" onClick={startQuiz} disabled={loading}>
            <RefreshCw size={18} /> 再試一次
          </button>
          <button className="finish-btn" onClick={onFinished} disabled={loading}>
            返回單字選單
          </button>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentIdx];

  const getMonsterInfo = (lvl: number, attempts: number) => {
    const stage = attempts >= 10 ? 3 : attempts >= 5 ? 2 : 1;
    
    if (stage === 3) {
      // 階段 3 (超能魔王怪 - 挑戰 10 次以上)
      switch (lvl) {
        case 1: return { emoji: "🐉", name: "遠古毒綠魔龍", stageName: "終極形態 🐉" };
        case 2: return { emoji: "👿", name: "混沌大魔皇", stageName: "終極形態 👿" };
        case 3: return { emoji: "🌋", name: "深淵熔岩毀滅者", stageName: "終極形態 🌋" };
        case 4: return { emoji: "🦁", name: "聖光重裝獅王", stageName: "終極形態 🦁" };
        default: return { emoji: "👑", name: "至尊魔法邪皇", stageName: "終極形態 👑" };
      }
    } else if (stage === 2) {
      // 階段 2 (進化怪獸 - 挑戰 5 次以上)
      switch (lvl) {
        case 1: return { emoji: "👾", name: "狂暴綠野精靈", stageName: "進階形態 👾" };
        case 2: return { emoji: "🎃", name: "暗夜南瓜狂魔", stageName: "進階形態 🎃" };
        case 3: return { emoji: "🗿", name: "黑曜石石巨人", stageName: "進階形態 🗿" };
        case 4: return { emoji: "👺", name: "哥布林重裝戰士", stageName: "進階形態 👺" };
        default: return { emoji: "🦅", name: "烈焰地獄火鷹", stageName: "進階形態 🦅" };
      }
    } else {
      // 階段 1 (普通怪獸 - 挑戰小於 5 次)
      switch (lvl) {
        case 1: return { emoji: "🌱", name: "綠野史萊姆", stageName: "幼年形態 🌱" };
        case 2: return { emoji: "👻", name: "迷霧小幽靈", stageName: "幼年形態 👻" };
        case 3: return { emoji: "🗿", name: "守護小巨石", stageName: "幼年形態 🗿" };
        case 4: return { emoji: "👹", name: "哥布林見習生", stageName: "幼年形態 👹" };
        default: return { emoji: "🐉", name: "烈焰小飛龍", stageName: "幼年形態 🐉" };
      }
    }
  };

  const monster = getMonsterInfo(level, attemptsCount);

  const getPlayerHearts = () => {
    if (playerHp >= 80) return "❤️❤️❤️";
    if (playerHp >= 40) return "❤️❤️🖤";
    if (playerHp > 0) return "❤️🖤🖤";
    return "🖤🖤🖤";
  };

  return (
    <div className={`quiz-play-view ${gameState === "playing" ? "playing-combat" : ""}`}>
      {/* 頂部冒險狀態列 */}
      <div className="quiz-play-header">
        <span className="quiz-progress-text">🧙‍♂️ 生命值: <span className="rpg-hearts-display">{getPlayerHearts()}</span></span>
        <div className="quiz-score-indicator">
          {answers.map((ans, idx) => (
            <Star
              key={idx}
              size={18}
              fill={ans.isCorrect ? "#f59e0b" : "none"}
              stroke={ans.isCorrect ? "#f59e0b" : "#9ca3af"}
              className="star-icon"
            />
          ))}
          {Array.from({ length: questions.length - answers.length }).map((_, idx) => (
            <Star key={idx + answers.length} size={18} stroke="#d1d5db" />
          ))}
        </div>
      </div>

      {/* 雙方對決競技場 */}
      <div className={`rpg-battle-arena-center ${isPlayerDamaged ? "flash-red-bg" : ""}`}>
        <div className="rpg-arena-split">
          
          {/* 左側：出戰寵物 */}
          <div className={`rpg-combatant-box pet-combatant ${isPlayerDamaged ? "animate-shake damaged" : ""}`}>
            {activeCard ? (
              <>
                <div className="combatant-label">🛡️ 你的寵物</div>
                <div className="rpg-combatant-emoji">{activeCard.emoji}</div>
                <div className="rpg-monster-hp-container">
                  <div className="rpg-monster-hp-bar player-pet-hp">
                    <div className="rpg-monster-hp-fill" style={{ width: `${(petHp / maxPetHp) * 100}%` }}></div>
                  </div>
                  <span className="rpg-monster-hp-text">{petHp}/{maxPetHp} HP</span>
                </div>
                <h4 className="rpg-combatant-name">
                  {activeCard.name} <span className="combat-level-tag">Lv.{activeCard.level}</span>
                </h4>
                <div className="combat-stats-row">
                  <span>⚔️ ATK: {cardStats?.atk}</span>
                </div>
              </>
            ) : (
              <>
                <div className="combatant-label">🧙‍♂️ 冒險家</div>
                <div className="rpg-combatant-emoji">👦</div>
                <div className="rpg-monster-hp-container">
                  <div className="rpg-monster-hp-bar">
                    <div className="rpg-monster-hp-fill" style={{ width: `${playerHp}%` }}></div>
                  </div>
                  <span className="rpg-monster-hp-text">{playerHp}/100 HP</span>
                </div>
                <h4 className="rpg-combatant-name">{user?.displayName}</h4>
                <div className="combat-stats-row">
                  <span>⚔️ ATK: 15</span>
                </div>
              </>
            )}
            
            {/* 飄浮傷害數字 (寵物或玩家) */}
            {combatDamageText.target === (activeCard && petHp > 0 ? "pet" : "player") && (
              <div className="floating-damage-text take-damage-anim">
                -{combatDamageText.amount} HP
              </div>
            )}
          </div>

          {/* 中間 V.S. 標誌與日誌 */}
          <div className="rpg-vs-separator">
            <div className="vs-badge-circle">VS</div>
            <div className="combat-logs-ticker">
              {battleLogs.slice(-2).map((log, idx) => (
                <div key={idx} className="ticker-log-item">{log}</div>
              ))}
            </div>
          </div>

          {/* 右側：進化怪獸 */}
          <div className={`rpg-combatant-box monster-combatant ${isMonsterDamaged ? "animate-shake damaged" : ""}`}>
            <div className="combatant-label">{monster.stageName}</div>
            <div className="rpg-combatant-emoji">{monster.emoji}</div>
            <div className="rpg-monster-hp-container">
              <div className="rpg-monster-hp-bar">
                <div className="rpg-monster-hp-fill" style={{ width: `${(monsterHp / maxMonsterHp) * 100}%` }}></div>
              </div>
              <span className="rpg-monster-hp-text">{monsterHp}/{maxMonsterHp} HP</span>
            </div>
            <h4 className="rpg-combatant-name">{monster.name}</h4>
            <div className="combat-stats-row">
              <span>👾 挑戰次數: {attemptsCount}</span>
            </div>
            
            {/* 飄浮傷害數字 (怪獸) */}
            {combatDamageText.target === "monster" && (
              <div className="floating-damage-text deal-damage-anim">
                -{combatDamageText.amount} HP 💥
              </div>
            )}
          </div>

        </div>
      </div>

      {/* 題目與輸入區域 */}
      <div className="quiz-question-box">
        {currentQ.type === "english-to-chinese" && (
          <div className="question-content">
            <span className="question-type-badge">選擇中文翻譯</span>
            <h1 className="question-title-word-rpg">{currentQ.word.word}</h1>
          </div>
        )}

        {currentQ.type === "chinese-to-english" && (
          <div className="question-content">
            <span className="question-type-badge">選擇英文單字</span>
            <h1 className="question-title-translation-rpg">{currentQ.word.translation}</h1>
          </div>
        )}

        {currentQ.type === "listening" && (
          <div className="question-content">
            <span className="question-type-badge">聽力測驗 (點擊發音)</span>
            <button className="quiz-audio-btn-large-rpg animate-pulse" onClick={() => speak(currentQ.word.word, false)}>
              <Volume2 size={44} />
              <span className="audio-prompt-text-rpg">聽音擊怪</span>
            </button>
          </div>
        )}

        {currentQ.type === "spelling" && (
          <div className="question-content">
            <span className="question-type-badge">魔法填空挑戰</span>
            <h2 className="question-title-translation-rpg">{currentQ.word.translation}</h2>
            
            {/* Hollowed out word display */}
            <div className="hollowed-word-display-rpg">
              {currentQ.hollowedWord}
            </div>
          </div>
        )}
      </div>

      {/* 互動答案選項 / 拼字輸入框 */}
      <div className="quiz-interactive-area">
        {currentQ.type !== "spelling" ? (
          <div className="options-grid">
            {currentQ.options.map((opt, idx) => {
              const isSelected = selectedOption === opt;
              const isCorrectOpt = opt === currentQ.correctOption;
              let btnClass = "option-btn";
              
              if (isAnswered) {
                if (isCorrectOpt) {
                  btnClass += " correct";
                } else if (isSelected) {
                  btnClass += " incorrect";
                } else {
                  btnClass += " disabled";
                }
              } else if (isSelected) {
                btnClass += " selected";
              }

              return (
                <button
                  key={idx}
                  className={btnClass}
                  onClick={() => !isAnswered && setSelectedOption(opt)}
                  disabled={isAnswered}
                >
                  <span className="option-letter">{String.fromCharCode(65 + idx)}</span>
                  <span className="option-text">{opt}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="spelling-input-container">
            <input
              type="text"
              className="spelling-text-input-rpg"
              placeholder="請輸入缺少的那個字母 (如: p)"
              maxLength={1}
              value={spellingInput}
              onChange={(e) => setSpellingInput(e.target.value)}
              disabled={isAnswered}
              autoFocus
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              onKeyDown={(e) => {
                if (e.key === "Enter" && spellingInput.trim().length > 0) {
                  checkAnswer();
                }
              }}
            />
          </div>
        )}
      </div>

      {/* 底部答案反饋與控制面板 */}
      <div className="quiz-control-panel">
        {!isAnswered ? (
          <button
            className="submit-answer-btn-rpg"
            onClick={checkAnswer}
            disabled={currentQ.type === "spelling" ? spellingInput.trim().length === 0 : !selectedOption}
          >
            發射魔法 ⚡
          </button>
        ) : (
          <div className="answer-feedback-bar-rpg">
            <div className="feedback-message-rpg">
              {isCorrect ? (
                <span className="text-green font-bold">✨ 太棒了！魔法成功命中怪獸！</span>
              ) : (
                <span className="text-red font-bold">
                  😢 魔法反噬！正確答案是: <strong className="correct-word-reveal-rpg">{currentQ.word.word}</strong>
                </span>
              )}
            </div>
            <button className="next-question-btn-rpg" onClick={nextQuestion}>
              {currentIdx + 1 === questions.length ? "查看戰果報告" : "下一題"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
export default QuizEngine;
