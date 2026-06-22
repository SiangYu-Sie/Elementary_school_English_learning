import { supabase, isSupabaseConfigured } from "./supabase";

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  role: "student" | "teacher" | "parent";
  createdAt: string;
  coins: number;
  exp: number;
  level: number;
}

export interface CardInventoryItem {
  cardId: string;
  count: number;
  level: number;
}

export interface QuizRecord {
  id: string;
  userId: string;
  level: number;
  correctCount: number;
  totalCount: number;
  score: number;
  durationSeconds: number;
  createdAt: string;
  expGained?: number;
  coinsGained?: number;
  leveledUp?: boolean;
}

export interface WordResultInput {
  wordId: string;
  isCorrect: boolean;
}

export interface WordProgress {
  userId: string;
  wordId: string;
  correctCount: number;
  incorrectCount: number;
  lastAttempt: string;
  isMastered: boolean;
}

// ==========================================
// LOCAL STORAGE BACKEND (MOCK MODE)
// ==========================================
const getLocalUsers = (): any[] => JSON.parse(localStorage.getItem("local_users") || "[]");
const saveLocalUsers = (users: any[]) => localStorage.setItem("local_users", JSON.stringify(users));

const getLocalSession = (): UserProfile | null => {
  const data = localStorage.getItem("local_session");
  return data ? JSON.parse(data) : null;
};
const saveLocalSession = (user: UserProfile | null) => {
  if (user) {
    localStorage.setItem("local_session", JSON.stringify(user));
  } else {
    localStorage.removeItem("local_session");
  }
};

const getLocalQuizRecords = (): QuizRecord[] => JSON.parse(localStorage.getItem("local_quiz_records") || "[]");
const saveLocalQuizRecords = (records: QuizRecord[]) => localStorage.setItem("local_quiz_records", JSON.stringify(records));

const getLocalWordProgress = (): WordProgress[] => JSON.parse(localStorage.getItem("local_word_progress") || "[]");
const saveLocalWordProgress = (progress: WordProgress[]) => localStorage.setItem("local_word_progress", JSON.stringify(progress));


