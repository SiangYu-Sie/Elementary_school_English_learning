-- 1. 建立使用者 Profile 資料表
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    display_name TEXT,
    role TEXT CHECK (role IN ('student', 'teacher', 'parent')) DEFAULT 'student',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 啟用 Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 建立 Profiles 安全防護政策 (安全存取)
CREATE POLICY "允許公開讀取 Profile" ON public.profiles 
    FOR SELECT USING (true);

CREATE POLICY "使用者可修改自己的 Profile" ON public.profiles 
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "允許系統在註冊時寫入 Profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);


-- 2. 建立測驗紀錄資料表
CREATE TABLE IF NOT EXISTS public.quiz_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    level INTEGER NOT NULL CHECK (level >= 1 AND level <= 5),
    correct_count INTEGER NOT NULL,
    total_count INTEGER NOT NULL,
    score INTEGER NOT NULL,
    duration_seconds INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.quiz_records ENABLE ROW LEVEL SECURITY;

-- 建立 Quiz Records 安全防護政策
CREATE POLICY "使用者僅能看見自己的測驗紀錄" ON public.quiz_records
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "使用者僅能寫入自己的測驗紀錄" ON public.quiz_records
    FOR INSERT WITH CHECK (auth.uid() = user_id);


-- 3. 建立單字精通度進度資料表
CREATE TABLE IF NOT EXISTS public.word_progress (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    word_id TEXT NOT NULL,
    correct_count INTEGER DEFAULT 0 NOT NULL,
    incorrect_count INTEGER DEFAULT 0 NOT NULL,
    last_attempt TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    is_mastered BOOLEAN DEFAULT FALSE NOT NULL,
    PRIMARY KEY (user_id, word_id)
);

ALTER TABLE public.word_progress ENABLE ROW LEVEL SECURITY;

-- 建立 Word Progress 安全防護政策
CREATE POLICY "使用者僅能檢視自己的單字進度" ON public.word_progress
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "使用者僅能新增自己的單字進度" ON public.word_progress
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "使用者僅能修改自己的單字進度" ON public.word_progress
    FOR UPDATE USING (auth.uid() = user_id);


-- 4. 自動化：註冊 auth.users 時，自動在 profiles 資料表中建立對應項目
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'display_name', '魔法學員'),
    COALESCE(new.raw_user_meta_data->>'role', 'student')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
