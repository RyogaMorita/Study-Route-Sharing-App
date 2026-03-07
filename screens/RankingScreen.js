import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  ScrollView, ActivityIndicator, TouchableOpacity, Modal
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useTheme } from '../lib/ThemeContext';

export default function RankingScreen() {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [rankings, setRankings] = useState([]);
  const [myRank, setMyRank] = useState(null);
  const [userId, setUserId] = useState(null);
  const [tab, setTab] = useState('weekly'); // weekly / total / streak
  const [showUserRoutes, setShowUserRoutes] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userRoutes, setUserRoutes] = useState([]);
  const [routesLoading, setRoutesLoading] = useState(false);
  const [monthlyBadges, setMonthlyBadges] = useState([]);

  useEffect(() => { initUser(); }, []);
  useEffect(() => { if (userId) fetchRanking(); }, [tab, userId]);

  const initUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user.id);
  };

  const fetchRanking = async () => {
    setLoading(true);

    if (tab === 'weekly' || tab === 'total') {
      const { data: logs } = await supabase
        .from('pomodoro_logs')
        .select('user_id, created_at, is_completed')
        .eq('is_completed', true);

      if (!logs) { setLoading(false); return; }

      // ユーザーごとに集計
      const now = new Date();
      const monday = new Date(now);
      monday.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1));
      monday.setHours(0, 0, 0, 0);

      const userPomos = {};
      logs.forEach(l => {
        const uid = l.user_id;
        if (!userPomos[uid]) userPomos[uid] = { total: 0, weekly: 0 };
        userPomos[uid].total++;
        if (new Date(l.created_at) >= monday) userPomos[uid].weekly++;
      });

      // プロフィール取得
      const userIds = Object.keys(userPomos);
      if (userIds.length === 0) { setLoading(false); return; }
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('user_id, username')
        .in('user_id', userIds);

      const ranked = (profiles || [])
        .map(p => ({
          ...p,
          total: userPomos[p.user_id]?.total || 0,
          weekly: userPomos[p.user_id]?.weekly || 0,
        }))
        .sort((a, b) => b[tab === 'weekly' ? 'weekly' : 'total'] - a[tab === 'weekly' ? 'weekly' : 'total'])
        .slice(0, 20);

      setRankings(ranked);

      const myIndex = ranked.findIndex(r => r.user_id === userId);
      setMyRank(myIndex >= 0 ? { rank: myIndex + 1, ...ranked[myIndex] } : null);

    } else if (tab === 'streak') {
      const { data: logs } = await supabase
        .from('pomodoro_logs')
        .select('user_id, created_at')
        .eq('is_completed', true);

      if (!logs) { setLoading(false); return; }

      const userDates = {};
      logs.forEach(l => {
        const uid = l.user_id;
        if (!userDates[uid]) userDates[uid] = new Set();
        userDates[uid].add(new Date(l.created_at).toLocaleDateString('ja-JP'));
      });

      const userStreaks = {};
      Object.entries(userDates).forEach(([uid, datesSet]) => {
        const dates = [...datesSet].sort((a, b) => new Date(b) - new Date(a));
        const today = new Date().toLocaleDateString('ja-JP');
        const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('ja-JP');
        if (dates[0] !== today && dates[0] !== yesterday) {
          userStreaks[uid] = 0;
          return;
        }
        let streak = 1;
        for (let i = 1; i < dates.length; i++) {
          const prev = new Date(dates[i - 1]);
          const curr = new Date(dates[i]);
          if (Math.round((prev - curr) / 86400000) === 1) streak++;
          else break;
        }
        userStreaks[uid] = streak;
      });

      const userIds = Object.keys(userStreaks);
      if (userIds.length === 0) { setLoading(false); return; }
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('user_id, username')
        .in('user_id', userIds);

      const ranked = (profiles || [])
        .map(p => ({ ...p, streak: userStreaks[p.user_id] || 0 }))
        .sort((a, b) => b.streak - a.streak)
        .slice(0, 20);

      setRankings(ranked);
      const myIndex = ranked.findIndex(r => r.user_id === userId);
      setMyRank(myIndex >= 0 ? { rank: myIndex + 1, ...ranked[myIndex] } : null);
    }

    // 月次バッジ取得
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const { data: monthlyBadgesData } = await supabase
      .from('monthly_badges')
      .select('user_id, rank, month')
      .eq('month', month);

    setMonthlyBadges(monthlyBadgesData || []);

    setLoading(false);
  };

  const getRankEmoji = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `${rank}`;
  };

  const openUserRoutes = async (user) => {
    setSelectedUser(user);
    setShowUserRoutes(true);
    setRoutesLoading(true);
    const { data } = await supabase
      .from('published_routes')
      .select('*, published_books(title, position)')
      .eq('user_identifier', user.user_id)
      .order('likes_count', { ascending: false });
    if (data) setUserRoutes(data);
    setRoutesLoading(false);
  };

  const getMonthlyBadge = (uid) => {
    const badge = monthlyBadges.find(b => b.user_id === uid);
    if (!badge) return null;
    if (badge.rank === 1) return '🥇';
    if (badge.rank <= 10) return '🏅';
    if (badge.rank <= 100) return '🎖️';
    if (badge.rank <= 1000) return '⭐';
    return null;
  };

  const getValue = (item) => {
    if (tab === 'weekly') return `${item.weekly}ポモ`;
    if (tab === 'total') return `${item.total}ポモ`;
    if (tab === 'streak') return `${item.streak}日`;
    return '';
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={[styles.header, { color: theme.text }]}>🏆 ランキング</Text>

        {/* タブ */}
        <View style={styles.tabRow}>
          {[
            { key: 'weekly', label: '今週' },
            { key: 'total', label: '累計' },
            { key: 'streak', label: 'ストリーク' },
          ].map(t => (
            <TouchableOpacity
              key={t.key}
              style={[styles.tabBtn, { backgroundColor: theme.card },
                tab === t.key && { backgroundColor: theme.primary }]}
              onPress={() => setTab(t.key)}
            >
              <Text style={[styles.tabText, { color: tab === t.key ? '#fff' : theme.subText }]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 自分の順位 */}
        {myRank && (
          <View style={[styles.myRankCard, { backgroundColor: theme.primary }]}>
            <Text style={styles.myRankLabel}>あなたの順位</Text>
            <Text style={styles.myRankNum}>{getRankEmoji(myRank.rank)} {myRank.rank}位</Text>
            <Text style={styles.myRankValue}>{getValue(myRank)}</Text>
          </View>
        )}

        {/* トップ3 */}
        {!loading && rankings.length >= 3 && (
          <View style={styles.top3Row}>
            {/* 2位 */}
            <View style={styles.top3Item}>
              <Text style={styles.top3Emoji}>🥈</Text>
              <View style={[styles.top3Avatar, { backgroundColor: '#9E9E9E' }]}>
                <Text style={styles.top3AvatarText}>
                  {rankings[1]?.username?.[0]?.toUpperCase() || '?'}
                </Text>
              </View>
              <Text style={[styles.top3Name, { color: theme.text }]} numberOfLines={1}>
                @{rankings[1]?.username}
              </Text>
              <Text style={[styles.top3Value, { color: theme.subText }]}>{getValue(rankings[1])}</Text>
            </View>

            {/* 1位 */}
            <View style={[styles.top3Item, styles.top1Item]}>
              <Text style={styles.top3Emoji}>🥇</Text>
              <View style={[styles.top3Avatar, styles.top1Avatar, { backgroundColor: '#FFD700' }]}>
                <Text style={styles.top3AvatarText}>
                  {rankings[0]?.username?.[0]?.toUpperCase() || '?'}
                </Text>
              </View>
              <Text style={[styles.top3Name, { color: theme.text }]} numberOfLines={1}>
                @{rankings[0]?.username}
              </Text>
              <Text style={[styles.top3Value, { color: theme.subText }]}>{getValue(rankings[0])}</Text>
            </View>

            {/* 3位 */}
            <View style={styles.top3Item}>
              <Text style={styles.top3Emoji}>🥉</Text>
              <View style={[styles.top3Avatar, { backgroundColor: '#CD7F32' }]}>
                <Text style={styles.top3AvatarText}>
                  {rankings[2]?.username?.[0]?.toUpperCase() || '?'}
                </Text>
              </View>
              <Text style={[styles.top3Name, { color: theme.text }]} numberOfLines={1}>
                @{rankings[2]?.username}
              </Text>
              <Text style={[styles.top3Value, { color: theme.subText }]}>{getValue(rankings[2])}</Text>
            </View>
          </View>
        )}

        {/* ランキングリスト */}
        {loading ? (
          <ActivityIndicator color={theme.primary} style={{ marginTop: 40 }} />
        ) : rankings.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={[styles.empty, { color: theme.subText }]}>まだデータがありません</Text>
          </View>
        ) : (
          <View style={[styles.listCard, { backgroundColor: theme.card }]}>
            {rankings.map((item, i) => {
              const isMe = item.user_id === userId;
              return (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.rankRow,
                    { borderBottomColor: theme.border },
                    isMe && { backgroundColor: theme.inputBg }
                  ]}
                  onPress={() => openUserRoutes(item)}
                >
                  <Text style={[styles.rankNum, {
                    color: i === 0 ? '#FFD700' : i === 1 ? '#9E9E9E' : i === 2 ? '#CD7F32' : theme.subText
                  }]}>
                    {getRankEmoji(i + 1)}
                  </Text>
                  <View style={[styles.rankAvatar, { backgroundColor: isMe ? theme.primary : theme.border }]}>
                    <Text style={styles.rankAvatarText}>
                      {item.username?.[0]?.toUpperCase() || '?'}
                    </Text>
                  </View>
                  <Text style={[styles.rankName, { color: theme.text }]} numberOfLines={1}>
                    @{item.username} {isMe ? '（あなた）' : ''}
                    {getMonthlyBadge(item.user_id) ? ` ${getMonthlyBadge(item.user_id)}` : ''}
                  </Text>
                  <Text style={[styles.rankValue, { color: theme.primary }]}>{getValue(item)}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* ユーザーのルート一覧モーダル */}
      <Modal visible={showUserRoutes} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              @{selectedUser?.username}のルート
            </Text>
            {routesLoading ? (
              <ActivityIndicator color={theme.primary} style={{ marginVertical: 20 }} />
            ) : userRoutes.length === 0 ? (
              <Text style={[styles.empty, { color: theme.subText, textAlign: 'center', marginVertical: 20 }]}>
                公開ルートがありません
              </Text>
            ) : (
              <ScrollView style={{ maxHeight: 400 }}>
                {userRoutes.map((route, i) => (
                  <View key={i} style={[styles.routeCard, { backgroundColor: theme.inputBg }]}>
                    <View style={styles.routeCardHeader}>
                      <Text style={[styles.routeCardTitle, { color: theme.text }]}>{route.title}</Text>
                      {route.is_passed && (
                        <View style={styles.passedBadge}>
                          <Text style={styles.passedText}>合格済</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.routeCardTarget, { color: theme.subText }]}>🎯 {route.target}</Text>
                    {(route.published_books || [])
                      .sort((a, b) => a.position - b.position)
                      .map((b, j) => (
                        <Text key={j} style={[styles.routeBook, { color: theme.subText }]}>📖 {b.title}</Text>
                      ))
                    }
                    <View style={styles.routeStats}>
                      <Text style={[styles.routeStat, { color: theme.subText }]}>❤️ {route.likes_count}</Text>
                      <Text style={[styles.routeStat, { color: theme.subText }]}>🍅 {route.total_pomodoros}ポモ</Text>
                      <Text style={[styles.routeStat, { color: theme.subText }]}>📅 {route.study_days}日</Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => { setShowUserRoutes(false); setUserRoutes([]); }}
            >
              <Text style={styles.closeBtnText}>閉じる</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  tabBtn: { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center' },
  tabText: { fontWeight: 'bold', fontSize: 13 },
  myRankCard: { borderRadius: 16, padding: 16, alignItems: 'center', marginBottom: 16 },
  myRankLabel: { color: '#fff', fontSize: 13, opacity: 0.8, marginBottom: 4 },
  myRankNum: { color: '#fff', fontSize: 28, fontWeight: 'bold', marginBottom: 4 },
  myRankValue: { color: '#fff', fontSize: 16 },
  top3Row: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', marginBottom: 16, gap: 8 },
  top3Item: { alignItems: 'center', flex: 1 },
  top1Item: { marginBottom: 16 },
  top3Emoji: { fontSize: 28, marginBottom: 4 },
  top3Avatar: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  top1Avatar: { width: 64, height: 64, borderRadius: 32 },
  top3AvatarText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  top3Name: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
  top3Value: { fontSize: 11, marginTop: 2 },
  listCard: { borderRadius: 16, overflow: 'hidden', marginBottom: 32 },
  rankRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, gap: 10 },
  rankNum: { width: 30, fontSize: 16, fontWeight: 'bold', textAlign: 'center' },
  rankAvatar: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  rankAvatarText: { color: '#fff', fontWeight: 'bold' },
  rankName: { flex: 1, fontSize: 14 },
  rankValue: { fontSize: 14, fontWeight: 'bold' },
  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  empty: { fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  modalBox: { borderRadius: 20, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 16 },
  routeCard: { borderRadius: 12, padding: 12, marginBottom: 10 },
  routeCardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  routeCardTitle: { fontSize: 15, fontWeight: 'bold', flex: 1 },
  passedBadge: { backgroundColor: '#E8F5E9', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  passedText: { color: '#4CAF50', fontSize: 11, fontWeight: 'bold' },
  routeCardTarget: { fontSize: 12, marginBottom: 6 },
  routeBook: { fontSize: 12, marginBottom: 2 },
  routeStats: { flexDirection: 'row', gap: 12, marginTop: 6 },
  routeStat: { fontSize: 11 },
  closeBtn: { backgroundColor: '#5C6BC0', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 12 },
  closeBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
});