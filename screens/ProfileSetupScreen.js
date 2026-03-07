import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, ActivityIndicator, ScrollView
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useTheme } from '../lib/ThemeContext';

export default function ProfileEditScreen({ onClose }) {
  const { theme } = useTheme();
  const [username, setUsername] = useState('');
  const [examDate, setExamDate] = useState('');
  const [email, setEmail] = useState('');
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
      exam_date: examDate || null
    });
    setSaving(false);
    if (error) { alert('保存に失敗しました'); return; }
    alert('保存しました！');
    onClose();
  };

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

        <View style={[styles.card, { backgroundColor: theme.card }]}>
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

          <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving}>
            {saving
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.saveBtnText}>保存する</Text>
            }
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  header: { fontSize: 22, fontWeight: 'bold' },
  closeBtn: { fontSize: 15 },
  card: { borderRadius: 20, padding: 24, elevation: 2 },
  label: { fontSize: 15, fontWeight: '600', marginBottom: 8 },
  emailBox: { borderRadius: 8, padding: 14, marginBottom: 16 },
  emailText: { fontSize: 15 },
  input: { borderRadius: 8, padding: 14, fontSize: 15, marginBottom: 8, borderWidth: 1 },
  hint: { fontSize: 12, marginBottom: 16 },
  saveBtn: { backgroundColor: '#5C6BC0', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});