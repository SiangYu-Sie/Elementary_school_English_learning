import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { dbService } from "../../services/db";
import { Sparkles, Coins, Trophy } from "lucide-react";
import confetti from "canvas-confetti";

export interface GachaCard {
  id: string;
  name: string;
  english: string;
  emoji: string;
  rarity: "common" | "epic" | "legendary";
  rarityName: string;
  rarityColor: string;
  atk: number;
  hp: number;
}

export const GACHA_CARDS: GachaCard[] = [
  // Common (70%)
  { id: "c-1", name: "淘氣小貓", english: "cat", emoji: "🐱", rarity: "common", rarityName: "普通", rarityColor: "#10b981", atk: 15, hp: 100 },
  { id: "c-2", name: "忠誠小狗", english: "dog", emoji: "🐶", rarity: "common", rarityName: "普通", rarityColor: "#10b981", atk: 18, hp: 120 },
  { id: "c-3", name: "粉紅小豬", english: "pig", emoji: "🐷", rarity: "common", rarityName: "普通", rarityColor: "#10b981", atk: 12, hp: 150 },
  { id: "c-4", name: "長耳兔子", english: "rabbit", emoji: "🐰", rarity: "common", rarityName: "普通", rarityColor: "#10b981", atk: 14, hp: 90 },
  { id: "c-5", name: "呱呱小鴨", english: "duck", emoji: "🦆", rarity: "common", rarityName: "普通", rarityColor: "#10b981", atk: 10, hp: 80 },
  { id: "c-6", name: "溫和乳牛", english: "cow", emoji: "🐮", rarity: "common", rarityName: "普通", rarityColor: "#10b981", atk: 16, hp: 200 },
  { id: "c-7", name: "咕咕小雞", english: "chicken", emoji: "🐔", rarity: "common", rarityName: "普通", rarityColor: "#10b981", atk: 11, hp: 75 },
  
  // Epic (25%)
  { id: "e-1", name: "萬獸之王", english: "lion", emoji: "🦁", rarity: "epic", rarityName: "史詩", rarityColor: "#3b82f6", atk: 45, hp: 300 },
  { id: "e-2", name: "森林猛虎", english: "tiger", emoji: "🐯", rarity: "epic", rarityName: "史詩", rarityColor: "#3b82f6", atk: 50, hp: 280 },
  { id: "e-3", name: "翱翔飛鷹", english: "eagle", emoji: "🦅", rarity: "epic", rarityName: "史詩", rarityColor: "#3b82f6", atk: 42, hp: 220 },
  { id: "e-4", name: "彩虹獨角獸", english: "unicorn", emoji: "🦄", rarity: "epic", rarityName: "史詩", rarityColor: "#3b82f6", atk: 40, hp: 350 },
  { id: "e-5", name: "溫和熊貓", english: "panda", emoji: "🐼", rarity: "epic", rarityName: "史詩", rarityColor: "#3b82f6", atk: 35, hp: 400 },
  
  // Legendary (5%)
  { id: "l-1", name: "烈焰巨龍", english: "dragon", emoji: "🐉", rarity: "legendary", rarityName: "傳說", rarityColor: "#f59e0b", atk: 99, hp: 800 },
  { id: "l-2", name: "星際外星人", english: "alien", emoji: "👽", rarity: "legendary", rarityName: "傳說", rarityColor: "#f59e0b", atk: 85, hp: 600 },
  { id: "l-3", name: "鋼鐵機器人", english: "robot", emoji: "🤖", rarity: "legendary", rarityName: "傳說", rarityColor: "#f59e0b", atk: 90, hp: 700 },
  { id: "l-4", name: "至尊大法師", english: "wizard", emoji: "🧙‍♂️", rarity: "legendary", rarityName: "傳說", rarityColor: "#f59e0b", atk: 95, hp: 500 },
  { id: "l-5", name: "黃金國王", english: "king", emoji: "👑", rarity: "legendary", rarityName: "傳說", rarityColor: "#f59e0b", atk: 70, hp: 1000 }
];

