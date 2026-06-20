import React, { useState } from "react";
import type { Word } from "../../data/words";
import { Volume2, ChevronLeft, ChevronRight, HelpCircle } from "lucide-react";

interface WordCardProps {
  words: Word[];
}

export const WordCard: React.FC<WordCardProps> = ({ words }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  if (words.length === 0) {
    return <div className="no-words">本級別目前沒有單字。</div>;
  }

  const currentWord = words[currentIndex];

  const handleSpeak = (e: React.MouseEvent, text: string) => {
    e.stopPropagation(); // Avoid flipping when clicking the speak button
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const cleanText = text.trim();
      const isSingleWord = !cleanText.includes(" ");

      if (isSingleWord) {
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
        // Just read the sentence
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = "en-US";
        utterance.rate = 0.8;
        window.speechSynthesis.speak(utterance);
      }
    } else {
      alert("抱歉，您的瀏覽器不支援語音功能。");
    }
  };

  const handleNext = () => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev + 1) % words.length);
  };

  const handlePrev = () => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev - 1 + words.length) % words.length);
  };

  const percentProgress = Math.round(((currentIndex + 1) / words.length) * 100);

  return (
    <div className="learning-view">
      <div className="learning-progress-bar-container">
        <div className="learning-progress-label">
          <span>單字學習進度</span>
          <span>{currentIndex + 1} / {words.length}</span>
        </div>
        <div className="learning-progress-track">
          <div className="learning-progress-fill" style={{ width: `${percentProgress}%` }}></div>
        </div>
      </div>

      <div 
        className={`flashcard-wrapper ${isFlipped ? "flipped" : ""}`}
        onClick={() => setIsFlipped(!isFlipped)}
      >
        {/* FRONT OF THE CARD */}
        <div className="flashcard-side front">
          <div className="card-badge">Level {currentWord.level} - {currentWord.category}</div>
          
          <h1 className="word-text-large">{currentWord.word}</h1>
          
          <button 
            className="sound-btn-large" 
            onClick={(e) => handleSpeak(e, currentWord.word)}
            title="發音"
          >
            <Volume2 size={32} />
            <span>聽發音</span>
          </button>

          <p className="flip-hint">
            <HelpCircle size={16} /> 點擊卡片看中文解釋
          </p>
        </div>

        {/* BACK OF THE CARD */}
        <div className="flashcard-side back">
          <div className="card-badge">Level {currentWord.level} - {currentWord.category}</div>
          
          <div className="back-content">
            <h2 className="word-title">{currentWord.word}</h2>
            <div className="word-phonetic">{currentWord.phonetic}</div>
            
            <div className="divider-line"></div>
            
            <div className="word-translation-large">{currentWord.translation}</div>
            
            <div className="sentence-container">
              <p className="sentence-en">
                {currentWord.sentence}
                <button 
                  className="sound-btn-small" 
                  onClick={(e) => handleSpeak(e, currentWord.sentence)}
                  title="朗讀句子"
                >
                  <Volume2 size={16} />
                </button>
              </p>
              <p className="sentence-zh">{currentWord.sentenceTranslation}</p>
            </div>
          </div>

          <p className="flip-hint">
            點擊卡片回到正面
          </p>
        </div>
      </div>

      <div className="card-navigation">
        <button className="nav-arrow-btn" onClick={handlePrev}>
          <ChevronLeft size={24} /> 上一個單字
        </button>
        <button className="nav-arrow-btn" onClick={handleNext}>
          下一個單字 <ChevronRight size={24} />
        </button>
      </div>
    </div>
  );
};
export default WordCard;
