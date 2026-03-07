import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, ActivityIndicator
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
      <View style={styles.inner}>
        <Text style={styles.logo}>📚</Text>
        <Text style={styles.title}>StudyRoute</Text>
        <Text style={[styles.subtitle, { color: theme.subText }]}>学習ルートを設計・共有しよう</Text>
        <View style={[styles.card, { backgroundColor: theme.card }]}>
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
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, justifyContent: 'center', padding: 24 },
  logo: { fontSize: 64, textAlign: 'center' },
  title: { fontSize: 32, fontWeight: 'bold', textAlign: 'center', color: '#5C6BC0', marginTop: 8 },
  subtitle: { fontSize: 15, textAlign: 'center', marginBottom: 32 },
  card: { borderRadius: 20, padding: 24, elevation: 2 },
  cardTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  error: { color: '#E53935', fontSize: 13, marginBottom: 12 },
  input: { borderRadius: 8, padding: 14, fontSize: 15, marginBottom: 12, borderWidth: 1 },
  button: { backgroundColor: '#5C6BC0', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 4 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  toggle: { textAlign: 'center', marginTop: 16, fontSize: 14 }
});