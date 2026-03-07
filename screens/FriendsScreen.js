import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, ActivityIndicator,
  TextInput, Modal
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useTheme } from '../lib/ThemeContext';

export default function FriendsScreen() {
  const { theme } = useTheme();
  const [userId, setUserId] = useState(null);
  const [myUsername, setMyUsername] = useState('');
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchUsername, setSearchUsername] = useState('');
  const [showCompare, setShowCompare] = useState(false);
  const [compareData, setCompareData] = useState(null);
  const [comparing, setComparing] = useState(false);
  const [tab, setTab] = useState('friends'); // friends / requests
  const [friendRankings, setFriendRankings] = useState([]);
  const [rankTab, setRankTab] = useState('weekly');
  const [rankLoading, setRankLoading] = useState(false);

  useEffect(() => { initUser(); }, []);

  const initUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user.id);
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('username')
      .eq('user_id', user.id)
      .single();
    if (profile) setMyUsername(profile.username);
    fetchFriends(user.id);
    fetchRequests(user.id);
  };

  const fetchFriendRankings = async (uid, friendList) => {
    setRankLoading(true);
    const allIds = [...friendList.map(f => f.user_id), uid];

    const { data: logs } = await supabase
      .from('pomodoro_logs')
      .select('user_id, created_at, is_completed, duration_minutes')
      .eq('is_completed', true)
      .in('user_id', allIds);

    if (!logs) { setRankLoading(false); return; }

    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1));
    monday.setHours(0, 0, 0, 0);

    const stats = {};
    allIds.forEach(id => { stats[id] = { weekly: 0, total: 0, weeklyMins: 0 }; });

    logs.forEach(l => {
      if (!stats[l.user_id]) return;
      stats[l.user_id].total++;
      if (new Date(l.created_at) >= monday) {
        stats[l.user_id].weekly++;
        stats[l.user_id].weeklyMins += (l.duration_minutes || 25);
      }
    });

    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('user_id, username')
      .in('user_id', allIds);

    const ranked = (profiles || []).map(p => ({
      ...p,
      isMe: p.user_id === uid,
      weekly: stats[p.user_id]?.weekly || 0,
      total: stats[p.user_id]?.total || 0,
      weeklyHours: Math.round((stats[p.user_id]?.weeklyMins || 0) / 60 * 10) / 10,
    }));

    setFriendRankings(ranked);
    setRankLoading(false);
  };

  const fetchFriends = async (uid) => {
    setLoading(true);
    const { data } = await supabase
      .from('friends')
      .select('friend_id')
      .eq('user_id', uid);
    if (data) {
      const friendIds = data.map(f => f.friend_id);
      if (friendIds.length > 0) {
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('user_id, username')
          .in('user_id', friendIds);
        if (profiles) {
          setFriends(profiles);
          fetchFriendRankings(uid, profiles);
        }
      } else {
        fetchFriendRankings(uid, []);
      }
    }
    setLoading(false);
  };

  const fetchRequests = async (uid) => {
    const { data } = await supabase
      .from('friend_requests')
      .select('*')
      .eq('to_username', '')
      .eq('status', 'pending');

    // 自分のusernameへのリクエストを取得
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('username')
      .eq('user_id', uid)
      .single();

    if (profile) {
      const { data: reqs } = await supabase
        .from('friend_requests')
        .select('*')
        .eq('to_username', profile.username)
        .eq('status', 'pending');
      if (reqs) setRequests(reqs);
    }
  };

  const sendRequest = async () => {
    if (!searchUsername.trim()) return;
    if (searchUsername.trim() === myUsername) {
      alert('自分自身にはフレンド申請できません');
      return;
    }

    // ユーザーが存在するか確認
    const { data: targetProfile } = await supabase
      .from('user_profiles')
      .select('user_id, username')
      .eq('username', searchUsername.trim())
      .single();

    if (!targetProfile) {
      alert('ユーザーが見つかりませんでした');
      return;
    }

    // すでにフレンドか確認
    const { data: existing } = await supabase
      .from('friends')
      .select('id')
      .eq('user_id', userId)
      .eq('friend_id', targetProfile.user_id)
      .single();

    if (existing) {
      alert('すでにフレンドです');
      return;
    }

    // 申請を送信
    const { error } = await supabase.from('friend_requests').insert({
      from_user_id: userId,
      to_username: searchUsername.trim(),
      status: 'pending'
    });

    if (error) { alert('申請に失敗しました'); return; }
    alert(`${searchUsername}さんにフレンド申請を送りました！`);
    setSearchUsername('');
  };

  const acceptRequest = async (req) => {
    // リクエストを承認
    await supabase.from('friend_requests')
      .update({ status: 'accepted' })
      .eq('id', req.id);

    // 双方向でフレンド登録
    await supabase.from('friends').insert([
      { user_id: userId, friend_id: req.from_user_id },
      { user_id: req.from_user_id, friend_id: userId }
    ]);

    setRequests(requests.filter(r => r.id !== req.id));
    fetchFriends(userId);
    alert('フレンドになりました！🎉');
  };

  const rejectRequest = async (req) => {
    await supabase.from('friend_requests')
      .update({ status: 'rejected' })
      .eq('id', req.id);
    setRequests(requests.filter(r => r.id !== req.id));
  };

  const compareWithFriend = async (friend) => {
    setComparing(true);
    setShowCompare(true);

    const [myBooks, friendBooks, myLogs, friendLogs] = await Promise.all([
      supabase.from('my_books').select('*').eq('user_identifier', userId),
      supabase.from('my_books').select('*').eq('user_identifier', friend.user_id),
      supabase.from('pomodoro_logs').select('*').eq('user_id', userId),
      supabase.from('pomodoro_logs').select('*').eq('user_id', friend.user_id),
    ]);

    const myTotal = myBooks.data?.reduce((s, b) => s + b.pomodoros, 0) || 0;
    const friendTotal = friendBooks.data?.reduce((s, b) => s + b.pomodoros, 0) || 0;
    const myCompleted = myBooks.data?.filter(b => b.status === '完了').length || 0;
    const friendCompleted = friendBooks.data?.filter(b => b.status === '完了').length || 0;
    const myStreak = calcStreak(myLogs.data || []);
    const friendStreak = calcStreak(friendLogs.data || []);

    setCompareData({
      friend,
      my: {
        totalPomos: myTotal,
        completed: myCompleted,
        total: myBooks.data?.length || 0,
        streak: myStreak,
        hours: Math.round(myTotal * 25 / 60)
      },
      friend: {
        totalPomos: friendTotal,
        completed: friendCompleted,
        total: friendBooks.data?.length || 0,
        streak: friendStreak,
        hours: Math.round(friendTotal * 25 / 60)
      },
      friendName: friend.username
    });
    setComparing(false);
  };

  const calcStreak = (logs) => {
    if (logs.length === 0) return 0;
    const dates = [...new Set(logs.map(l =>
      new Date(l.created_at).toLocaleDateString('ja-JP')
    ))].sort((a, b) => new Date(b) - new Date(a));
    const today = new Date().toLocaleDateString('ja-JP');
    const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('ja-JP');
    if (dates[0] !== today && dates[0] !== yesterday) return 0;
    let streak = 1;
    for (let i = 1; i < dates.length; i++) {
      const prev = new Date(dates[i - 1]);
      const curr = new Date(dates[i]);
      if (Math.round((prev - curr) / 86400000) === 1) streak++;
      else break;
    }
    return streak;
  };

  const CompareBar = ({ label, myVal, friendVal, unit, friendName }) => {
    const max = Math.max(myVal, friendVal, 1);
    const myWidth = (myVal / max) * 100;
    const friendWidth = (friendVal / max) * 100;
    const iWin = myVal >= friendVal;
    return (
      <View style={styles.compareItem}>
        <Text style={[styles.compareLabel, { color: theme.text }]}>{label}</Text>
        <View style={styles.compareRow}>
          <Text style={[styles.compareMe, { color: iWin ? '#5C6BC0' : theme.subText }]}>
            {iWin ? '👑 ' : ''}{myVal}{unit}
          </Text>
          <View style={styles.compareBars}>
            <View style={styles.barRowLeft}>
              <View style={[styles.barLeft, { width: `${myWidth}%`, backgroundColor: '#5C6BC0' }]} />
            </View>
            <View style={styles.barRowRight}>
              <View style={[styles.barRight, { width: `${friendWidth}%`, backgroundColor: '#FF7043' }]} />
            </View>
          </View>
          <Text style={[styles.compareFriend, { color: !iWin ? '#FF7043' : theme.subText }]}>
            {!iWin ? '👑 ' : ''}{friendVal}{unit}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={[styles.header, { color: theme.text }]}>👥 フレンド</Text>

        {/* 自分のユーザー名 */}
        <View style={[styles.myCard, { backgroundColor: theme.card }]}>
          <Text style={[styles.myLabel, { color: theme.subText }]}>あなたのユーザー名</Text>
          <Text style={[styles.myUsername, { color: theme.primary }]}>@{myUsername}</Text>
          <Text style={[styles.myHint, { color: theme.subText }]}>友達にこのIDを教えよう</Text>
        </View>

        {/* フレンド申請 */}
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>➕ フレンド申請</Text>
          <View style={styles.searchRow}>
            <TextInput
              style={[styles.searchInput, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
              placeholder="ユーザー名を入力"
              placeholderTextColor={theme.subText}
              value={searchUsername}
              onChangeText={setSearchUsername}
              autoCapitalize="none"
            />
            <TouchableOpacity style={styles.sendBtn} onPress={sendRequest}>
              <Text style={styles.sendBtnText}>申請</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* タブ */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tabBtn, { backgroundColor: theme.card },
              tab === 'friends' && { backgroundColor: theme.primary }]}
            onPress={() => setTab('friends')}
          >
            <Text style={[styles.tabText, { color: tab === 'friends' ? '#fff' : theme.subText }]}>
              フレンド {friends.length}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, { backgroundColor: theme.card },
              tab === 'ranking' && { backgroundColor: theme.primary }]}
            onPress={() => setTab('ranking')}
          >
            <Text style={[styles.tabText, { color: tab === 'ranking' ? '#fff' : theme.subText }]}>
              🏆 ランキング
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, { backgroundColor: theme.card },
              tab === 'requests' && { backgroundColor: theme.primary }]}
            onPress={() => setTab('requests')}
          >
            <Text style={[styles.tabText, { color: tab === 'requests' ? '#fff' : theme.subText }]}>
              申請 {requests.length > 0 ? `🔴${requests.length}` : '0'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* フレンドリスト */}
        {tab === 'friends' && (
          <View>
            {loading ? (
              <ActivityIndicator color={theme.primary} style={{ marginTop: 20 }} />
            ) : friends.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>👥</Text>
                <Text style={[styles.empty, { color: theme.subText }]}>まだフレンドがいません</Text>
                <Text style={[styles.emptyHint, { color: theme.subText }]}>ユーザー名で申請しよう</Text>
              </View>
            ) : (
              friends.map((friend, i) => (
                <View key={i} style={[styles.friendCard, { backgroundColor: theme.card }]}>
                  <View style={styles.friendLeft}>
                    <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
                      <Text style={styles.avatarText}>{friend.username[0].toUpperCase()}</Text>
                    </View>
                    <Text style={[styles.friendName, { color: theme.text }]}>@{friend.username}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.compareBtn}
                    onPress={() => compareWithFriend(friend)}
                  >
                    <Text style={styles.compareBtnText}>📊 比較</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        )}

        {/* フレンドランキング */}
        {tab === 'ranking' && (
          <View>
            <View style={styles.rankTabRow}>
              {[
                { key: 'weekly', label: '今週のポモ' },
                { key: 'total', label: '累計ポモ' },
                { key: 'weeklyHours', label: '今週の時間' },
              ].map(t => (
                <TouchableOpacity
                  key={t.key}
                  style={[styles.rankTabBtn, { backgroundColor: theme.card },
                    rankTab === t.key && { backgroundColor: theme.primary }]}
                  onPress={() => setRankTab(t.key)}
                >
                  <Text style={[styles.rankTabText, { color: rankTab === t.key ? '#fff' : theme.subText }]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {rankLoading ? (
              <ActivityIndicator color={theme.primary} style={{ marginTop: 20 }} />
            ) : friendRankings.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>👥</Text>
                <Text style={[styles.empty, { color: theme.subText }]}>フレンドを追加するとランキングが表示されます</Text>
              </View>
            ) : (
              <View style={[styles.rankList, { backgroundColor: theme.card }]}>
                {[...friendRankings]
                  .sort((a, b) => b[rankTab] - a[rankTab])
                  .map((item, i) => {
                    const getRankEmoji = (r) => {
                      if (r === 0) return '🥇';
                      if (r === 1) return '🥈';
                      if (r === 2) return '🥉';
                      return `${r + 1}`;
                    };
                    const getValue = () => {
                      if (rankTab === 'weekly') return `${item.weekly}ポモ`;
                      if (rankTab === 'total') return `${item.total}ポモ`;
                      if (rankTab === 'weeklyHours') return `${item.weeklyHours}h`;
                      return '';
                    };
                    return (
                      <View key={i} style={[
                        styles.rankRow,
                        { borderBottomColor: theme.border },
                        item.isMe && { backgroundColor: theme.inputBg }
                      ]}>
                        <Text style={[styles.rankNum, {
                          color: i === 0 ? '#FFD700' : i === 1 ? '#9E9E9E' : i === 2 ? '#CD7F32' : theme.subText
                        }]}>
                          {getRankEmoji(i)}
                        </Text>
                        <View style={[styles.rankAvatar, {
                          backgroundColor: item.isMe ? theme.primary : theme.border
                        }]}>
                          <Text style={styles.rankAvatarText}>
                            {item.username?.[0]?.toUpperCase() || '?'}
                          </Text>
                        </View>
                        <Text style={[styles.rankName, { color: theme.text }]} numberOfLines={1}>
                          @{item.username} {item.isMe ? '（あなた）' : ''}
                        </Text>
                        <Text style={[styles.rankValue, { color: theme.primary }]}>{getValue()}</Text>
                      </View>
                    );
                  })
                }
              </View>
            )}
          </View>
        )}

        {/* 申請リスト */}
        {tab === 'requests' && (
          <View>
            {requests.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>📭</Text>
                <Text style={[styles.empty, { color: theme.subText }]}>申請はありません</Text>
              </View>
            ) : (
              requests.map((req, i) => (
                <View key={i} style={[styles.requestCard, { backgroundColor: theme.card }]}>
                  <View style={styles.requestLeft}>
                    <Text style={[styles.requestFrom, { color: theme.text }]}>
                      @{req.from_user_id}からの申請
                    </Text>
                  </View>
                  <View style={styles.requestBtns}>
                    <TouchableOpacity style={styles.acceptBtn} onPress={() => acceptRequest(req)}>
                      <Text style={styles.acceptBtnText}>承認</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.rejectBtn} onPress={() => rejectRequest(req)}>
                      <Text style={styles.rejectBtnText}>拒否</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* 比較モーダル */}
      <Modal visible={showCompare} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>📊 ルート比較</Text>
            {comparing ? (
              <ActivityIndicator color={theme.primary} style={{ marginVertical: 40 }} />
            ) : compareData && (
              <ScrollView>
                {/* 凡例 */}
                <View style={styles.legend}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#5C6BC0' }]} />
                    <Text style={[styles.legendText, { color: theme.text }]}>あなた</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#FF7043' }]} />
                    <Text style={[styles.legendText, { color: theme.text }]}>@{compareData.friendName}</Text>
                  </View>
                </View>

                <CompareBar
                  label="🍅 総ポモドーロ"
                  myVal={compareData.my.totalPomos}
                  friendVal={compareData.friend.totalPomos}
                  unit="回"
                  friendName={compareData.friendName}
                />
                <CompareBar
                  label="⏱️ 総学習時間"
                  myVal={compareData.my.hours}
                  friendVal={compareData.friend.hours}
                  unit="h"
                  friendName={compareData.friendName}
                />
                <CompareBar
                  label="✅ 完了教材"
                  myVal={compareData.my.completed}
                  friendVal={compareData.friend.completed}
                  unit="冊"
                  friendName={compareData.friendName}
                />
                <CompareBar
                  label="🔥 ストリーク"
                  myVal={compareData.my.streak}
                  friendVal={compareData.friend.streak}
                  unit="日"
                  friendName={compareData.friendName}
                />
              </ScrollView>
            )}
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => { setShowCompare(false); setCompareData(null); }}
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
  myCard: { borderRadius: 16, padding: 16, marginBottom: 16, alignItems: 'center', elevation: 2 },
  myLabel: { fontSize: 13, marginBottom: 4 },
  myUsername: { fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
  myHint: { fontSize: 12 },
  section: { borderRadius: 16, padding: 16, marginBottom: 16, elevation: 2 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  searchRow: { flexDirection: 'row', gap: 8 },
  searchInput: { flex: 1, borderRadius: 10, padding: 12, fontSize: 15, borderWidth: 1 },
  sendBtn: { backgroundColor: '#5C6BC0', borderRadius: 10, paddingHorizontal: 16, justifyContent: 'center' },
  sendBtnText: { color: '#fff', fontWeight: 'bold' },
  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  tabBtn: { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center' },
  tabText: { fontWeight: 'bold', fontSize: 14 },
  friendCard: { borderRadius: 14, padding: 14, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 2 },
  friendLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  friendName: { fontSize: 15, fontWeight: '600' },
  compareBtn: { backgroundColor: '#EEF0FF', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  compareBtnText: { color: '#5C6BC0', fontWeight: 'bold', fontSize: 13 },
  requestCard: { borderRadius: 14, padding: 14, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 2 },
  requestLeft: { flex: 1 },
  requestFrom: { fontSize: 14, fontWeight: '600' },
  requestBtns: { flexDirection: 'row', gap: 8 },
  acceptBtn: { backgroundColor: '#E8F5E9', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  acceptBtnText: { color: '#4CAF50', fontWeight: 'bold' },
  rejectBtn: { backgroundColor: '#FFEBEE', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  rejectBtnText: { color: '#E53935', fontWeight: 'bold' },
  emptyContainer: { alignItems: 'center', marginTop: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  empty: { fontSize: 15, marginBottom: 4 },
  emptyHint: { fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  modalBox: { borderRadius: 20, padding: 24, maxHeight: '80%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 16 },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: 24, marginBottom: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
  legendText: { fontSize: 13 },
  compareItem: { marginBottom: 20 },
  compareLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  compareRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  compareMe: { width: 50, fontSize: 13, fontWeight: 'bold', textAlign: 'right' },
  compareFriend: { width: 50, fontSize: 13, fontWeight: 'bold' },
  compareBars: { flex: 1 },
  barRowLeft: { height: 10, backgroundColor: '#E0E0E0', borderRadius: 5, marginBottom: 2, flexDirection: 'row', justifyContent: 'flex-end' },
  barRowRight: { height: 10, backgroundColor: '#E0E0E0', borderRadius: 5 },
  barLeft: { height: 10, borderRadius: 5 },
  barRight: { height: 10, borderRadius: 5 },
  closeBtn: { backgroundColor: '#5C6BC0', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 16 },
  closeBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  rankTabRow: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  rankTabBtn: { flex: 1, borderRadius: 10, padding: 8, alignItems: 'center' },
  rankTabText: { fontSize: 11, fontWeight: 'bold' },
  rankList: { borderRadius: 16, overflow: 'hidden', marginBottom: 16 },
  rankRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, gap: 10 },
  rankNum: { width: 30, fontSize: 16, fontWeight: 'bold', textAlign: 'center' },
  rankAvatar: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  rankAvatarText: { color: '#fff', fontWeight: 'bold' },
  rankName: { flex: 1, fontSize: 14 },
  rankValue: { fontSize: 14, fontWeight: 'bold' },
});