import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  FlatList, StyleSheet, SafeAreaView, ActivityIndicator,
  Modal, ScrollView
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useTheme } from '../lib/ThemeContext';
import * as Clipboard from 'expo-clipboard';
import RouteDetailScreen from './RouteDetailScreen';

export default function ExploreScreen() {
  const { theme } = useTheme();
  const [query, setQuery] = useState('');
  const [routes, setRoutes] = useState([]);
  const [likedIds, setLikedIds] = useState([]);
  const [filter, setFilter] = useState('人気順');
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [copyingId, setCopyingId] = useState(null);
  const [myRoutes, setMyRoutes] = useState(['デフォルト']);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [copyTarget, setCopyTarget] = useState('デフォルト');
  const [newCopyRouteName, setNewCopyRouteName] = useState('');
  const [shareCode, setShareCode] = useState('');
  const [shareResult, setShareResult] = useState(null);

  const filters = ['人気順', '新着順', '合格済み'];

  useEffect(() => { initUser(); }, []);
  useEffect(() => { fetchRoutes(); }, [filter]);

  const initUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user.id);
    fetchMyRoutes(user.id);
  };

  const fetchMyRoutes = async (uid) => {
    const { data } = await supabase.from('my_books').select('route_name').eq('user_identifier', uid);
    if (data) {
      const names = [...new Set(data.map(b => b.route_name).filter(Boolean))];
      if (names.length > 0) setMyRoutes(names);
    }
  };

  const fetchRoutes = async () => {
    setLoading(true);
    let q = supabase.from('published_routes').select('*, published_books(title, position)');
    if (filter === '合格済み') q = q.eq('is_passed', true);
    if (filter === '人気順') q = q.order('likes_count', { ascending: false });
    if (filter === '新着順') q = q.order('created_at', { ascending: false });
    const { data, error } = await q;
    if (!error) setRoutes(data);
    setLoading(false);
  };

  const filtered = routes.filter(r =>
    query === '' || r.title.includes(query) || r.target.includes(query)
  );

  const toggleLike = async (route) => {
    const identifier = userId || 'local_user';
    const liked = likedIds.includes(route.id);
    if (liked) {
      await supabase.from('route_likes').delete().eq('route_id', route.id).eq('user_identifier', identifier);
      await supabase.from('published_routes').update({ likes_count: route.likes_count - 1 }).eq('id', route.id);
      setLikedIds(prev => prev.filter(i => i !== route.id));
      setRoutes(prev => prev.map(r => r.id === route.id ? { ...r, likes_count: r.likes_count - 1 } : r));
    } else {
      await supabase.from('route_likes').insert({ route_id: route.id, user_identifier: identifier });
      await supabase.from('published_routes').update({ likes_count: route.likes_count + 1 }).eq('id', route.id);
      setLikedIds(prev => [...prev, route.id]);
      setRoutes(prev => prev.map(r => r.id === route.id ? { ...r, likes_count: r.likes_count + 1 } : r));
    }
  };

  const shareRoute = async (route) => {
    // シェアコードを生成または取得
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
    const shareUrl = `studyroute://route/${shareCode}`;
    await Clipboard.setStringAsync(shareUrl);
    alert(`シェアコード: ${shareCode}\n\nクリップボードにコピーしました！\n友達にコードを教えてください。`);
  };

  const openCopyModal = (route) => {
    setSelectedRoute(route);
    setCopyTarget(myRoutes[0] || 'デフォルト');
    setNewCopyRouteName('');
    setShowCopyModal(true);
  };

  const searchByCode = async () => {
    if (!shareCode.trim()) return;
    const { data, error } = await supabase
      .from('published_routes')
      .select('*, published_books(title, position)')
      .eq('share_code', shareCode.trim())
      .single();
    if (error || !data) {
      alert('ルートが見つかりませんでした');
      return;
    }
    setShareResult(data);
  };

  const copyRoute = async () => {
    if (!userId || !selectedRoute) return;
    setCopyingId(selectedRoute.id);
    setShowCopyModal(false);
    const sortedBooks = (selectedRoute.published_books || []).sort((a, b) => a.position - b.position);
    const { data: existingBooks } = await supabase.from('my_books').select('position')
      .eq('user_identifier', userId).eq('route_name', copyTarget)
      .order('position', { ascending: false }).limit(1);
    const startPosition = existingBooks?.length > 0 ? existingBooks[0].position + 1 : 0;
    const newBooks = sortedBooks.map((b, i) => ({
      user_identifier: userId, title: b.title, status: '未着手',
      pomodoros: 0, position: startPosition + i, local_image_uri: null, route_name: copyTarget
    }));
    const { error } = await supabase.from('my_books').insert(newBooks);
    setCopyingId(null);
    if (error) alert('コピーに失敗しました');
    else alert(`「${selectedRoute.title}」を\n「${copyTarget}」にコピーしました！`);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      <Text style={[styles.header, { color: theme.text }]}>🔍 ルートを探す</Text>

      <TextInput
        style={[styles.searchBar, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
        placeholder="東大・基本情報・TOEICなど"
        placeholderTextColor={theme.subText}
        value={query}
        onChangeText={setQuery}
      />

      {/* シェアコード検索 */}
      <View style={styles.shareCodeRow}>
        <TextInput
          style={[styles.shareCodeInput, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
          placeholder="シェアコードを入力（例：AB12CD）"
          placeholderTextColor={theme.subText}
          value={shareCode}
          onChangeText={v => setShareCode(v.toUpperCase())}
          autoCapitalize="characters"
          maxLength={6}
        />
        <TouchableOpacity style={styles.shareCodeBtn} onPress={searchByCode}>
          <Text style={styles.shareCodeBtnText}>検索</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filterRow}>
        {filters.map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, { backgroundColor: theme.card, borderColor: theme.border },
              filter === f && styles.filterBtnActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, { color: theme.subText }, filter === f && styles.filterTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={({ item }) => {
            const liked = likedIds.includes(item.id);
            const sortedBooks = (item.published_books || []).sort((a, b) => a.position - b.position);
            const isCopying = copyingId === item.id;
            return (
              <View style={[styles.card, { backgroundColor: theme.card }]}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderLeft}>
                    <TouchableOpacity onPress={() => { setSelectedRoute(item); setShowDetail(true); }}>
                      <Text style={[styles.cardTitle, { color: theme.text }]}>{item.title}</Text>
                    </TouchableOpacity>
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
                <View style={styles.statsRow}>
                  <Text style={[styles.statItem, { color: theme.subText }]}>📅 {item.study_days}日</Text>
                  <Text style={[styles.statItem, { color: theme.subText }]}>🍅 {item.total_pomodoros}ポモ</Text>
                  <Text style={[styles.statItem, { color: theme.subText }]}>／日 {item.avg_daily}</Text>
                </View>
                <View style={styles.cardFooter}>
                  <Text style={[styles.author, { color: theme.subText }]}>@{item.author}</Text>
                  <View style={styles.footerRight}>
                    <TouchableOpacity
                      style={[styles.copyBtn, isCopying && styles.copyBtnDisabled]}
                      onPress={() => openCopyModal(item)} disabled={isCopying}
                    >
                      <Text style={styles.copyBtnText}>{isCopying ? 'コピー中...' : 'このルートを使う'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.likeBtn} onPress={() => toggleLike(item)}>
                      <Text style={styles.likeText}>{liked ? '❤️' : '🤍'} {item.likes_count}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={<Text style={[styles.empty, { color: theme.subText }]}>該当するルートがありません</Text>}
        />
      )}

      {/* ルート詳細モーダル */}
      <Modal visible={showDetail} animationType="slide">
        {selectedRoute && !showCopyModal && (
          <RouteDetailScreen
            route={selectedRoute}
            onClose={() => { setShowDetail(false); setSelectedRoute(null); }}
          />
        )}
      </Modal>

      {/* コピー先選択モーダル */}
      <Modal visible={showCopyModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>📋 コピー先を選択</Text>
            <Text style={[styles.modalSub, { color: theme.subText }]}>「{selectedRoute?.title}」</Text>
            <ScrollView style={styles.routeList}>
              {myRoutes.map(r => (
                <TouchableOpacity
                  key={r}
                  style={[styles.routeOption, { backgroundColor: theme.inputBg, borderColor: theme.border },
                    copyTarget === r && styles.routeOptionActive]}
                  onPress={() => setCopyTarget(r)}
                >
                  <Text style={[styles.routeOptionText, { color: theme.text },
                    copyTarget === r && styles.routeOptionTextActive]}>
                    {copyTarget === r ? '✓ ' : ''}{r}
                  </Text>
                </TouchableOpacity>
              ))}
              <View style={styles.newRouteRow}>
                <TextInput
                  style={[styles.newRouteInput, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
                  placeholder="新しいルート名を入力"
                  placeholderTextColor={theme.subText}
                  value={newCopyRouteName}
                  onChangeText={setNewCopyRouteName}
                />
                <TouchableOpacity
                  style={styles.newRouteAddBtn}
                  onPress={() => {
                    if (!newCopyRouteName.trim()) return;
                    if (!myRoutes.includes(newCopyRouteName.trim())) {
                      setMyRoutes([...myRoutes, newCopyRouteName.trim()]);
                    }
                    setCopyTarget(newCopyRouteName.trim());
                    setNewCopyRouteName('');
                  }}
                >
                  <Text style={styles.newRouteAddBtnText}>追加</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowCopyModal(false)}>
                <Text style={styles.cancelBtnText}>キャンセル</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.doneBtn} onPress={copyRoute}>
                <Text style={styles.doneBtnText}>コピーする</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* シェアコード検索結果モーダル */}
      <Modal visible={!!shareResult} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>🔗 ルートが見つかりました</Text>
            <Text style={[styles.modalSub, { color: theme.subText }]}>{shareResult?.title}</Text>
            <Text style={[styles.modalSub, { color: theme.subText }]}>🎯 {shareResult?.target}</Text>
            <View style={{ marginBottom: 16 }}>
              {(shareResult?.published_books || [])
                .sort((a, b) => a.position - b.position)
                .map((b, i) => (
                  <Text key={i} style={[styles.bookItem, { color: theme.subText }]}>📖 {b.title}</Text>
                ))
              }
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShareResult(null); setShareCode(''); }}>
                <Text style={styles.cancelBtnText}>閉じる</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.doneBtn} onPress={() => {
                openCopyModal(shareResult);
                setShareResult(null);
              }}>
                <Text style={styles.doneBtnText}>このルートを使う</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  searchBar: { borderRadius: 12, padding: 12, fontSize: 15, borderWidth: 1, marginBottom: 12 },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  filterBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  filterBtnActive: { backgroundColor: '#5C6BC0', borderColor: '#5C6BC0' },
  filterText: { fontSize: 13 },
  filterTextActive: { color: '#fff', fontWeight: 'bold' },
  card: { borderRadius: 16, padding: 16, marginBottom: 12, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  cardHeaderLeft: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 2 },
  cardTarget: { fontSize: 13 },
  passedBadge: { backgroundColor: '#E8F5E9', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start' },
  passedText: { color: '#4CAF50', fontSize: 12, fontWeight: 'bold' },
  bookList: { marginBottom: 10 },
  bookItem: { fontSize: 13, marginBottom: 2 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  statItem: { fontSize: 12 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  author: { fontSize: 12 },
  footerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  copyBtn: { backgroundColor: '#5C6BC0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  copyBtnDisabled: { backgroundColor: '#aaa' },
  copyBtnText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  likeBtn: { padding: 4 },
  likeText: { fontSize: 15 },
  empty: { textAlign: 'center', marginTop: 60 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  modalBox: { borderRadius: 20, padding: 24 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 4 },
  modalSub: { fontSize: 14, textAlign: 'center', marginBottom: 16 },
  routeList: { maxHeight: 200, marginBottom: 16 },
  routeOption: { padding: 14, borderRadius: 10, marginBottom: 8, borderWidth: 1 },
  routeOptionActive: { backgroundColor: '#EEF0FF', borderColor: '#5C6BC0' },
  routeOptionText: { fontSize: 15 },
  routeOptionTextActive: { color: '#5C6BC0', fontWeight: 'bold' },
  newRouteRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  newRouteInput: { flex: 1, borderRadius: 8, padding: 10, fontSize: 14, borderWidth: 1 },
  newRouteAddBtn: { backgroundColor: '#5C6BC0', borderRadius: 8, padding: 10, justifyContent: 'center' },
  newRouteAddBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  modalButtons: { flexDirection: 'row', gap: 8 },
  cancelBtn: { flex: 1, borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#ddd' },
  cancelBtnText: { fontSize: 16, color: '#666' },
  doneBtn: { flex: 1, backgroundColor: '#5C6BC0', borderRadius: 12, padding: 16, alignItems: 'center' },
  doneBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  shareCodeRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  shareCodeInput: { flex: 1, borderRadius: 12, padding: 12, fontSize: 15, borderWidth: 1 },
  shareCodeBtn: { backgroundColor: '#5C6BC0', borderRadius: 12, paddingHorizontal: 16, justifyContent: 'center' },
  shareCodeBtnText: { color: '#fff', fontWeight: 'bold' },
});