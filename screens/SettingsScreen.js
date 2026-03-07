import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, ActivityIndicator,
  ScrollView, Switch, Modal
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useTheme } from '../lib/ThemeContext';

export default function SettingsScreen() {
  const { theme, isDark, toggleTheme, resetToSystem, manualOverride } = useTheme();

  const setManualOverride = (val) => {
    if (val === null) resetToSystem();
    else if (val === true && !isDark) toggleTheme();
    else if (val === false && isDark) toggleTheme();
  };
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState('');

  // プロフィール
  const [username, setUsername] = useState('');
  const [examDate, setExamDate] = useState('');

  // ポモドーロ
  const [pomodoroMinutes, setPomodoroMinutes] = useState(25);
  const [shortBreak, setShortBreak] = useState(5);
  const [longBreak, setLongBreak] = useState(15);
  const [dailyPomoGoal, setDailyPomoGoal] = useState(8);
  const [fullscreenTimer, setFullscreenTimer] = useState(false);

  // 表示
  const [showBadge, setShowBadge] = useState(true);
  const [flipToFocus, setFlipToFocus] = useState(false);

  useEffect(() => { fetchProfile(); }, []);

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setEmail(user.email || 'ゲストユーザー');
    const { data } = await supabase.from('user_profiles')
      .select('*').eq('user_id', user.id).single();
    if (data) {
      setUsername(data.username || '');
      setExamDate(data.exam_date || '');
      setPomodoroMinutes(data.pomodoro_minutes || 25);
      setShortBreak(data.short_break_minutes || 5);
      setLongBreak(data.long_break_minutes || 15);
      setDailyPomoGoal(data.daily_pomo_goal || 8);
      setFullscreenTimer(data.fullscreen_timer || false);
      setShowBadge(data.show_badge !== false);
      setFlipToFocus(data.flip_to_focus || false);
    }
    setLoading(false);
  };

  const save = async () => {
    if (!username.trim()) { alert('ユーザー名を入力してください'); return; }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('user_profiles').upsert({
      user_id: user.id,
      username: username.trim(),
      exam_date: examDate || null,
      pomodoro_minutes: pomodoroMinutes,
      short_break_minutes: shortBreak,
      long_break_minutes: longBreak,
      daily_pomo_goal: dailyPomoGoal,
      fullscreen_timer: fullscreenTimer,
      show_badge: showBadge,
      flip_to_focus: flipToFocus,
    });
    setSaving(false);
    if (error) { alert('保存に失敗しました: ' + error.message); return; }
    alert('保存しました！');
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  const TimeSelector = ({ label, value, onChange, min, max }) => (
    <View style={styles.timeRow}>
      <Text style={[styles.timeLabel, { color: theme.text }]}>{label}</Text>
      <View style={styles.timeControls}>
        <TouchableOpacity
          style={[styles.timeBtn, { backgroundColor: theme.inputBg }]}
          onPress={() => onChange(Math.max(min, value - 1))}
        >
          <Text style={[styles.timeBtnText, { color: theme.text }]}>－</Text>
        </TouchableOpacity>
        <Text style={[styles.timeValue, { color: theme.primary }]}>{value}{label.includes('ポモ') ? '個' : '分'}</Text>
        <TouchableOpacity
          style={[styles.timeBtn, { backgroundColor: theme.inputBg }]}
          onPress={() => onChange(Math.min(max, value + 1))}
        >
          <Text style={[styles.timeBtnText, { color: theme.text }]}>＋</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const PresetBtn = ({ label, pomo, s, l }) => (
    <TouchableOpacity
      style={[styles.presetBtn, { backgroundColor: theme.inputBg, borderColor: theme.border }]}
      onPress={() => { setPomodoroMinutes(pomo); setShortBreak(s); setLongBreak(l); }}
    >
      <Text style={[styles.presetLabel, { color: theme.primary }]}>{label}</Text>
      <Text style={[styles.presetDetail, { color: theme.subText }]}>{pomo}/{s}/{l}分</Text>
    </TouchableOpacity>
  );

  const SwitchRow = ({ label, hint, value, onChange }) => (
    <View style={styles.switchRow}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
        {hint && <Text style={[styles.hint, { color: theme.subText }]}>{hint}</Text>}
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: theme.primary }} />
    </View>
  );

  if (loading) return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 60 }} />
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={[styles.header, { color: theme.text }]}>⚙️ 設定</Text>

        {/* アカウント */}
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>👤 アカウント</Text>
          <Text style={[styles.label, { color: theme.text }]}>メールアドレス</Text>
          <View style={[styles.emailBox, { backgroundColor: theme.inputBg }]}>
            <Text style={[styles.emailText, { color: theme.subText }]}>{email}</Text>
          </View>
          <Text style={[styles.label, { color: theme.text }]}>ユーザー名</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
            placeholder="例：taro_study"
            placeholderTextColor={theme.subText}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
          <Text style={[styles.label, { color: theme.text }]}>デフォルト試験日（任意）</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
            placeholder="例：2026-06-15"
            placeholderTextColor={theme.subText}
            value={examDate}
            onChangeText={setExamDate}
          />
          <Text style={[styles.hint, { color: theme.subText }]}>形式：YYYY-MM-DD</Text>
        </View>

        {/* ポモドーロ設定 */}
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>🍅 ポモドーロ設定</Text>
          <Text style={[styles.label, { color: theme.text }]}>プリセット</Text>
          <View style={styles.presetRow}>
            <PresetBtn label="標準" pomo={25} s={5} l={15} />
            <PresetBtn label="短め" pomo={15} s={3} l={10} />
            <PresetBtn label="長め" pomo={50} s={10} l={30} />
          </View>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <TimeSelector label="🍅 集中時間" value={pomodoroMinutes} onChange={setPomodoroMinutes} min={1} max={90} />
          <TimeSelector label="☕ 短い休憩" value={shortBreak} onChange={setShortBreak} min={1} max={30} />
          <TimeSelector label="🛋️ 長い休憩" value={longBreak} onChange={setLongBreak} min={1} max={60} />
          <TimeSelector label="🎯 1日の目標ポモ数" value={dailyPomoGoal} onChange={setDailyPomoGoal} min={1} max={20} />
          <View style={[styles.previewBox, { backgroundColor: theme.inputBg }]}>
            <Text style={[styles.previewText, { color: theme.subText }]}>
              集中 {pomodoroMinutes}分 → 休憩 {shortBreak}分 → ×4セット → 長休憩 {longBreak}分
            </Text>
          </View>
        </View>

        {/* 表示設定 */}
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>🖥️ 表示設定</Text>

          {/* ダークモード */}
          <Text style={[styles.label, { color: theme.text }]}>🌙 ダークモード</Text>
          <View style={styles.darkModeRow}>
            <TouchableOpacity
              style={[styles.darkModeBtn, { backgroundColor: theme.inputBg, borderColor: manualOverride === null ? theme.primary : theme.border, borderWidth: manualOverride === null ? 2 : 1 }]}
              onPress={resetToSystem}
            >
              <Text style={[styles.darkModeBtnText, { color: manualOverride === null ? theme.primary : theme.text }]}>🌓</Text>
              <Text style={[styles.darkModeBtnSub, { color: manualOverride === null ? theme.primary : theme.subText }]}>自動</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.darkModeBtn, { backgroundColor: theme.inputBg, borderColor: manualOverride === false ? theme.primary : theme.border, borderWidth: manualOverride === false ? 2 : 1 }]}
              onPress={() => setManualOverride(false)}
            >
              <Text style={[styles.darkModeBtnText, { color: manualOverride === false ? theme.primary : theme.text }]}>☀️</Text>
              <Text style={[styles.darkModeBtnSub, { color: manualOverride === false ? theme.primary : theme.subText }]}>ライト</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.darkModeBtn, { backgroundColor: theme.inputBg, borderColor: manualOverride === true ? theme.primary : theme.border, borderWidth: manualOverride === true ? 2 : 1 }]}
              onPress={() => setManualOverride(true)}
            >
              <Text style={[styles.darkModeBtnText, { color: manualOverride === true ? theme.primary : theme.text }]}>🌙</Text>
              <Text style={[styles.darkModeBtnSub, { color: manualOverride === true ? theme.primary : theme.subText }]}>ダーク</Text>
            </TouchableOpacity>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          <SwitchRow
            label="🖥️ フルスクリーンタイマー"
            hint="タイマー開始時に全画面表示"
            value={fullscreenTimer}
            onChange={setFullscreenTimer}
          />
          <SwitchRow
            label="📵 スマホ裏返しで集中モード"
            hint="タイマー中に表向きにすると強制終了"
            value={flipToFocus}
            onChange={setFlipToFocus}
          />
          <SwitchRow
            label="🏅 バッジをランキングに表示"
            hint="称号をランキングや名前の横に表示"
            value={showBadge}
            onChange={setShowBadge}
          />
        </View>

        {/* 保存ボタン */}
        <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving}>
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.saveBtnText}>保存する</Text>
          }
        </TouchableOpacity>

        {/* ログアウト */}
        <TouchableOpacity style={[styles.logoutBtn, { backgroundColor: theme.card }]} onPress={logout}>
          <Text style={styles.logoutBtnText}>ログアウト</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  section: { borderRadius: 20, padding: 20, marginBottom: 16, elevation: 2 },
  sectionTitle: { fontSize: 17, fontWeight: 'bold', marginBottom: 16 },
  label: { fontSize: 15, fontWeight: '600', marginBottom: 8 },
  emailBox: { borderRadius: 8, padding: 14, marginBottom: 16 },
  emailText: { fontSize: 15 },
  input: { borderRadius: 8, padding: 14, fontSize: 15, marginBottom: 8, borderWidth: 1 },
  hint: { fontSize: 12, marginBottom: 12, color: '#999' },
  presetRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  presetBtn: { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1 },
  presetLabel: { fontSize: 14, fontWeight: 'bold' },
  presetDetail: { fontSize: 11, marginTop: 4 },
  divider: { height: 1, marginBottom: 16 },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  timeLabel: { fontSize: 15 },
  timeControls: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  timeBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  timeBtnText: { fontSize: 20, fontWeight: 'bold' },
  timeValue: { fontSize: 18, fontWeight: 'bold', minWidth: 60, textAlign: 'center' },
  previewBox: { borderRadius: 8, padding: 12, marginTop: 4 },
  previewText: { fontSize: 13, textAlign: 'center' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  saveBtn: { backgroundColor: '#5C6BC0', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 12 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  logoutBtn: { borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 32 },
  logoutBtnText: { color: '#E53935', fontSize: 16, fontWeight: 'bold' },
  darkModeRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  darkModeBtn: { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center' },
  darkModeBtnText: { fontSize: 20 },
  darkModeBtnSub: { fontSize: 12, marginTop: 4, fontWeight: '600' },
});