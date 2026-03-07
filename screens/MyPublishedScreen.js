import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  FlatList, TouchableOpacity, ActivityIndicator
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useTheme } from '../lib/ThemeContext';
import * as Clipboard from 'expo-clipboard';

export default function MyPublishedScreen() {
  const { theme } = useTheme();
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { initUser(); }, []);

  const initUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    fetchPublished(user.id);
  };

  const fetchPublished = async (uid) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('published_routes')
      .select('*, published_books(title, position)')
      .eq('user_identifier', uid)
      .order('created_at', { ascending: false });
    if (!error) setRoutes(data);
    setLoading(false);
  };

  const deleteRoute = async (route) => {
    if (!window.confirm(`「${route.title}」を削除しますか？`)) return;
    await supabase.from('published_routes').delete().eq('id', route.id);
    setRoutes(routes.filter(r => r.id !== route.id));
  };

  const shareRoute = async (route) => {
    let shareCode = route.share_code;
    if (!shareCode) {
      shareCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      await supabase.from('published_routes')
        .update({ share_code: shareCode })
        .eq('id', route.id);
      setRoutes(prev => prev.map(r =>
        r.id === route.id ? { ...r, share_code: shareCode } : r
      ));
    }
    await Clipboard.setStringAsync(shareCode);
    alert(`シェアコード: ${shareCode}\n\nクリップボードにコピーしました！`);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      <Text style={[styles.header, { color: theme.text }]}>🌏 公開したルート</Text>

      {loading ? (
        <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={routes}
          keyExtractor={item => item.id}
          renderItem={({ item }) => {
            const sortedBooks = (item.published_books || []).sort((a, b) => a.position - b.position);
            return (
              <View style={[styles.card, { backgroundColor: theme.card }]}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderLeft}>
                    <Text style={[styles.cardTitle, { color: theme.text }]}>{item.title}</Text>
                    <Text style={[styles.cardTarget, { color: theme.subText }]}>🎯 {item.target}</Text>
                  </View>
                  {item.is_passed && (
                    <View style={styles.passedBadge}>
                      <Text style={styles.passedText}>合格済</Text>
                    </View>
                  )}
                </View>
                <View style={styles.bookList}>
                  {sortedBooks.map((b, i) => (
                    <Text key={i} style={[styles.bookItem, { color: theme.subText }]}>📖 {b.title}</Text>
                  ))}
                </View>
                <View style={styles.cardFooter}>
                  <View style={styles.statsRow}>
                    <Text style={[styles.statItem, { color: theme.subText }]}>❤️ {item.likes_count}</Text>
                    <Text style={[styles.statItem, { color: theme.subText }]}>🍅 {item.total_pomodoros}ポモ</Text>
                    <Text style={[styles.statItem, { color: theme.subText }]}>📅 {item.study_days}日</Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity style={styles.shareBtn} onPress={() => shareRoute(item)}>
                      <Text style={styles.shareBtnText}>🔗 シェア</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteRoute(item)}>
                      <Text style={styles.deleteBtnText}>削除</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={[styles.empty, { color: theme.subText }]}>まだルートを公開していません</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  card: { borderRadius: 16, padding: 16, marginBottom: 12, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  cardHeaderLeft: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 2 },
  cardTarget: { fontSize: 13 },
  passedBadge: { backgroundColor: '#E8F5E9', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start' },
  passedText: { color: '#4CAF50', fontSize: 12, fontWeight: 'bold' },
  bookList: { marginBottom: 10 },
  bookItem: { fontSize: 13, marginBottom: 2 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statsRow: { flexDirection: 'row', gap: 12 },
  statItem: { fontSize: 12 },
  deleteBtn: { backgroundColor: '#FFEBEE', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  deleteBtnText: { color: '#E53935', fontWeight: 'bold', fontSize: 13 },
  shareBtn: { backgroundColor: '#E8EAF6', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  shareBtnText: { color: '#5C6BC0', fontWeight: 'bold', fontSize: 13 },
  emptyContainer: { alignItems: 'center', marginTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  empty: { fontSize: 15 }
});