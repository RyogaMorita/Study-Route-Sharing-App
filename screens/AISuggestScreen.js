import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, ActivityIndicator, TextInput
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useTheme } from '../lib/ThemeContext';

export default function AISuggestScreen() {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState(null);
  const [books, setBooks] = useState([]);
  const [profile, setProfile] = useState(null);
  const [question, setQuestion] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const [booksRes, profileRes] = await Promise.all([
      supabase.from('my_books').select('*').eq('user_identifier', user.id),
      supabase.from('user_profiles').select('*').eq('user_id', user.id).single()
    ]);
    if (!booksRes.error) setBooks(booksRes.data);
    if (!profileRes.error) setProfile(profileRes.data);
  };

  const buildContext = () => {
    const totalPomos = books.reduce((s, b) => s + b.pomodoros, 0);
    const completed = books.filter(b => b.status === '完了').length;
    const inProgress = books.filter(b => b.status === '進行中');
    const notStarted = books.filter(b => b.status === '未着手').length;

    const examDate = profile?.exam_date;
    const daysLeft = examDate
      ? Math.ceil((new Date(examDate) - new Date()) / (1000 * 60 * 60 * 24))
      : null;

    return `
ユーザーの学習状況：
- 総ポモドーロ数: ${totalPomos}回（約${Math.round(totalPomos * 25 / 60)}時間）
- 教材数: 全${books.length}冊（完了${completed}冊・進行中${inProgress.length}冊・未着手${notStarted}冊）
- 試験まであと: ${daysLeft !== null ? `${daysLeft}日` : '未設定'}
- 進行中の教材: ${inProgress.map(b => `${b.title}(${b.current_page || 0}/${b.total_pages || '?'}p, ${b.pomodoros}ポモ)`).join('、') || 'なし'}
- 未着手の教材: ${books.filter(b => b.status === '未着手').map(b => b.title).join('、') || 'なし'}
- メモ付き教材: ${books.filter(b => b.memo).map(b => `${b.title}: ${b.memo}`).join('、') || 'なし'}
    `.trim();
  };

  const generateSuggestion = async () => {
    setLoading(true);
    setSuggestion(null);
    const context = buildContext();

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: `あなたは優秀な学習コーチです。ユーザーの学習データを分析して、具体的で実践的なアドバイスを日本語で提供してください。
回答は以下の形式でJSON形式で返してください：
{
  "today": "今日やるべきこと（1-2文）",
  "priority": "最優先教材名",
  "reason": "その理由（2-3文）",
  "warning": "注意点や改善点（あれば）",
  "encouragement": "励ましのメッセージ（1文）",
  "schedule": "おすすめの今日のスケジュール（3-4ステップ）"
}`,
          messages: [{ role: 'user', content: context }]
        })
      });

      const data = await response.json();
      const text = data.content[0].text;
      const clean = text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(clean);
      setSuggestion(parsed);
    } catch (e) {
      setSuggestion({ today: 'データの取得に失敗しました。もう一度お試しください。' });
    }
    setLoading(false);
  };

  const sendChat = async () => {
    if (!question.trim()) return;
    const userMsg = question.trim();
    setQuestion('');
    setChatLoading(true);

    const newHistory = [...chatHistory, { role: 'user', content: userMsg }];
    setChatHistory(newHistory);

    const context = buildContext();

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: `あなたは優秀な学習コーチです。以下がユーザーの現在の学習状況です：\n\n${context}\n\nこの情報を踏まえて、具体的で実践的なアドバイスを日本語で提供してください。`,
          messages: newHistory
        })
      });

      const data = await response.json();
      const text = data.content[0].text;
      setChatHistory([...newHistory, { role: 'assistant', content: text }]);
    } catch (e) {
      setChatHistory([...newHistory, { role: 'assistant', content: 'エラーが発生しました。もう一度お試しください。' }]);
    }
    setChatLoading(false);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={[styles.header, { color: theme.text }]}>🤖 AI学習コーチ</Text>

        {/* 分析ボタン */}
        <TouchableOpacity
          style={[styles.analyzeBtn, loading && styles.analyzeBtnDisabled]}
          onPress={generateSuggestion}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.analyzeBtnText}>✨ 今日の学習を分析する</Text>
          }
        </TouchableOpacity>

        {/* 提案結果 */}
        {suggestion && (
          <View style={styles.suggestionArea}>
            {/* 今日やること */}
            <View style={[styles.card, { backgroundColor: theme.primary }]}>
              <Text style={styles.cardTitleWhite}>📌 今日やること</Text>
              <Text style={styles.cardTextWhite}>{suggestion.today}</Text>
            </View>

            {/* 最優先教材 */}
            {suggestion.priority && (
              <View style={[styles.card, { backgroundColor: theme.card }]}>
                <Text style={[styles.cardTitle, { color: theme.text }]}>🎯 最優先教材</Text>
                <Text style={[styles.priorityBook, { color: theme.primary }]}>{suggestion.priority}</Text>
                <Text style={[styles.cardText, { color: theme.subText }]}>{suggestion.reason}</Text>
              </View>
            )}

            {/* スケジュール */}
            {suggestion.schedule && (
              <View style={[styles.card, { backgroundColor: theme.card }]}>
                <Text style={[styles.cardTitle, { color: theme.text }]}>📅 今日のスケジュール</Text>
                <Text style={[styles.cardText, { color: theme.subText }]}>{suggestion.schedule}</Text>
              </View>
            )}

            {/* 注意点 */}
            {suggestion.warning && (
              <View style={[styles.card, { backgroundColor: '#FFF8E1' }]}>
                <Text style={styles.cardTitleWarning}>⚠️ 注意点</Text>
                <Text style={styles.cardTextWarning}>{suggestion.warning}</Text>
              </View>
            )}

            {/* 励まし */}
            {suggestion.encouragement && (
              <View style={[styles.card, { backgroundColor: '#E8F5E9' }]}>
                <Text style={styles.cardTitleSuccess}>💪 {suggestion.encouragement}</Text>
              </View>
            )}
          </View>
        )}

        {/* チャット */}
        <View style={[styles.chatSection, { backgroundColor: theme.card }]}>
          <Text style={[styles.chatTitle, { color: theme.text }]}>💬 学習コーチに相談する</Text>

          {chatHistory.length === 0 && (
            <View style={styles.suggestQuestions}>
              {[
                '今週の学習計画を立てて',
                'モチベーションが下がっています',
                '試験まで間に合いますか？',
                '効率的な暗記法を教えて'
              ].map((q, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.suggestQ, { backgroundColor: theme.inputBg, borderColor: theme.border }]}
                  onPress={() => setQuestion(q)}
                >
                  <Text style={[styles.suggestQText, { color: theme.primary }]}>{q}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* チャット履歴 */}
          {chatHistory.map((msg, i) => (
            <View key={i} style={[
              styles.chatBubble,
              msg.role === 'user'
                ? [styles.userBubble, { backgroundColor: theme.primary }]
                : [styles.aiBubble, { backgroundColor: theme.inputBg }]
            ]}>
              <Text style={[
                styles.chatText,
                { color: msg.role === 'user' ? '#fff' : theme.text }
              ]}>{msg.content}</Text>
            </View>
          ))}

          {chatLoading && (
            <View style={[styles.aiBubble, { backgroundColor: theme.inputBg }]}>
              <ActivityIndicator size="small" color={theme.primary} />
            </View>
          )}

          {/* 入力欄 */}
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.chatInput, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
              placeholder="質問を入力..."
              placeholderTextColor={theme.subText}
              value={question}
              onChangeText={setQuestion}
              multiline
            />
            <TouchableOpacity
              style={[styles.sendBtn, chatLoading && styles.sendBtnDisabled]}
              onPress={sendChat}
              disabled={chatLoading}
            >
              <Text style={styles.sendBtnText}>送信</Text>
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  analyzeBtn: { backgroundColor: '#5C6BC0', borderRadius: 14, padding: 18, alignItems: 'center', marginBottom: 16 },
  analyzeBtnDisabled: { backgroundColor: '#aaa' },
  analyzeBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  suggestionArea: { marginBottom: 16 },
  card: { borderRadius: 16, padding: 16, marginBottom: 10, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8 },
  cardTitle: { fontSize: 15, fontWeight: 'bold', marginBottom: 8 },
  cardTitleWhite: { fontSize: 15, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  cardTitleWarning: { fontSize: 15, fontWeight: 'bold', color: '#F57F17', marginBottom: 8 },
  cardTitleSuccess: { fontSize: 15, fontWeight: 'bold', color: '#2E7D32' },
  cardText: { fontSize: 14, lineHeight: 22 },
  cardTextWhite: { fontSize: 14, color: '#fff', lineHeight: 22 },
  cardTextWarning: { fontSize: 14, color: '#F57F17', lineHeight: 22 },
  priorityBook: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  chatSection: { borderRadius: 20, padding: 16, marginBottom: 32, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8 },
  chatTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  suggestQuestions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  suggestQ: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1 },
  suggestQText: { fontSize: 13 },
  chatBubble: { borderRadius: 14, padding: 12, marginBottom: 8, maxWidth: '85%' },
  userBubble: { alignSelf: 'flex-end' },
  aiBubble: { alignSelf: 'flex-start' },
  chatText: { fontSize: 14, lineHeight: 22 },
  inputRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  chatInput: { flex: 1, borderRadius: 12, padding: 12, fontSize: 14, borderWidth: 1, maxHeight: 100 },
  sendBtn: { backgroundColor: '#5C6BC0', borderRadius: 12, padding: 12, justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: '#aaa' },
  sendBtnText: { color: '#fff', fontWeight: 'bold' }
});