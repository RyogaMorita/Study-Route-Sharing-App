import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, ActivityIndicator, ScrollView, Switch
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useTheme } from '../lib/ThemeContext';

export default function ProfileEditScreen({ onClose }) {
  const { theme } = useTheme();
  const [username, setUsername] = useState('');
  const [examDate, setExamDate] = useState('');
  const [email, setEmail] = useState('');
  const [pomodoroMinutes, setPomodoroMinutes] = useState(25);
  const [shortBreak, setShortBreak] = useState(5);
  const [longBreak, setLongBreak] = useState(15);
  const [dailyPomoGoal, setDailyPomoGoal] = useState(8);
  const [showBadge, setShowBadge] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchProfile(); }, []);

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setEmail(user.email);
    const { data } = await supabase.from('user_profiles')
      .select('*').eq('user_id', user.id).single();
    if (data) {
      setUsername(data.username || '');
      setExamDate(data.exam_date || '');
      setPomodoroMinutes(data.pomodoro_minutes || 25);
      setShortBreak(data.short_break_minutes || 5);
      setLongBreak(data.long_break_minutes || 15);
      setDailyPomoGoal(data.daily_pomo_goal || 8);
      setShowBadge(data.show_badge !== false);
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
      show_badge: showBadge,
    });
    setSaving(false);
    if (error) { alert('保存に失敗しました'); return; }
    alert('保存しました！');
    onClose();
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
        <Text style={[styles.timeValue, { color: theme.primary }]}>{value}分</Text>
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

  if (loading) return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 60 }} />
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      <ScrollView>
        <View style={styles.headerRow}>
          <Text style={[styles.header, { color: theme.text }]}>👤 プロフィール編集</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={[styles.closeBtn, { color: theme.subText }]}>✕ 閉じる</Text>
          </TouchableOpacity>
        </View>

        {/* 基本情報 */}
        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>基本情報</Text>

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

          <View style={styles.switchRow}>
            <View>
              <Text style={[styles.label, { color: theme.text }]}>バッジをフレンド・ランキングに表示</Text>
              <Text style={[styles.hint, { color: theme.subText }]}>称号をランキングや名前の横に表示します</Text>
            </View>
            <Switch
              value={showBadge}
              onValueChange={setShowBadge}
              trackColor={{ true: theme.primary }}
            />
          </View>
        </View>

        {/* ポモドーロ設定 */}
        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>🍅 ポモドーロ設定</Text>

          {/* プリセット */}
          <Text style={[styles.label, { color: theme.text }]}>プリセット</Text>
          <View style={styles.presetRow}>
            <PresetBtn label="標準" pomo={25} s={5} l={15} />
            <PresetBtn label="短め" pomo={15} s={3} l={10} />
            <PresetBtn label="長め" pomo={50} s={10} l={30} />
          </View>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          {/* カスタム */}
          <Text style={[styles.label, { color: theme.text }]}>カスタム設定</Text>
          <TimeSelector
            label="🍅 集中時間"
            value={pomodoroMinutes}
            onChange={setPomodoroMinutes}
            min={1} max={90}
          />
          <TimeSelector
            label="☕ 短い休憩"
            value={shortBreak}
            onChange={setShortBreak}
            min={1} max={30}
          />
          <TimeSelector
            label="🛋️ 長い休憩"
            value={longBreak}
            onChange={setLongBreak}
            min={1} max={60}
          />

          <View style={[styles.previewBox, { backgroundColor: theme.inputBg }]}>
            <Text style={[styles.previewText, { color: theme.subText }]}>
              集中 {pomodoroMinutes}分 → 休憩 {shortBreak}分 → ×4セット → 長休憩 {longBreak}分
            </Text>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <Text style={[styles.label, { color: theme.text }]}>🎯 1日の目標ポモ数</Text>
          <TimeSelector
            label="目標ポモ数"
            value={dailyPomoGoal}
            onChange={setDailyPomoGoal}
            min={1} max={20}
          />
          <Text style={[styles.hint, { color: theme.subText }]}>
            目標達成で統計画面にゲージ表示されます
          </Text>
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving}>
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.saveBtnText}>保存する</Text>
          }
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  header: { fontSize: 22, fontWeight: 'bold' },
  closeBtn: { fontSize: 15 },
  card: { borderRadius: 20, padding: 24, elevation: 2, marginBottom: 16 },
  sectionTitle: { fontSize: 17, fontWeight: 'bold', marginBottom: 16 },
  label: { fontSize: 15, fontWeight: '600', marginBottom: 8 },
  emailBox: { borderRadius: 8, padding: 14, marginBottom: 16 },
  emailText: { fontSize: 15 },
  input: { borderRadius: 8, padding: 14, fontSize: 15, marginBottom: 8, borderWidth: 1 },
  hint: { fontSize: 12, marginBottom: 8 },
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
  timeValue: { fontSize: 18, fontWeight: 'bold', minWidth: 50, textAlign: 'center' },
  previewBox: { borderRadius: 8, padding: 12, marginTop: 4 },
  previewText: { fontSize: 13, textAlign: 'center' },
  saveBtn: { backgroundColor: '#5C6BC0', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 32 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
});