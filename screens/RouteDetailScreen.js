import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  ScrollView, TouchableOpacity, ActivityIndicator, Modal
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useTheme } from '../lib/ThemeContext';

const STAMPS = ['👍', '🔥', '💪', '✨', '🎉', '😊', '🤔', '💯'];

const FIXED_COMMENTS = [
  'ルートを参考にします！',
  'このルートで合格しました！',
  'わかりやすいルートです',
  '真似して頑張ります！',
  'モチベ上がりました！',
  'ありがとうございます！',
  '難しそうですね',
  '自分もこれで勉強中です',
];

export default function RouteDetailScreen({ route, onClose }) {
  const { theme } = useTheme();
  const routeData = route;
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [username, setUsername] = useState('');
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => { initUser(); }, []);

  const initUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user.id);
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('username')
      .eq('user_id', user.id)
      .single();
    if (profile) setUsername(profile.username);
    fetchComments();
  };

  const fetchComments = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('route_comments')
      .select('*')
      .eq('route_id', routeData.id)
      .order('created_at', { ascending: false });
    if (data) setComments(data);
    setLoading(false);
  };

  const sendComment = async (content, type) => {
    setSending(true);
    const { error } = await supabase.from('route_comments').insert({
      route_id: routeData.id,
      user_id: userId,
      username,
      comment_type: type,
      content
    });
    if (!error) {
      await fetchComments();
      setShowCommentModal(false);
    }
    setSending(false);
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  // スタンプの集計
  const stampCounts = STAMPS.reduce((acc, s) => {
    acc[s] = comments.filter(c => c.comment_type === 'stamp' && c.content === s).length;
    return acc;
  }, {});

  const textComments = comments.filter(c => c.comment_type === 'text');

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ヘッダー */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={onClose}>
            <Text style={[styles.backBtn, { color: theme.primary }]}>← 戻る</Text>
          </TouchableOpacity>
        </View>

        {/* ルート情報 */}
        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>{routeData.title}</Text>
            {routeData.is_passed && (
              <View style={styles.passedBadge}>
                <Text style={styles.passedText}>合格済</Text>
              </View>
            )}
          </View>
          <Text style={[styles.cardTarget, { color: theme.subText }]}>🎯 {routeData.target}</Text>
          <View style={styles.bookList}>
            {(routeData.published_books || [])
              .sort((a, b) => a.position - b.position)
              .map((b, i) => (
                <Text key={i} style={[styles.bookItem, { color: theme.subText }]}>📖 {b.title}</Text>
              ))
            }
          </View>
          <View style={styles.statsRow}>
            <Text style={[styles.statItem, { color: theme.subText }]}>📅 {routeData.study_days}日</Text>
            <Text style={[styles.statItem, { color: theme.subText }]}>🍅 {routeData.total_pomodoros}ポモ</Text>
            <Text style={[styles.statItem, { color: theme.subText }]}>❤️ {routeData.likes_count}</Text>
          </View>
        </View>

        {/* スタンプ */}
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>スタンプ</Text>
          <View style={styles.stampGrid}>
            {STAMPS.map((stamp, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.stampBtn, { backgroundColor: theme.inputBg }]}
                onPress={() => sendComment(stamp, 'stamp')}
                disabled={sending}
              >
                <Text style={styles.stampEmoji}>{stamp}</Text>
                {stampCounts[stamp] > 0 && (
                  <Text style={[styles.stampCount, { color: theme.subText }]}>{stampCounts[stamp]}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* コメント */}
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <View style={styles.commentHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              💬 コメント（{textComments.length}）
            </Text>
            <TouchableOpacity
              style={styles.addCommentBtn}
              onPress={() => setShowCommentModal(true)}
            >
              <Text style={styles.addCommentBtnText}>＋ コメント</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator color={theme.primary} />
          ) : textComments.length === 0 ? (
            <Text style={[styles.empty, { color: theme.subText }]}>まだコメントがありません</Text>
          ) : (
            textComments.map((c, i) => (
              <View key={i} style={[styles.commentCard, { borderBottomColor: theme.border }]}>
                <View style={styles.commentTop}>
                  <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
                    <Text style={styles.avatarText}>{c.username?.[0]?.toUpperCase() || '?'}</Text>
                  </View>
                  <Text style={[styles.commentUsername, { color: theme.primary }]}>@{c.username}</Text>
                  <Text style={[styles.commentDate, { color: theme.subText }]}>{formatDate(c.created_at)}</Text>
                </View>
                <Text style={[styles.commentText, { color: theme.text }]}>{c.content}</Text>
              </View>
            ))
          )}
        </View>

      </ScrollView>

      {/* コメント選択モーダル */}
      <Modal visible={showCommentModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>💬 コメントを選択</Text>
            <ScrollView>
              {FIXED_COMMENTS.map((comment, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.commentOption, { backgroundColor: theme.inputBg, borderColor: theme.border }]}
                  onPress={() => sendComment(comment, 'text')}
                  disabled={sending}
                >
                  <Text style={[styles.commentOptionText, { color: theme.text }]}>{comment}</Text>
                  {sending && <ActivityIndicator size="small" color={theme.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={[styles.cancelBtn, { marginTop: 12 }]}
              onPress={() => setShowCommentModal(false)}
            >
              <Text style={styles.cancelBtnText}>キャンセル</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  headerRow: { marginBottom: 12 },
  backBtn: { fontSize: 16, fontWeight: '600' },
  card: { borderRadius: 16, padding: 16, marginBottom: 12, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', flex: 1 },
  passedBadge: { backgroundColor: '#E8F5E9', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  passedText: { color: '#4CAF50', fontSize: 12, fontWeight: 'bold' },
  cardTarget: { fontSize: 13, marginBottom: 10 },
  bookList: { marginBottom: 10 },
  bookItem: { fontSize: 13, marginBottom: 2 },
  statsRow: { flexDirection: 'row', gap: 12 },
  statItem: { fontSize: 12 },
  section: { borderRadius: 16, padding: 16, marginBottom: 12, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  stampGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stampBtn: { borderRadius: 12, padding: 10, alignItems: 'center', minWidth: 56 },
  stampEmoji: { fontSize: 28 },
  stampCount: { fontSize: 12, fontWeight: 'bold', marginTop: 2 },
  commentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  addCommentBtn: { backgroundColor: '#5C6BC0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  addCommentBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  commentCard: { paddingVertical: 10, borderBottomWidth: 1 },
  commentTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  avatar: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  commentUsername: { fontSize: 13, fontWeight: '600' },
  commentDate: { fontSize: 11, marginLeft: 'auto' },
  commentText: { fontSize: 14, lineHeight: 20 },
  empty: { textAlign: 'center', marginVertical: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: { borderRadius: 20, padding: 24, maxHeight: '70%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 16 },
  commentOption: { borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1 },
  commentOptionText: { fontSize: 15 },
  cancelBtn: { borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#ddd' },
  cancelBtnText: { fontSize: 15, color: '#666' },
});