export const MagicShop: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [unlockedIds, setUnlockedIds] = useState<string[]>([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [gachaResult, setGachaResult] = useState<GachaCard | null>(null);
  const [loading, setLoading] = useState(false);

  // Load unlocked cards on mount
  useEffect(() => {
    const loadCards = async () => {
      if (user) {
        const cards = await dbService.getUnlockedCards(user.id);
        setUnlockedIds(cards);
      }
    };
    loadCards();
  }, [user]);

  const drawCard = async () => {
    if (!user || user.coins < 50 || isSpinning || loading) return;

    setLoading(true);
    setIsSpinning(true);
    setGachaResult(null);

    // Audio effect: Spinning tone
    playSpinTone();

    // Deduct coins from db
    try {
      await dbService.deductCoins(user.id, 50);
      await refreshUser(); // Update navbar
    } catch (e) {
      console.error("金幣扣除失敗", e);
      setIsSpinning(false);
      setLoading(false);
      return;
    }

    // Determine card rarity based on probability
    setTimeout(async () => {
      const rand = Math.random() * 100;
      let selectedRarity: "common" | "epic" | "legendary" = "common";
      
      if (rand < 5) {
        selectedRarity = "legendary"; // 5%
      } else if (rand < 30) {
        selectedRarity = "epic"; // 25%
      } else {
        selectedRarity = "common"; // 70%
      }

      // Filter cards by determined rarity
      const matchingCards = GACHA_CARDS.filter(c => c.rarity === selectedRarity);
      const drawn = matchingCards[Math.floor(Math.random() * matchingCards.length)];

      // Unlock in db
      const newUnlocked = await dbService.unlockCard(user.id, drawn.id);
      setUnlockedIds(newUnlocked);
      setGachaResult(drawn);
      setIsSpinning(false);
      setLoading(false);

      // Play confetti and win sound based on rarity
      if (selectedRarity === "legendary") {
        playLegendaryWinSound();
        confetti({ particleCount: 200, spread: 100, origin: { y: 0.6 } });
      } else if (selectedRarity === "epic") {
        playEpicWinSound();
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      } else {
        playCommonWinSound();
      }
    }, 2000); // 2 seconds spin duration
  };

  // Synthesizer Audio Tones
  const playSpinTone = () => {
    let ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    let time = ctx.currentTime;
    for (let i = 0; i < 10; i++) {
      let osc = ctx.createOscillator();
      let gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(300 + i * 50, time + i * 0.15);
      gain.gain.setValueAtTime(0.05, time + i * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + i * 0.15 + 0.15);
      osc.start(time + i * 0.15);
      osc.stop(time + i * 0.15 + 0.15);
    }
  };

  const playCommonWinSound = () => {
    let ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    let osc = ctx.createOscillator();
    let gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 523.25; // C5
    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.2);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  };

  const playEpicWinSound = () => {
    let ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    let tones = [523.25, 659.25, 783.99]; // C5, E5, G5
    tones.forEach((freq, idx) => {
      setTimeout(() => {
        let osc = ctx.createOscillator();
        let gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      }, idx * 100);
    });
  };

  const playLegendaryWinSound = () => {
    let ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    let tones = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // C4 to C6 arpeggio
    tones.forEach((freq, idx) => {
      setTimeout(() => {
        let osc = ctx.createOscillator();
        let gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.3);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      }, idx * 80);
    });
  };

  return (
    <div className="magic-shop-view">
      <div className="shop-header">
        <Sparkles className="brand-logo-icon text-yellow animate-bounce" size={28} />
        <h2>魔法扭蛋屋 🔮</h2>
      </div>
      <p className="shop-subtitle">
        使用你挑戰答對獲得的黃金金幣，抽取具備不同魔法屬性的珍奇寵物卡牌！
      </p>

      {/* Gacha Machine Panel */}
      <div className="gacha-machine-card">
        <div className="gacha-balance-pill">
          <Coins className="text-amber-500" size={18} />
          <span>我的金幣: <strong>{user?.coins ?? 0}</strong></span>
        </div>

        <div className="gacha-arena">
          {/* Machine Graphic */}
          <div className="gacha-machine-display">
            <div className={`gacha-capsule-ball ${isSpinning ? "capsule-spinning" : ""}`}>
              {isSpinning ? "🔮" : gachaResult ? gachaResult.emoji : "🔮"}
            </div>
            <div className="gacha-pedestal">✨ 魔法扭蛋機 ✨</div>
          </div>

          {/* Controls */}
          <div className="gacha-controls">
            {user && user.coins < 50 ? (
              <p className="gacha-warning">⚠️ 金幣不足！每次扭蛋需要 50 金幣，快去「單字挑戰」打怪賺錢吧！</p>
            ) : (
              <p className="gacha-hint">每次扭蛋花費 50 金幣。有機會抽中傳說級神獸卡牌！</p>
            )}

            <button
              className="gacha-draw-btn"
              onClick={drawCard}
              disabled={!user || user.coins < 50 || isSpinning}
            >
              {isSpinning ? "扭蛋轉動中..." : "啟動魔法扭蛋 🔮 (50 金幣)"}
            </button>
          </div>
        </div>

        {/* Drawn Card Result Reveal */}
        {gachaResult && (
          <div className="gacha-result-overlay" onClick={() => setGachaResult(null)}>
            <div className="drawn-card-wrapper animate-popup" onClick={(e) => e.stopPropagation()}>
              <div className="drawn-card-glow" style={{ boxShadow: `0 0 40px ${gachaResult.rarityColor}` }}>
                <div className="drawn-card-rarity" style={{ background: gachaResult.rarityColor }}>
                  {gachaResult.rarityName}卡牌
                </div>
                <div className="drawn-card-emoji">{gachaResult.emoji}</div>
                <h2 className="drawn-card-title">{gachaResult.name}</h2>
                <span className="drawn-card-english">({gachaResult.english})</span>
                
                <div className="drawn-card-attributes">
                  <div className="attr-pill">
                    <span>攻擊力 ATK</span>
                    <strong>{gachaResult.atk}</strong>
                  </div>
                  <div className="attr-pill">
                    <span>生命值 HP</span>
                    <strong>{gachaResult.hp}</strong>
                  </div>
                </div>

                <button className="close-card-btn" onClick={() => setGachaResult(null)}>
                  收下卡牌 🌟
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Card Collection Album */}
      <div className="collection-album-card">
        <div className="album-title">
          <Trophy className="text-yellow" size={20} />
          <h3>我的魔法寵物圖鑑 ({unlockedIds.length} / {GACHA_CARDS.length})</h3>
        </div>

        <div className="album-grid">
          {GACHA_CARDS.map(card => {
            const isUnlocked = unlockedIds.includes(card.id);
            return (
              <div
                key={card.id}
                className={`album-card-item ${isUnlocked ? "unlocked" : "locked"}`}
                style={{
                  borderColor: isUnlocked ? card.rarityColor : "rgba(0,0,0,0.05)",
                  boxShadow: isUnlocked ? `0 4px 10px -2px ${card.rarityColor}20` : "none"
                }}
              >
                <div className="album-card-emoji">{isUnlocked ? card.emoji : "❓"}</div>
                <div className="album-card-details">
                  <span className="album-card-name">{isUnlocked ? card.name : "未解鎖"}</span>
                  <span className="album-card-english">
                    {isUnlocked ? `(${card.english})` : "????"}
                  </span>
                  <span
                    className="album-card-rarity-badge"
                    style={{ color: isUnlocked ? card.rarityColor : "var(--color-text-muted)" }}
                  >
                    {card.rarityName}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
export default MagicShop;
