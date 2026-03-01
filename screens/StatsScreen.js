import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  ScrollView, ActivityIndicator
} from 'react-native';
import { supabase } from '../lib/supabase';

const USER_ID = 'local_user';

export default function StatsScreen({ navigation }) {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    // タブに戻るたびに再取得（フォーカスイベント）
    const unsubscribe = navigation?.addListener('focus', fetchStats);
    return unsubscribe;
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('my_books')
      .select('*')
      .eq('user_identifier', USER_ID)
      .order('pomodoros', { ascending: false });
    if (!error) setBooks(data);
    setLoading(false);
  };

  const total = books.reduce((sum, b) => sum + b.pomodoros, 0);
  const max = Math.max(...books.map(b => b.pomodoros), 1);
  const completed = books.filter(b => b.status === '完了').length;
  const inProgress = books.filter(b => b.status === '進行中').length;

  if (loading) return (
    <SafeAreaView style={styles.container}>
      <ActivityIndicator size="large" color="#5C6BC0" style={{ marginTop: 60 }} />
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <Text style={styles.header}>📊 統計</Text>

        {/* 合計ボックス */}
        <View style={styles.totalBox}>
          <Text style={styles.totalLabel}>総ポモドーロ数</Text>
          <Text style={styles.totalNum}>🍅 {total}</Text>
          <Text style={styles.totalSub}>約 {Math.round(total * 25 / 60)} 時間</Text>
        </View>

        {/* サマリー */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNum}>{books.length}</Text>
            <Text style={styles.summaryLabel}>教材数</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={[styles.summaryNum, { color: '#4CAF50' }]}>{completed}</Text>
            <Text style={styles.summaryLabel}>完了</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={[styles.summaryNum, { color: '#FF9800' }]}>{inProgress}</Text>
            <Text style={styles.summaryLabel}>進行中</Text>
          </View>
        </View>

        {/* 教材別バー */}
        <Text style={styles.sectionTitle}>教材別ポモ数</Text>
        {books.length === 0 ? (
          <Text style={styles.empty}>まだデータがありません</Text>
        ) : (
          books.map((book, i) => (
            <View key={i} style={styles.barRow}>
              <Text style={styles.barLabel} numberOfLines={1}>{book.title}</Text>
              <View style={styles.barBg}>
                <View style={[styles.barFill, { width: `${(book.pomodoros / max) * 100}%` }]} />
              </View>
              <Text style={styles.barNum}>{book.pomodoros}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5', padding: 16 },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  totalBox: {
    backgroundColor: '#5C6BC0', borderRadius: 16,
    padding: 24, alignItems: 'center', marginBottom: 16
  },
  totalLabel: { color: '#fff', fontSize: 14, opacity: 0.8 },
  totalNum: { color: '#fff', fontSize: 48, fontWeight: 'bold', marginVertical: 8 },
  totalSub: { color: '#fff', fontSize: 14, opacity: 0.8 },
  summaryRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  summaryCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 12,
    padding: 16, alignItems: 'center', elevation: 2
  },
  summaryNum: { fontSize: 28, fontWeight: 'bold', color: '#5C6BC0' },
  summaryLabel: { fontSize: 12, color: '#888', marginTop: 4 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  barLabel: { width: 90, fontSize: 12, color: '#444' },
  barBg: { flex: 1, backgroundColor: '#E0E0E0', borderRadius: 8, height: 16, marginHorizontal: 8 },
  barFill: { backgroundColor: '#5C6BC0', borderRadius: 8, height: 16, minWidth: 4 },
  barNum: { width: 24, fontSize: 13, color: '#444', textAlign: 'right' },
  empty: { textAlign: 'center', color: '#aaa', marginTop: 40 }
});