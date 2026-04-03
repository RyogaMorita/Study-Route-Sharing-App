import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, ActivityIndicator, Platform
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useTheme } from '../lib/ThemeContext';

export default function AuthScreen() {
  const { theme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showEmail, setShowEmail] = useState(false);

  const handleGuest = async () => {
    setLoading(true); setError('');
    const { error } = await supabase.auth.signInAnonymously();
    if (error) setError('ゲストログインに失敗しました');
    setLoading(false);
  };

  const handleAuth = async () => {
    if (!email.trim() || !password.trim()) { setError('メールアドレスとパスワードを入力してください'); return; }
    setLoading(true); setError('');
    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError('ログインに失敗しました：' + error.message);
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setError('登録に失敗しました：' + error.message);
      else setError('確認メールを送信しました。メールを確認してください。');
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={styles.topDecoration} pointerEvents="none" />
      <View style={styles.inner}>
        <View style={styles.logoArea}>
          <View style={[styles.logoCircle, { backgroundColor: '#5C6BC0' }]}>
            <Text style={styles.logo}>📚</Text>
          </View>
          <Text style={styles.title}>StudyRoute</Text>
          <Text style={[styles.subtitle, { color: theme.subText }]}>学習ルートを設計・共有しよう</Text>
        </View>

        <View style={[styles.card, { backgroundColor: theme.card }]}>

          {!showEmail ? (
            <>
              {/* ゲストログイン */}
              <TouchableOpacity style={styles.guestBtn} onPress={handleGuest} disabled={loading}>
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.guestBtnText}>👤 すぐにはじめる（ゲスト）</Text>
                }
              </TouchableOpacity>
              <Text style={[styles.guestNote, { color: theme.subText }]}>
                ※ゲストはデータがデバイスに保存されます
              </Text>

              <View style={[styles.divider, { backgroundColor: theme.border }]} />

              <TouchableOpacity
                style={[styles.emailBtn, { borderColor: theme.border }]}
                onPress={() => setShowEmail(true)}
              >
                <Text style={[styles.emailBtnText, { color: theme.text }]}>📧 メールアドレスで登録・ログイン</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={[styles.cardTitle, { color: theme.text }]}>{isLogin ? 'ログイン' : '新規登録'}</Text>
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <TextInput
                style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
                placeholder="メールアドレス" placeholderTextColor={theme.subText}
                value={email} onChangeText={setEmail}
                keyboardType="email-address" autoCapitalize="none"
              />
              <TextInput
                style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
                placeholder="パスワード（6文字以上）" placeholderTextColor={theme.subText}
                value={password} onChangeText={setPassword} secureTextEntry
              />
              <TouchableOpacity style={styles.button} onPress={handleAuth} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{isLogin ? 'ログイン' : '登録する'}</Text>}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setIsLogin(!isLogin); setError(''); }}>
                <Text style={[styles.toggle, { color: theme.primary }]}>
                  {isLogin ? 'アカウントをお持ちでない方はこちら' : 'ログインはこちら'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setShowEmail(false); setError(''); }}>
                <Text style={[styles.toggle, { color: theme.subText }]}>← 戻る</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}



const styles = StyleSheet.create({
  container: { flex: 1 },
  topDecoration: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 280,
    backgroundColor: '#5C6BC0',
    opacity: 0.08,
    borderBottomLeftRadius: 60,
    borderBottomRightRadius: 60,
  },
  inner: { flex: 1, justifyContent: 'center', padding: 24 },
  logoArea: { alignItems: 'center', marginBottom: 36 },
  logoCircle: {
    width: 90, height: 90, borderRadius: 45,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#5C6BC0',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  logo: { fontSize: 44 },
  title: { fontSize: 32, fontWeight: 'bold', textAlign: 'center', color: '#5C6BC0', letterSpacing: 1 },
  subtitle: { fontSize: 14, textAlign: 'center', marginTop: 6, letterSpacing: 0.3 },
  card: {
    borderRadius: 24, padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
  },
  cardTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  error: { color: '#E53935', fontSize: 13, marginBottom: 12 },
  input: { borderRadius: 12, padding: 14, fontSize: 15, marginBottom: 12, borderWidth: 1 },
  button: { backgroundColor: '#5C6BC0', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 4 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  toggle: { textAlign: 'center', marginTop: 16, fontSize: 14 },
  guestBtn: { backgroundColor: '#5C6BC0', borderRadius: 14, padding: 18, alignItems: 'center' },
  guestBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  guestNote: { fontSize: 12, textAlign: 'center', marginTop: 8 },
  divider: { height: 1, marginVertical: 16 },
  emailBtn: { borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1 },
  emailBtnText: { fontSize: 15 },
});