// ==========================================
// UNIFIED DB & AUTH SERVICE
// ==========================================
export const dbService = {
  // --- AUTH SERVICES ---
  async signUp(email: string, password: string, displayName: string, role: "student" | "teacher" | "parent" = "student"): Promise<UserProfile> {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase!.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName,
            role: role
          }
        }
      });
      if (error) throw error;
      if (!data.user) throw new Error("註冊失敗");

      // Save user profile to Supabase database (profiles table)
      const profile: UserProfile = {
        id: data.user.id,
        email: data.user.email || email,
        displayName: data.user.user_metadata.display_name || displayName,
        role: data.user.user_metadata.role || role,
        createdAt: new Date().toISOString(),
        coins: 0,
        exp: 0,
        level: 1
      };

      const { error: dbError } = await supabase!.from("profiles").upsert(profile);
      if (dbError) console.warn("建立 Supabase 使用者 profile 失敗，但註冊已完成:", dbError.message);
      
      return profile;
    } else {
      // Mock Local Mode
      await new Promise(resolve => setTimeout(resolve, 800)); // Simulate delay
      const users = getLocalUsers();
      if (users.some(u => u.email === email)) {
        throw new Error("此電子信箱已被註冊");
      }

      const id = "mock-user-" + Math.random().toString(36).substring(2, 9);
      const newProfile: UserProfile = {
        id,
        email,
        displayName,
        role,
        createdAt: new Date().toISOString(),
        coins: 0,
        exp: 0,
        level: 1
      };

      users.push({ ...newProfile, password }); // Store password plaintext locally for simple mock login
      saveLocalUsers(users);
      saveLocalSession(newProfile);
      return newProfile;
    }
  },

  async signIn(email: string, password: string): Promise<UserProfile> {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase!.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (!data.user) throw new Error("登入失敗");

      // Fetch profile details
      const { data: profile, error: dbError } = await supabase!
        .from("profiles")
        .select("*")
        .eq("id", data.user.id)
        .single();

      if (dbError || !profile) {
        // Fallback profile if table is missing or doesn't exist yet
        return {
          id: data.user.id,
          email: data.user.email || email,
          displayName: data.user.user_metadata.display_name || "學生",
          role: data.user.user_metadata.role || "student",
          createdAt: new Date().toISOString(),
          coins: 0,
          exp: 0,
          level: 1
        };
      }

      return profile as UserProfile;
    } else {
      // Mock Local Mode
      await new Promise(resolve => setTimeout(resolve, 800));
      const users = getLocalUsers();
      const user = users.find(u => u.email === email && u.password === password);
      if (!user) {
        throw new Error("信箱或密碼錯誤");
      }

      const profile: UserProfile = {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        createdAt: user.createdAt,
        coins: user.coins ?? 0,
        exp: user.exp ?? 0,
        level: user.level ?? 1
      };
      saveLocalSession(profile);
      return profile;
    }
  },

  async signOut(): Promise<void> {
    if (isSupabaseConfigured()) {
      const { error } = await supabase!.auth.signOut();
      if (error) throw error;
    } else {
      saveLocalSession(null);
    }
  },

  async getCurrentUser(): Promise<UserProfile | null> {
    if (isSupabaseConfigured()) {
      const { data } = await supabase!.auth.getUser();
      if (!data.user) return null;

      const { data: profile } = await supabase!
        .from("profiles")
        .select("*")
        .eq("id", data.user.id)
        .single();

      if (profile) return profile as UserProfile;

      return {
        id: data.user.id,
        email: data.user.email || "",
        displayName: data.user.user_metadata.display_name || "學生",
        role: data.user.user_metadata.role || "student",
        createdAt: new Date().toISOString(),
        coins: 0,
        exp: 0,
        level: 1
      };
    } else {
      return getLocalSession();
    }
  },

  // --- QUIZ & SCORE SERVICES ---
  async saveQuizResult(
    userId: string,
    level: number,
    correctCount: number,
    totalCount: number,
    durationSeconds: number,
    wordResults: WordResultInput[],
    isMonsterDefeated = false
  ): Promise<QuizRecord> {
    const score = Math.round((correctCount / totalCount) * 100);
    
    // RPG reward logic: 10 EXP, 5 coins per correct answer. Full score bonus: +30 EXP, +15 coins.
    // If monster is defeated, get extra +50 EXP and +30 coins!
    const koExpBonus = isMonsterDefeated ? 50 : 0;
    const koCoinsBonus = isMonsterDefeated ? 30 : 0;
    const expGained = (correctCount * 10) + (correctCount === totalCount ? 30 : 0) + koExpBonus;
    const coinsGained = (correctCount * 5) + (correctCount === totalCount ? 15 : 0) + koCoinsBonus;
    let leveledUp = false;

    if (isSupabaseConfigured()) {
      // 1. Fetch current profile
      const { data: profile } = await supabase!
        .from("profiles")
        .select("exp, coins, level")
        .eq("id", userId)
        .maybeSingle();

      const currentExp = profile?.exp ?? 0;
      const currentCoins = profile?.coins ?? 0;
      const currentLvl = profile?.level ?? 1;

      const newExp = currentExp + expGained;
      const newCoins = currentCoins + coinsGained;
      const newLvl = Math.floor(newExp / 100) + 1;
      leveledUp = newLvl > currentLvl;

      // 2. Update profile
      await supabase!
        .from("profiles")
        .update({
          exp: newExp,
          coins: newCoins,
          level: newLvl
        })
        .eq("id", userId);

      // 3. Save Quiz Record
      const { data, error } = await supabase!
        .from("quiz_records")
        .insert({
          user_id: userId,
          level,
          correct_count: correctCount,
          total_count: totalCount,
          score,
          duration_seconds: durationSeconds
        })
        .select()
        .single();

      if (error) throw error;
      
      // 4. Save/Update Word Progress
      for (const res of wordResults) {
        // Query current progress
        const { data: existing } = await supabase!
          .from("word_progress")
          .select("*")
          .eq("user_id", userId)
          .eq("word_id", res.wordId)
          .maybeSingle();

        const correctInc = res.isCorrect ? 1 : 0;
        const incorrectInc = res.isCorrect ? 0 : 1;

        if (existing) {
          const totalC = existing.correct_count + correctInc;
          const totalI = existing.incorrect_count + incorrectInc;
          // Mastery condition: correct rate >= 70% and attempted at least 3 times, or consecutive corrects
          const isMastered = totalC / (totalC + totalI) >= 0.7 && (totalC + totalI) >= 3;

          await supabase!
            .from("word_progress")
            .update({
              correct_count: totalC,
              incorrect_count: totalI,
              last_attempt: new Date().toISOString(),
              is_mastered: isMastered
            })
            .eq("user_id", userId)
            .eq("word_id", res.wordId);
        } else {
          await supabase!
            .from("word_progress")
            .insert({
              user_id: userId,
              word_id: res.wordId,
              correct_count: correctInc,
              incorrect_count: incorrectInc,
              last_attempt: new Date().toISOString(),
              is_mastered: res.isCorrect // Mastered on first try if correct
            });
        }
      }

      return {
        id: data.id,
        userId: data.user_id,
        level: data.level,
        correctCount: data.correct_count,
        totalCount: data.total_count,
        score: data.score,
        durationSeconds: data.duration_seconds,
        createdAt: data.created_at,
        expGained,
        coinsGained,
        leveledUp
      };
    } else {
      // Mock Local Mode
      const records = getLocalQuizRecords();
      const newRecordId = "mock-quiz-" + Math.random().toString(36).substring(2, 9);

      // 1. Fetch and update local session user profile
      const localSession = getLocalSession();
      if (localSession && localSession.id === userId) {
        const currentExp = localSession.exp ?? 0;
        const currentCoins = localSession.coins ?? 0;
        const currentLvl = localSession.level ?? 1;

        const newExp = currentExp + expGained;
        const newCoins = currentCoins + coinsGained;
        const newLvl = Math.floor(newExp / 100) + 1;
        leveledUp = newLvl > currentLvl;

        localSession.exp = newExp;
        localSession.coins = newCoins;
        localSession.level = newLvl;
        saveLocalSession(localSession);

        // 2. Also update in the simulated users list
        const users = getLocalUsers();
        const userIdx = users.findIndex(u => u.id === userId);
        if (userIdx !== -1) {
          users[userIdx].exp = newExp;
          users[userIdx].coins = newCoins;
          users[userIdx].level = newLvl;
          saveLocalUsers(users);
        }
      }

      const newRecord: QuizRecord = {
        id: newRecordId,
        userId,
        level,
        correctCount,
        totalCount,
        score,
        durationSeconds,
        createdAt: new Date().toISOString(),
        expGained,
        coinsGained,
        leveledUp
      };

      records.push(newRecord);
      saveLocalQuizRecords(records);

      const progressList = getLocalWordProgress();
      for (const res of wordResults) {
        const idx = progressList.findIndex(p => p.userId === userId && p.wordId === res.wordId);
        const correctInc = res.isCorrect ? 1 : 0;
        const incorrectInc = res.isCorrect ? 0 : 1;

        if (idx !== -1) {
          const p = progressList[idx];
          p.correctCount += correctInc;
          p.incorrectCount += incorrectInc;
          p.lastAttempt = new Date().toISOString();
          p.isMastered = p.correctCount / (p.correctCount + p.incorrectCount) >= 0.7 && (p.correctCount + p.incorrectCount) >= 3;
        } else {
          progressList.push({
            userId,
            wordId: res.wordId,
            correctCount: correctInc,
            incorrectCount: incorrectInc,
            lastAttempt: new Date().toISOString(),
            isMastered: res.isCorrect
          });
        }
      }
      saveLocalWordProgress(progressList);
      return newRecord;
    }
  },

  async getQuizResults(userId: string): Promise<QuizRecord[]> {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase!
        .from("quiz_records")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []).map(d => ({
        id: d.id,
        userId: d.user_id,
        level: d.level,
        correctCount: d.correct_count,
        totalCount: d.total_count,
        score: d.score,
        durationSeconds: d.duration_seconds,
        createdAt: d.created_at
      }));
    } else {
      return getLocalQuizRecords()
        .filter(r => r.userId === userId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
  },

  async getWordProgress(userId: string): Promise<WordProgress[]> {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase!
        .from("word_progress")
        .select("*")
        .eq("user_id", userId);

      if (error) throw error;
      return (data || []).map(d => ({
        userId: d.user_id,
        wordId: d.word_id,
        correctCount: d.correct_count,
        incorrectCount: d.incorrect_count,
        lastAttempt: d.last_attempt,
        isMastered: d.is_mastered
      }));
    } else {
      return getLocalWordProgress().filter(p => p.userId === userId);
    }
  },

  async deductCoins(userId: string, amount: number): Promise<number> {
    if (isSupabaseConfigured()) {
      const { data: profile } = await supabase!
        .from("profiles")
        .select("coins")
        .eq("id", userId)
        .maybeSingle();

      const currentCoins = profile?.coins ?? 0;
      const newCoins = Math.max(0, currentCoins - amount);

      await supabase!
        .from("profiles")
        .update({ coins: newCoins })
        .eq("id", userId);

      return newCoins;
    } else {
      const session = getLocalSession();
      if (session && session.id === userId) {
        const currentCoins = session.coins ?? 0;
        const newCoins = Math.max(0, currentCoins - amount);
        session.coins = newCoins;
        saveLocalSession(session);

        const users = getLocalUsers();
        const idx = users.findIndex(u => u.id === userId);
        if (idx !== -1) {
          users[idx].coins = newCoins;
          saveLocalUsers(users);
        }
        return newCoins;
      }
      return 0;
    }
  },

  async getUnlockedCards(userId: string): Promise<string[]> {
    const key = `unlocked_cards_${userId}`;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  },

  async getCardInventory(userId: string): Promise<CardInventoryItem[]> {
    const key = `card_inventory_${userId}`;
    const data = localStorage.getItem(key);
    if (data) {
      return JSON.parse(data);
    }
    
    // 向下相容
    const legacyCards = await this.getUnlockedCards(userId);
    const initialInventory: CardInventoryItem[] = legacyCards.map(cid => ({
      cardId: cid,
      count: 1,
      level: 1
    }));
    localStorage.setItem(key, JSON.stringify(initialInventory));
    return initialInventory;
  },

  async unlockCard(userId: string, cardId: string): Promise<string[]> {
    // 1. 維護舊的 unlocked_cards 相容舊程式碼
    const keyLegacy = `unlocked_cards_${userId}`;
    const legacyList = await this.getUnlockedCards(userId);
    if (!legacyList.includes(cardId)) {
      legacyList.push(cardId);
      localStorage.setItem(keyLegacy, JSON.stringify(legacyList));
    }

    // 2. 維護新的 card_inventory 格式
    const keyInventory = `card_inventory_${userId}`;
    const inventory = await this.getCardInventory(userId);
    const existing = inventory.find(item => item.cardId === cardId);
    if (existing) {
      existing.count += 1;
    } else {
      inventory.push({ cardId, count: 1, level: 1 });
    }
    localStorage.setItem(keyInventory, JSON.stringify(inventory));

    return legacyList;
  },

  async upgradeCard(userId: string, cardId: string, goldCost: number): Promise<{ success: boolean; newLevel: number; newCount: number; message?: string }> {
    const userProfile = await this.getCurrentUser();
    if (!userProfile || userProfile.coins < goldCost) {
      return { success: false, newLevel: 1, newCount: 0, message: "金幣不足！" };
    }

    const keyInventory = `card_inventory_${userId}`;
    const inventory = await this.getCardInventory(userId);
    const card = inventory.find(item => item.cardId === cardId);
    if (!card) {
      return { success: false, newLevel: 1, newCount: 0, message: "找不到該卡牌" };
    }
    if (card.count <= 1) {
      return { success: false, newLevel: card.level, newCount: card.count, message: "重複的卡牌數量不足，需要至少 2 張卡牌才能融合！" };
    }

    // 扣除金幣
    try {
      await this.deductCoins(userId, goldCost);
    } catch (e) {
      return { success: false, newLevel: card.level, newCount: card.count, message: "扣除金幣失敗" };
    }

    card.level += 1;
    card.count -= 1;
    localStorage.setItem(keyInventory, JSON.stringify(inventory));

    return {
      success: true,
      newLevel: card.level,
      newCount: card.count
    };
  },

  async getActiveCard(userId: string): Promise<string | null> {
    const key = `active_card_${userId}`;
    return localStorage.getItem(key);
  },

  async setActiveCard(userId: string, cardId: string | null): Promise<string | null> {
    const key = `active_card_${userId}`;
    if (cardId === null) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, cardId);
    }
    return cardId;
  }
};
