import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  FlatList, StyleSheet, SafeAreaView, ActivityIndicator
} from 'react-native';
import { supabase } from '../lib/supabase';

export default function ExploreScreen() {
  const [query, setQuery] = useState('');
  const [routes, setRoutes] = useState([]);
  const [likedIds, setLikedIds] = useState([]);
  const [filter, setFilter] = useState('人気順');
  const [loading, setLoading] = useState(true);

  const filters = ['人気順', '新着順', '合格済み'];

  useEffect(() => {
    fetchRoutes();
  }, [filter]);

  const fetchRoutes = async () => {
    setLoading(true);
    let q = supabase
      .from('published_routes')
      .select('*, published_books(title, position)');

    if (filter === '合格済み') q = q.eq('is_passed', true);
    if (filter === '人気順') q = q.order('likes_count', { ascending: false });
    if (filter === '新着順') q = q.order('created_at', { ascending: false });

    const { data, error } = await q;
    if (!error) setRoutes(data);
    setLoading(false);
  };

  const filtered = routes.filter(r =>
    query === '' ||
    r.title.includes(query) ||
    r.target.includes(query)
  );

  const toggleLike = async (route) => {
    const identifier = 'local_user'; // 後でAuth導入時に変更
    const liked = likedIds.includes(route.id);

    if (liked) {
      await supabase
        .from('route_likes')
        .delete()
        .eq('route_id', route.id)
        .eq('user_identifier', identifier);

      await supabase
        .from('routes')
        .update({ likes_count: route.likes_count - 1 })
        .eq('id', route.id);

      setLikedIds(prev => prev.filter(i => i !== route.id));
      setRoutes(prev => prev.map(r =>
        r.id === route.id ? { ...r, likes_count: r.likes_count - 1 } : r
      ));
    } else {
      await supabase
        .from('route_likes')
        .insert({ route_id: route.id, user_identifier: identifier });

      await supabase
        .from('routes')
        .update({ likes_count: route.likes_count + 1 })
        .eq('id', route.id);

      setLikedIds(prev => [...prev, route.id]);
      setRoutes(prev => prev.map(r =>
        r.id === route.id ? { ...r, likes_count: r.likes_count + 1 } : r
      ));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>🔍 ルートを探す</Text>

      <TextInput
        style={styles.searchBar}
        placeholder="東大・基本情報・TOEICなど"
        value={query}
        onChangeText={setQuery}
      />

      <View style={styles.filterRow}>
        {filters.map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#5C6BC0" style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={({ item }) => {
            const liked = likedIds.includes(item.id);
            const sortedBooks = (item.published_books || []).sort((a, b) => a.position - b.position);
            return (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderLeft}>
                    <Text style={styles.cardTitle}>{item.title}</Text>
                    <Text style={styles.cardTarget}>🎯 {item.target}</Text>
                  </View>
                  {item.is_passed && (
                    <View style={styles.passedBadge}>
                      <Text style={styles.passedText}>合格済</Text>
                    </View>
                  )}
                </View>

                <View style={styles.bookList}>
                  {sortedBooks.map((b, i) => (
                    <Text key={i} style={styles.bookItem}>📖 {b.title}</Text>
                  ))}
                </View>

                <View style={styles.statsRow}>
                  <Text style={styles.statItem}>📅 {item.study_days}日</Text>
                  <Text style={styles.statItem}>🍅 {item.total_pomodoros}ポモ</Text>
                  <Text style={styles.statItem}>／日 {item.avg_daily}</Text>
                </View>

                <View style={styles.cardFooter}>
                  <Text style={styles.author}>@{item.author}</Text>
                  <View style={styles.footerRight}>
                    <TouchableOpacity
                      style={styles.copyBtn}
                      onPress={() => alert(`「${item.title}」をコピーしました！`)}
                    >
                      <Text style={styles.copyBtnText}>このルートを使う</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.likeBtn}
                      onPress={() => toggleLike(item)}
                    >
                      <Text style={styles.likeText}>
                        {liked ? '❤️' : '🤍'} {item.likes_count}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <Text style={styles.empty}>該当するルートがありません</Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5', padding: 16 },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  searchBar: {
    backgroundColor: '#fff', borderRadius: 12, padding: 12,
    fontSize: 15, borderWidth: 1, borderColor: '#ddd', marginBottom: 12
  },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  filterBtn: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20, backgroundColor: '#fff',
    borderWidth: 1, borderColor: '#ddd'
  },
  filterBtnActive: { backgroundColor: '#5C6BC0', borderColor: '#5C6BC0' },
  filterText: { fontSize: 13, color: '#666' },
  filterTextActive: { color: '#fff', fontWeight: 'bold' },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    marginBottom: 12, elevation: 2
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  cardHeaderLeft: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 2 },
  cardTarget: { fontSize: 13, color: '#666' },
  passedBadge: {
    backgroundColor: '#E8F5E9', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start'
  },
  passedText: { color: '#4CAF50', fontSize: 12, fontWeight: 'bold' },
  bookList: { marginBottom: 10 },
  bookItem: { fontSize: 13, color: '#444', marginBottom: 2 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  statItem: { fontSize: 12, color: '#888' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  author: { fontSize: 12, color: '#aaa' },
  footerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  copyBtn: { backgroundColor: '#5C6BC0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  copyBtnText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  likeBtn: { padding: 4 },
  likeText: { fontSize: 15 },
  empty: { textAlign: 'center', color: '#aaa', marginTop: 60 }
});