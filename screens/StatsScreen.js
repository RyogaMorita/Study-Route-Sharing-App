import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  ScrollView, ActivityIndicator, TouchableOpacity, Modal
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useTheme } from '../lib/ThemeContext';
import ProfileEditScreen from './ProfileEditScreen';

export default function StatsScreen() {
  const { theme, isDark, toggleTheme } = useTheme();
  const [showProfile, setShowProfile] = useState(false);
  const [books, setBooks] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dailyGoal, setDailyGoal] = useState(8);

  useEffect(() => { initUser(); }, []);

  const initUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    fetchData(user.id);
  };

  const fetchData = async (uid) => {
    setLoading(true);
    const [booksRes, logsRes, profileRes] = await Promise.all([
      supabase.from('my_books').select('*').eq('user_identifier', uid),
      supabase.from('pomodoro_logs').select('*').eq('user_id', uid)
        .order('created_at', { ascending: false }),
      supabase.from('user_profiles').select('daily_pomo_goal').eq('user_id', uid).single()
    ]);
    if (!booksRes.error) setBooks(booksRes.data);
    if (!logsRes.error) setLogs(logsRes.data);
    if (!profileRes.error) setDailyGoal(profileRes.data?.daily_pomo_goal || 8);
    setLoading(false);
  };

  const totalPomodoros = books.reduce((s, b) => s + b.pomodoros, 0);

  const getStreak = () => {
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

  const getTodayPomos = () => {
    const today = new Date().toLocaleDateString('ja-JP');
    return logs.filter(l =>
      new Date(l.created_at).toLocaleDateString('ja-JP') === today &&
      l.is_completed === true
    ).length;
  };

  const getWeeklyData = () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const label = `${d.getMonth() + 1}/${d.getDate()}`;
      const dateStr = d.toLocaleDateString('ja-JP');
      const count = logs.filter(l =>
        new Date(l.created_at).toLocaleDateString('ja-JP') === dateStr
      ).length;
      days.push({ label, count });
    }
    return days;
  };

  const getReviewList = () => {
    const today = new Date().toISOString().split('T')[0];
    return books
      .filter(b => b.next_review_date && b.next_review_date <= today)
      .sort((a, b) => a.next_review_date.localeCompare(b.next_review_date));
  };

  const getFocusData = () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const label = `${d.getMonth() + 1}/${d.getDate()}`;
      const dateStr = d.toLocaleDateString('ja-JP');
      const dayLogs = logs.filter(l =>
        new Date(l.created_at).toLocaleDateString('ja-JP') === dateStr &&
        l.is_completed === true
      );
      const avgFocus = dayLogs.length > 0
        ? Math.round((dayLogs.reduce((s, l) => s + (l.focus_score || 0), 0) / dayLogs.length) * 10) / 10
        : null;
      const avgUnderstanding = dayLogs.length > 0
        ? Math.round((dayLogs.reduce((s, l) => s + (l.understanding_score || 0), 0) / dayLogs.length) * 10) / 10
        : null;
      days.push({ label, avgFocus, avgUnderstanding, count: dayLogs.length });
    }
    return days;
  };

  const getWeeklyReport = () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    monday.setHours(0, 0, 0, 0);

    const lastMonday = new Date(monday);
    lastMonday.setDate(monday.getDate() - 7);
    const lastSunday = new Date(monday);
    lastSunday.setDate(monday.getDate() - 1);

    const thisWeekLogs = logs.filter(l => new Date(l.created_at) >= monday);
    const lastWeekLogs = logs.filter(l => {
      const d = new Date(l.created_at);
      return d >= lastMonday && d <= lastSunday;
    });

    const thisPomos = thisWeekLogs.filter(l => l.is_completed).length;
    const lastPomos = lastWeekLogs.filter(l => l.is_completed).length;
    const thisHours = Math.round(thisPomos * 25 / 60 * 10) / 10;
    const lastHours = Math.round(lastPomos * 25 / 60 * 10) / 10;

    const thisAvgFocus = thisWeekLogs.length > 0
      ? Math.round(thisWeekLogs.reduce((s, l) => s + (l.focus_score || 0), 0) / thisWeekLogs.length * 10) / 10
      : 0;
    const lastAvgFocus = lastWeekLogs.length > 0
      ? Math.round(lastWeekLogs.reduce((s, l) => s + (l.focus_score || 0), 0) / lastWeekLogs.length * 10) / 10
      : 0;

    const thisAvgUnderstanding = thisWeekLogs.length > 0
      ? Math.round(thisWeekLogs.reduce((s, l) => s + (l.understanding_score || 0), 0) / thisWeekLogs.length * 10) / 10
      : 0;

    const pomoDiff = thisPomos - lastPomos;
    const hoursDiff = Math.round((thisHours - lastHours) * 10) / 10;
    const focusDiff = Math.round((thisAvgFocus - lastAvgFocus) * 10) / 10;

    let comment = '';
    if (thisPomos === 0) {
      comment = '今週はまだ学習していません。小さな一歩から始めましょう！💪';
    } else if (pomoDiff > 0) {
      comment = `先週より${pomoDiff}ポモ多く学習しました！調子いいですね🔥`;
    } else if (pomoDiff < 0) {
      comment = `先週より${Math.abs(pomoDiff)}ポモ少ないです。来週は頑張りましょう！`;
    } else {
      comment = '先週と同じペースで学習できています。継続は力なり！';
    }

    return {
      thisPomos, lastPomos, thisHours, lastHours,
      thisAvgFocus, thisAvgUnderstanding,
      pomoDiff, hoursDiff, focusDiff, comment,
      mondayStr: monday.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' })
    };
  };

  const BADGES = [
    // ポモドーロ数
    { key: 'first_pomo', emoji: '🍅', title: '初ポモ', desc: '初めてポモドーロを完了', check: (logs) => logs.filter(l => l.is_completed).length >= 1 },
    { key: 'pomo_10', emoji: '🔟', title: '10ポモ達成', desc: '合計10ポモ完了', check: (logs) => logs.filter(l => l.is_completed).length >= 10 },
    { key: 'pomo_50', emoji: '💫', title: '50ポモ達成', desc: '合計50ポモ完了', check: (logs) => logs.filter(l => l.is_completed).length >= 50 },
    { key: 'pomo_100', emoji: '💯', title: '100ポモ達成', desc: '合計100ポモ完了', check: (logs) => logs.filter(l => l.is_completed).length >= 100 },

    // 連続学習
    { key: 'streak_3', emoji: '🔥', title: '3日連続', desc: '3日連続で学習', check: (logs) => calcStreakFromLogs(logs) >= 3 },
    { key: 'streak_7', emoji: '🌟', title: '7日連続', desc: '7日連続で学習', check: (logs) => calcStreakFromLogs(logs) >= 7 },
    { key: 'streak_30', emoji: '👑', title: '30日連続', desc: '30日連続で学習', check: (logs) => calcStreakFromLogs(logs) >= 30 },

    // 教材完了
    { key: 'first_complete', emoji: '✅', title: '初完了', desc: '初めて教材を完了', check: (logs, books) => books.filter(b => b.status === '完了').length >= 1 },
    { key: 'complete_5', emoji: '📚', title: '5冊完了', desc: '5冊の教材を完了', check: (logs, books) => books.filter(b => b.status === '完了').length >= 5 },
    { key: 'complete_10', emoji: '🎓', title: '10冊完了', desc: '10冊の教材を完了', check: (logs, books) => books.filter(b => b.status === '完了').length >= 10 },

    // 1日の学習時間
    { key: 'day_1h', emoji: '⏰', title: '1日1時間', desc: '1日に1時間以上学習', check: (logs) => {
      const byDay = {};
      logs.filter(l => l.is_completed).forEach(l => {
        const d = new Date(l.created_at).toLocaleDateString('ja-JP');
        byDay[d] = (byDay[d] || 0) + (l.duration_minutes || 25);
      });
      return Object.values(byDay).some(m => m >= 60);
    }},
    { key: 'day_3h', emoji: '🔆', title: '1日3時間', desc: '1日に3時間以上学習', check: (logs) => {
      const byDay = {};
      logs.filter(l => l.is_completed).forEach(l => {
        const d = new Date(l.created_at).toLocaleDateString('ja-JP');
        byDay[d] = (byDay[d] || 0) + (l.duration_minutes || 25);
      });
      return Object.values(byDay).some(m => m >= 180);
    }},
    { key: 'day_5h', emoji: '🌈', title: '1日5時間', desc: '1日に5時間以上学習', check: (logs) => {
      const byDay = {};
      logs.filter(l => l.is_completed).forEach(l => {
        const d = new Date(l.created_at).toLocaleDateString('ja-JP');
        byDay[d] = (byDay[d] || 0) + (l.duration_minutes || 25);
      });
      return Object.values(byDay).some(m => m >= 300);
    }},

    // 週の学習時間
    { key: 'week_5h', emoji: '📅', title: '週5時間', desc: '1週間に5時間以上学習', check: (logs) => {
      const now = new Date();
      const monday = new Date(now);
      monday.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1));
      monday.setHours(0, 0, 0, 0);
      const weekMins = logs.filter(l => l.is_completed && new Date(l.created_at) >= monday)
        .reduce((s, l) => s + (l.duration_minutes || 25), 0);
      return weekMins >= 300;
    }},
    { key: 'week_10h', emoji: '🚀', title: '週10時間', desc: '1週間に10時間以上学習', check: (logs) => {
      const now = new Date();
      const monday = new Date(now);
      monday.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1));
      monday.setHours(0, 0, 0, 0);
      const weekMins = logs.filter(l => l.is_completed && new Date(l.created_at) >= monday)
        .reduce((s, l) => s + (l.duration_minutes || 25), 0);
      return weekMins >= 600;
    }},
    { key: 'week_20h', emoji: '⚡', title: '週20時間', desc: '1週間に20時間以上学習', check: (logs) => {
      const now = new Date();
      const monday = new Date(now);
      monday.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1));
      monday.setHours(0, 0, 0, 0);
      const weekMins = logs.filter(l => l.is_completed && new Date(l.created_at) >= monday)
        .reduce((s, l) => s + (l.duration_minutes || 25), 0);
      return weekMins >= 1200;
    }},

    // 時間帯
    { key: 'early_bird', emoji: '🌅', title: '早起き学習', desc: '朝6時前にポモ完了', check: (logs) => logs.some(l => l.is_completed && new Date(l.created_at).getHours() < 6) },
    { key: 'night_owl', emoji: '🦉', title: '夜型学習', desc: '深夜0時以降にポモ完了', check: (logs) => logs.some(l => l.is_completed && new Date(l.created_at).getHours() >= 0 && new Date(l.created_at).getHours() < 5) },

    // 集中度・理解度
    { key: 'perfect_focus', emoji: '🎯', title: '完璧な集中', desc: '集中度5を10回達成', check: (logs) => logs.filter(l => l.focus_score === 5).length >= 10 },
    { key: 'high_understanding', emoji: '💡', title: '理解力抜群', desc: '理解度5を10回達成', check: (logs) => logs.filter(l => l.understanding_score === 5).length >= 10 },
  ];

  const calcStreakFromLogs = (logData) => {
    if (!logData || logData.length === 0) return 0;
    const dates = [...new Set(logData.map(l =>
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

  const getEarnedBadges = () => {
    return BADGES.filter(b => b.check(logs, books));
  };

  const getTitle = () => {
    const earned = getEarnedBadges();
    const total = logs.filter(l => l.is_completed).length;
    const streak = calcStreakFromLogs(logs);
    if (streak >= 30) return { title: '伝説の学習者', color: '#FFD700' };
    if (total >= 100) return { title: '百戦錬磨', color: '#FF7043' };
    if (earned.length >= 10) return { title: 'バッジコレクター', color: '#9C27B0' };
    if (streak >= 7) return { title: '継続の申し子', color: '#5C6BC0' };
    if (total >= 50) return { title: '努力家', color: '#4CAF50' };
    if (total >= 10) return { title: '学習中', color: '#FF9800' };
    if (total >= 1) return { title: 'ルーキー', color: '#9E9E9E' };
    return { title: 'はじめの一歩', color: '#9E9E9E' };
  };

  const topBooks = [...books].sort((a, b) => b.pomodoros - a.pomodoros).slice(0, 5);
  const maxPomodoros = Math.max(...topBooks.map(b => b.pomodoros), 1);
  const weeklyData = getWeeklyData();
  const maxWeekly = Math.max(...weeklyData.map(d => d.count), 1);
  const streak = getStreak();
  const reviewList = getReviewList();

  if (loading) return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 60 }} />
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ヘッダー */}
        <View style={styles.headerRow}>
          <Text style={[styles.header, { color: theme.text }]}>📊 統計</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              style={[styles.themeBtn, { backgroundColor: theme.card }]}
              onPress={toggleTheme}
            >
              <Text style={styles.themeBtnText}>{isDark ? '☀️' : '🌙'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* サマリーカード */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { backgroundColor: theme.primary }]}>
            <Text style={styles.summaryNumWhite}>🍅 {totalPomodoros}</Text>
            <Text style={styles.summaryLabelWhite}>総ポモドーロ</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: streak >= 3 ? '#FF7043' : theme.card }]}>
            <Text style={[styles.summaryNum, { color: streak >= 3 ? '#fff' : theme.primary }]}>
              🔥 {streak}
            </Text>
            <Text style={[styles.summaryLabel, { color: streak >= 3 ? '#fff' : theme.subText }]}>
              日連続
            </Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: theme.card }]}>
            <Text style={[styles.summaryNum, { color: theme.primary }]}>
              {Math.round(totalPomodoros * 25 / 60)}h
            </Text>
            <Text style={[styles.summaryLabel, { color: theme.subText }]}>総学習時間</Text>
          </View>
        </View>

        {/* 今日の目標ゲージ */}
        {(() => {
          const todayPomos = getTodayPomos();
          const percent = Math.min(Math.round((todayPomos / dailyGoal) * 100), 100);
          const achieved = todayPomos >= dailyGoal;
          return (
            <View style={[styles.section, { backgroundColor: theme.card }]}>
              <View style={styles.goalHeader}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                  🎯 今日の目標
                </Text>
                <Text style={[styles.goalCount, { color: achieved ? '#4CAF50' : theme.primary }]}>
                  {todayPomos} / {dailyGoal}ポモ {achieved ? '🎉' : ''}
                </Text>
              </View>
              <View style={styles.goalBarBg}>
                <View style={[
                  styles.goalBarFill,
                  { width: `${percent}%`, backgroundColor: achieved ? '#4CAF50' : theme.primary }
                ]} />
              </View>
              <Text style={[styles.goalPercent, { color: achieved ? '#4CAF50' : theme.subText }]}>
                {achieved ? '目標達成！今日もお疲れ様！' : `あと${dailyGoal - todayPomos}ポモで達成`}
              </Text>
            </View>
          );
        })()}

        {/* 復習リマインド */}
        {reviewList.length > 0 && (
          <View style={[styles.section, { backgroundColor: theme.card }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>🔁 復習リマインド</Text>
            {reviewList.map((book, i) => (
              <View key={i} style={[styles.reviewCard, { borderBottomColor: theme.border }]}>
                <View style={styles.reviewLeft}>
                  <Text style={[styles.reviewTitle, { color: theme.text }]}>{book.title}</Text>
                  <Text style={styles.reviewDate}>⚠️ 復習日を過ぎています</Text>
                </View>
                <Text style={[styles.reviewPomo, { color: theme.subText }]}>🍅{book.pomodoros}</Text>
              </View>
            ))}
          </View>
        )}

        {/* 週間グラフ */}
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>📅 週間ポモドーロ</Text>
          <View style={styles.barChart}>
            {weeklyData.map((d, i) => (
              <View key={i} style={styles.barCol}>
                <Text style={[styles.barValue, { color: theme.primary }]}>{d.count > 0 ? d.count : ''}</Text>
                <View style={styles.barWrapper}>
                  <View style={[
                    styles.bar,
                    { backgroundColor: theme.primary },
                    { height: Math.max((d.count / maxWeekly) * 100, d.count > 0 ? 4 : 0) }
                  ]} />
                </View>
                <Text style={[styles.barLabel, { color: theme.subText }]}>{d.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 集中度・理解度グラフ */}
        {(() => {
          const focusData = getFocusData();
          const hasData = focusData.some(d => d.avgFocus !== null);
          return (
            <View style={[styles.section, { backgroundColor: theme.card }]}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>🧠 集中度・理解度推移</Text>
              {!hasData ? (
                <Text style={[styles.empty, { color: theme.subText }]}>ポモドーロを完了すると表示されます</Text>
              ) : (
                <>
                  {/* 凡例 */}
                  <View style={styles.focusLegend}>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: '#5C6BC0' }]} />
                      <Text style={[styles.legendText, { color: theme.subText }]}>集中度</Text>
                    </View>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: '#FF9800' }]} />
                      <Text style={[styles.legendText, { color: theme.subText }]}>理解度</Text>
                    </View>
                  </View>

                  {/* グラフ */}
                  <View style={styles.focusChart}>
                    {/* Y軸ラベル */}
                    <View style={styles.yAxis}>
                      {[5,4,3,2,1].map(n => (
                        <Text key={n} style={[styles.yLabel, { color: theme.subText }]}>{n}</Text>
                      ))}
                    </View>

                    {/* バーグループ */}
                    <View style={styles.focusBars}>
                      {focusData.map((d, i) => (
                        <View key={i} style={styles.focusBarCol}>
                          <View style={styles.focusBarGroup}>
                            {/* 集中度バー */}
                            <View style={styles.focusBarWrapper}>
                              {d.avgFocus !== null ? (
                                <>
                                  <Text style={[styles.focusBarVal, { color: '#5C6BC0' }]}>
                                    {d.avgFocus}
                                  </Text>
                                  <View style={[
                                    styles.focusBar,
                                    { backgroundColor: '#5C6BC0' },
                                    { height: (d.avgFocus / 5) * 80 }
                                  ]} />
                                </>
                              ) : (
                                <View style={[styles.focusBar, { backgroundColor: 'transparent', height: 0 }]} />
                              )}
                            </View>

                            {/* 理解度バー */}
                            <View style={styles.focusBarWrapper}>
                              {d.avgUnderstanding !== null ? (
                                <>
                                  <Text style={[styles.focusBarVal, { color: '#FF9800' }]}>
                                    {d.avgUnderstanding}
                                  </Text>
                                  <View style={[
                                    styles.focusBar,
                                    { backgroundColor: '#FF9800' },
                                    { height: (d.avgUnderstanding / 5) * 80 }
                                  ]} />
                                </>
                              ) : (
                                <View style={[styles.focusBar, { backgroundColor: 'transparent', height: 0 }]} />
                              )}
                            </View>
                          </View>
                          <Text style={[styles.focusLabel, { color: theme.subText }]}>{d.label}</Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  {/* 週平均 */}
                  {(() => {
                    const validFocus = focusData.filter(d => d.avgFocus !== null);
                    const validUnderstanding = focusData.filter(d => d.avgUnderstanding !== null);
                    const weekAvgFocus = validFocus.length > 0
                      ? Math.round((validFocus.reduce((s, d) => s + d.avgFocus, 0) / validFocus.length) * 10) / 10
                      : 0;
                    const weekAvgUnderstanding = validUnderstanding.length > 0
                      ? Math.round((validUnderstanding.reduce((s, d) => s + d.avgUnderstanding, 0) / validUnderstanding.length) * 10) / 10
                      : 0;
                    return (
                      <View style={[styles.weekAvgRow, { backgroundColor: theme.inputBg }]}>
                        <View style={styles.weekAvgItem}>
                          <Text style={[styles.weekAvgNum, { color: '#5C6BC0' }]}>{weekAvgFocus}</Text>
                          <Text style={[styles.weekAvgLabel, { color: theme.subText }]}>週平均集中度</Text>
                        </View>
                        <View style={[styles.weekAvgDivider, { backgroundColor: theme.border }]} />
                        <View style={styles.weekAvgItem}>
                          <Text style={[styles.weekAvgNum, { color: '#FF9800' }]}>{weekAvgUnderstanding}</Text>
                          <Text style={[styles.weekAvgLabel, { color: theme.subText }]}>週平均理解度</Text>
                        </View>
                      </View>
                    );
                  })()}
                </>
              )}
            </View>
          );
        })()}

        {/* 教材別ポモ数 */}
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>📚 教材別ポモ数</Text>
          {topBooks.length === 0 ? (
            <Text style={[styles.empty, { color: theme.subText }]}>まだデータがありません</Text>
          ) : (
            topBooks.map((book, i) => (
              <View key={i} style={styles.bookBarRow}>
                <Text style={[styles.bookBarLabel, { color: theme.text }]} numberOfLines={1}>
                  {book.title}
                </Text>
                <View style={[styles.bookBarBg, { backgroundColor: theme.border }]}>
                  <View style={[styles.bookBarFill, { backgroundColor: theme.primary },
                    { width: `${(book.pomodoros / maxPomodoros) * 100}%` }]} />
                </View>
                <Text style={[styles.bookBarNum, { color: theme.text }]}>{book.pomodoros}</Text>
              </View>
            ))
          )}
        </View>

        {/* 教材ステータス */}
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>📈 教材ステータス</Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusCard, { borderColor: '#4CAF50' }]}>
              <Text style={[styles.statusNum, { color: '#4CAF50' }]}>
                {books.filter(b => b.status === '完了').length}
              </Text>
              <Text style={[styles.statusLabel, { color: theme.subText }]}>完了</Text>
            </View>
            <View style={[styles.statusCard, { borderColor: '#FF9800' }]}>
              <Text style={[styles.statusNum, { color: '#FF9800' }]}>
                {books.filter(b => b.status === '進行中').length}
              </Text>
              <Text style={[styles.statusLabel, { color: theme.subText }]}>進行中</Text>
            </View>
            <View style={[styles.statusCard, { borderColor: '#9E9E9E' }]}>
              <Text style={[styles.statusNum, { color: '#9E9E9E' }]}>
                {books.filter(b => b.status === '未着手').length}
              </Text>
              <Text style={[styles.statusLabel, { color: theme.subText }]}>未着手</Text>
            </View>
          </View>
        </View>

        {/* 週間レポート */}
        {(() => {
          const report = getWeeklyReport();
          return (
            <View style={[styles.section, { backgroundColor: theme.card }]}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>📋 週間レポート</Text>
              <Text style={[styles.reportDate, { color: theme.subText }]}>
                {report.mondayStr}〜今日
              </Text>

              <View style={[styles.reportComment, { backgroundColor: theme.inputBg }]}>
                <Text style={[styles.reportCommentText, { color: theme.text }]}>{report.comment}</Text>
              </View>

              <View style={styles.reportGrid}>
                <View style={[styles.reportCard, { backgroundColor: theme.inputBg }]}>
                  <Text style={[styles.reportCardLabel, { color: theme.subText }]}>🍅 今週のポモ</Text>
                  <Text style={[styles.reportCardNum, { color: theme.primary }]}>{report.thisPomos}</Text>
                  <Text style={[styles.reportCardDiff, {
                    color: report.pomoDiff >= 0 ? '#4CAF50' : '#E53935'
                  }]}>
                    {report.pomoDiff >= 0 ? `▲${report.pomoDiff}` : `▼${Math.abs(report.pomoDiff)}`} 先週比
                  </Text>
                </View>

                <View style={[styles.reportCard, { backgroundColor: theme.inputBg }]}>
                  <Text style={[styles.reportCardLabel, { color: theme.subText }]}>⏱️ 今週の時間</Text>
                  <Text style={[styles.reportCardNum, { color: theme.primary }]}>{report.thisHours}h</Text>
                  <Text style={[styles.reportCardDiff, {
                    color: report.hoursDiff >= 0 ? '#4CAF50' : '#E53935'
                  }]}>
                    {report.hoursDiff >= 0 ? `▲${report.hoursDiff}` : `▼${Math.abs(report.hoursDiff)}`}h 先週比
                  </Text>
                </View>

                <View style={[styles.reportCard, { backgroundColor: theme.inputBg }]}>
                  <Text style={[styles.reportCardLabel, { color: theme.subText }]}>🧠 平均集中度</Text>
                  <Text style={[styles.reportCardNum, { color: '#5C6BC0' }]}>{report.thisAvgFocus}</Text>
                  <Text style={[styles.reportCardDiff, {
                    color: report.focusDiff >= 0 ? '#4CAF50' : '#E53935'
                  }]}>
                    {report.focusDiff >= 0 ? `▲${report.focusDiff}` : `▼${Math.abs(report.focusDiff)}`} 先週比
                  </Text>
                </View>

                <View style={[styles.reportCard, { backgroundColor: theme.inputBg }]}>
                  <Text style={[styles.reportCardLabel, { color: theme.subText }]}>💡 平均理解度</Text>
                  <Text style={[styles.reportCardNum, { color: '#FF9800' }]}>{report.thisAvgUnderstanding}</Text>
                  <Text style={styles.reportCardDiff}>　</Text>
                </View>
              </View>
            </View>
          );
        })()}

        {/* バッジ・称号 */}
        {(() => {
          const earnedBadges = getEarnedBadges();
          const titleInfo = getTitle();
          const unearnedBadges = BADGES.filter(b => !b.check(logs, books));
          return (
            <View style={[styles.section, { backgroundColor: theme.card }]}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>🏆 バッジ・称号</Text>

              <View style={[styles.titleCard, { borderColor: titleInfo.color }]}>
                <Text style={styles.titleEmoji}>👤</Text>
                <View>
                  <Text style={[styles.titleLabel, { color: theme.subText }]}>現在の称号</Text>
                  <Text style={[styles.titleText, { color: titleInfo.color }]}>{titleInfo.title}</Text>
                </View>
                <Text style={[styles.badgeCount, { color: theme.subText }]}>
                  {earnedBadges.length}/{BADGES.length}個
                </Text>
              </View>

              {earnedBadges.length > 0 && (
                <>
                  <Text style={[styles.badgeSectionLabel, { color: theme.subText }]}>獲得済み</Text>
                  <View style={styles.badgeGrid}>
                    {earnedBadges.map((badge, i) => (
                      <View key={i} style={[styles.badgeItem, { backgroundColor: theme.inputBg }]}>
                        <Text style={styles.badgeEmoji}>{badge.emoji}</Text>
                        <Text style={[styles.badgeTitle, { color: theme.text }]}>{badge.title}</Text>
                        <Text style={[styles.badgeDesc, { color: theme.subText }]}>{badge.desc}</Text>
                      </View>
                    ))}
                  </View>
                </>
              )}

              {unearnedBadges.length > 0 && (
                <>
                  <Text style={[styles.badgeSectionLabel, { color: theme.subText }]}>未獲得</Text>
                  <View style={styles.badgeGrid}>
                    {unearnedBadges.map((badge, i) => (
                      <View key={i} style={[styles.badgeItemLocked, { backgroundColor: theme.inputBg }]}>
                        <Text style={styles.badgeEmojiLocked}>🔒</Text>
                        <Text style={[styles.badgeTitle, { color: theme.subText }]}>{badge.title}</Text>
                        <Text style={[styles.badgeDesc, { color: theme.subText }]}>{badge.desc}</Text>
                      </View>
                    ))}
                  </View>
                </>
              )}
            </View>
          );
        })()}

      </ScrollView>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  header: { fontSize: 24, fontWeight: 'bold' },
  themeBtn: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, elevation: 2 },
  themeBtnText: { fontSize: 13, fontWeight: 'bold' },
  summaryRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  summaryCard: { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center', elevation: 2 },
  summaryNum: { fontSize: 22, fontWeight: 'bold' },
  summaryNumWhite: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  summaryLabel: { fontSize: 11, marginTop: 4 },
  summaryLabelWhite: { fontSize: 11, color: '#fff', marginTop: 4, opacity: 0.8 },
  section: { borderRadius: 16, padding: 16, marginBottom: 16, elevation: 2 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  reviewCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1 },
  reviewLeft: { flex: 1 },
  reviewTitle: { fontSize: 14, fontWeight: '600' },
  reviewDate: { fontSize: 12, color: '#E53935', marginTop: 2 },
  reviewPomo: { fontSize: 13, marginLeft: 8 },
  barChart: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 140 },
  barCol: { flex: 1, alignItems: 'center' },
  barValue: { fontSize: 10, fontWeight: 'bold', marginBottom: 2, height: 14 },
  barWrapper: { height: 100, justifyContent: 'flex-end' },
  bar: { width: 20, borderRadius: 4 },
  barLabel: { fontSize: 9, marginTop: 4 },
  bookBarRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  bookBarLabel: { width: 90, fontSize: 12 },
  bookBarBg: { flex: 1, borderRadius: 8, height: 16, marginHorizontal: 8 },
  bookBarFill: { borderRadius: 8, height: 16, minWidth: 4 },
  bookBarNum: { width: 24, fontSize: 13, textAlign: 'right' },
  statusRow: { flexDirection: 'row', gap: 8 },
  statusCard: { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 2 },
  statusNum: { fontSize: 28, fontWeight: 'bold' },
  statusLabel: { fontSize: 12, marginTop: 4 },
  empty: { textAlign: 'center', marginTop: 20 },
  goalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  goalCount: { fontSize: 16, fontWeight: 'bold' },
  goalBarBg: { backgroundColor: '#E0E0E0', borderRadius: 10, height: 16, marginBottom: 8 },
  goalBarFill: { borderRadius: 10, height: 16, minWidth: 8 },
  goalPercent: { fontSize: 13, textAlign: 'center' },
  focusLegend: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12 },
  focusChart: { flexDirection: 'row', height: 120, marginBottom: 12 },
  yAxis: { justifyContent: 'space-between', paddingRight: 6, paddingVertical: 18 },
  yLabel: { fontSize: 10 },
  focusBars: { flex: 1, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end' },
  focusBarCol: { alignItems: 'center', flex: 1 },
  focusBarGroup: { flexDirection: 'row', gap: 2, alignItems: 'flex-end', height: 100, paddingBottom: 4 },
  focusBarWrapper: { alignItems: 'center', justifyContent: 'flex-end', height: 100 },
  focusBar: { width: 10, borderRadius: 4 },
  focusBarVal: { fontSize: 8, fontWeight: 'bold', marginBottom: 2 },
  focusLabel: { fontSize: 9, marginTop: 4 },
  weekAvgRow: { flexDirection: 'row', borderRadius: 10, padding: 12 },
  weekAvgItem: { flex: 1, alignItems: 'center' },
  weekAvgNum: { fontSize: 24, fontWeight: 'bold' },
  weekAvgLabel: { fontSize: 11, marginTop: 2 },
  weekAvgDivider: { width: 1 },
  reportDate: { fontSize: 13, marginBottom: 12 },
  reportComment: { borderRadius: 10, padding: 12, marginBottom: 16 },
  reportCommentText: { fontSize: 14, lineHeight: 22 },
  reportGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  reportCard: { width: '47%', borderRadius: 12, padding: 12 },
  reportCardLabel: { fontSize: 12, marginBottom: 6 },
  reportCardNum: { fontSize: 26, fontWeight: 'bold', marginBottom: 4 },
  reportCardDiff: { fontSize: 12 },
  titleCard: { flexDirection: 'row', alignItems: 'center', borderWidth: 2, borderRadius: 14, padding: 14, marginBottom: 16, gap: 12 },
  titleEmoji: { fontSize: 32 },
  titleLabel: { fontSize: 12, marginBottom: 2 },
  titleText: { fontSize: 20, fontWeight: 'bold' },
  badgeCount: { marginLeft: 'auto', fontSize: 13 },
  badgeSectionLabel: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  badgeItem: { width: '30%', borderRadius: 12, padding: 10, alignItems: 'center' },
  badgeItemLocked: { width: '30%', borderRadius: 12, padding: 10, alignItems: 'center', opacity: 0.5 },
  badgeEmoji: { fontSize: 28, marginBottom: 4 },
  badgeEmojiLocked: { fontSize: 28, marginBottom: 4 },
  badgeTitle: { fontSize: 11, fontWeight: 'bold', textAlign: 'center', marginBottom: 2 },
  badgeDesc: { fontSize: 9, textAlign: 'center' },
});