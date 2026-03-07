import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, Modal,
  ActivityIndicator, Switch, Image, ScrollView
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import { useTheme } from '../lib/ThemeContext';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withSpring, withSequence, withTiming
} from 'react-native-reanimated';

export default function MyRouteScreen() {
  const { theme } = useTheme();
  const [userId, setUserId] = useState(null);
  const [books, setBooks] = useState([]);
  const [title, setTitle] = useState('');
  const [totalPages, setTotalPages] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedBook, setSelectedBook] = useState(null);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [showModal, setShowModal] = useState(false);
  const [focus, setFocus] = useState(3);
  const [understanding, setUnderstanding] = useState(3);
  const [nextReviewDate, setNextReviewDate] = useState('');
  const [pomoEndPage, setPomoEndPage] = useState('');
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishTitle, setPublishTitle] = useState('');
  const [publishTarget, setPublishTarget] = useState('');
  const [isPassed, setIsPassed] = useState(false);
  const [studyDays, setStudyDays] = useState('');
  const [routes, setRoutes] = useState(['デフォルト']);
  const [currentRoute, setCurrentRoute] = useState('デフォルト');
  const [showAddRoute, setShowAddRoute] = useState(false);
  const [newRouteName, setNewRouteName] = useState('');
  const [newRouteExamDate, setNewRouteExamDate] = useState('');
  const [routeExamDates, setRouteExamDates] = useState({});
  const [showExamDateModal, setShowExamDateModal] = useState(false);
  const [examDateInput, setExamDateInput] = useState('');
  const [showAddBook, setShowAddBook] = useState(false);
  const [showPageModal, setShowPageModal] = useState(false);
  const [pageInput, setPageInput] = useState('');
  const [editingBook, setEditingBook] = useState(null);
  const [showMemoModal, setShowMemoModal] = useState(false);
  const [memoInput, setMemoInput] = useState('');
  const [memoBook, setMemoBook] = useState(null);
  const [showTodayModal, setShowTodayModal] = useState(false);
  const [todaySuggestion, setTodaySuggestion] = useState(null);
  const [pomoDuration, setPomoDuration] = useState(25 * 60);
  const [elapsedMinutes, setElapsedMinutes] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const [referenceUrl, setReferenceUrl] = useState('');
  const [showCompleteRouteModal, setShowCompleteRouteModal] = useState(false);
  const celebScale = useSharedValue(0);
  const celebOpacity = useSharedValue(0);
  const intervalRef = useRef(null);

  useEffect(() => { initUser(); }, []);
  useEffect(() => { if (userId) fetchBooks(userId, currentRoute); }, [currentRoute]);

  useEffect(() => {
    if (timerRunning) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) {
            clearInterval(intervalRef.current);
            setTimerRunning(false);
            setShowModal(true);
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [timerRunning]);

  const initUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user.id);
    fetchRouteNames(user.id);
    fetchBooks(user.id, currentRoute);
    fetchRouteExamDates(user.id);
    // ポモドーロ時間をプロフィールから取得
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('pomodoro_minutes')
      .eq('user_id', user.id)
      .single();
    if (profile?.pomodoro_minutes) {
      setTimeLeft(profile.pomodoro_minutes * 60);
      setPomoDuration(profile.pomodoro_minutes * 60);
    }
  };

  const fetchRouteNames = async (uid) => {
    const { data } = await supabase.from('my_books').select('route_name').eq('user_identifier', uid);
    if (data) {
      const names = [...new Set(data.map(b => b.route_name).filter(Boolean))];
      if (names.length > 0) setRoutes(names);
    }
  };

  const fetchRouteExamDates = async (uid) => {
    const { data } = await supabase.from('my_books').select('route_name, exam_date')
      .eq('user_identifier', uid).not('exam_date', 'is', null);
    if (data) {
      const dates = {};
      data.forEach(b => { if (b.exam_date) dates[b.route_name] = b.exam_date; });
      setRouteExamDates(dates);
    }
  };

  const fetchBooks = async (uid, routeName) => {
    setLoading(true);
    const { data, error } = await supabase.from('my_books').select('*')
      .eq('user_identifier', uid).eq('route_name', routeName)
      .order('position', { ascending: true });
    if (!error) setBooks(data);
    setLoading(false);
  };

  const addRoute = () => {
    if (!newRouteName.trim()) return;
    if (routes.includes(newRouteName.trim())) { alert('同じ名前のルートがあります'); return; }
    const name = newRouteName.trim();
    setRoutes([...routes, name]);
    if (newRouteExamDate.trim()) {
      setRouteExamDates(prev => ({ ...prev, [name]: newRouteExamDate.trim() }));
    }
    setCurrentRoute(name);
    setNewRouteName('');
    setNewRouteExamDate('');
    setShowAddRoute(false);
  };

  const addBook = async () => {
    if (!title.trim()) return;
    const examDate = routeExamDates[currentRoute] || null;
    const newBook = {
      user_identifier: userId, title, status: '未着手', pomodoros: 0,
      position: books.length, local_image_uri: null, route_name: currentRoute,
      total_pages: parseInt(totalPages) || 0, current_page: 0,
      exam_date: examDate, memo: '', reference_url: referenceUrl.trim() || null
    };
    const { data, error } = await supabase.from('my_books').insert(newBook).select().single();
    if (!error) setBooks([...books, data]);
    setTitle(''); setTotalPages(''); setReferenceUrl(''); setShowAddBook(false);
  };

  const saveExamDate = async () => {
    if (!examDateInput.trim()) return;
    const newDates = { ...routeExamDates, [currentRoute]: examDateInput };
    setRouteExamDates(newDates);
    await supabase.from('my_books').update({ exam_date: examDateInput })
      .eq('user_identifier', userId).eq('route_name', currentRoute);
    setShowExamDateModal(false); setExamDateInput('');
  };

  const openPageModal = (book) => {
    setEditingBook(book);
    setPageInput(book.current_page?.toString() || '0');
    setShowPageModal(true);
  };

  const saveCurrentPage = async () => {
    const page = parseInt(pageInput) || 0;
    const capped = Math.min(page, editingBook.total_pages || page);
    let newStatus = editingBook.status;
    if (capped >= editingBook.total_pages && editingBook.total_pages > 0) newStatus = '完了';
    else if (capped > 0) newStatus = '進行中';
    await supabase.from('my_books').update({ current_page: capped, status: newStatus }).eq('id', editingBook.id);
    setBooks(books.map(b => b.id === editingBook.id ? { ...b, current_page: capped, status: newStatus } : b));
    setShowPageModal(false); setEditingBook(null);
  };

  const openMemoModal = (book) => {
    setMemoBook(book);
    setMemoInput(book.memo || '');
    setShowMemoModal(true);
  };

  const saveMemo = async () => {
    await supabase.from('my_books').update({ memo: memoInput }).eq('id', memoBook.id);
    setBooks(books.map(b => b.id === memoBook.id ? { ...b, memo: memoInput } : b));
    setShowMemoModal(false); setMemoBook(null);
  };

  const pickImage = async (book) => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { alert('写真へのアクセスを許可してください'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.5,
    });
    if (!result.canceled) {
      const uri = result.assets[0].uri;
      await supabase.from('my_books').update({ local_image_uri: uri }).eq('id', book.id);
      setBooks(books.map(b => b.id === book.id ? { ...b, local_image_uri: uri } : b));
    }
  };

  const cycleStatus = async (book) => {
    const next = { '未着手': '進行中', '進行中': '完了', '完了': '未着手' };
    const newStatus = next[book.status];
    await supabase.from('my_books').update({ status: newStatus }).eq('id', book.id);
    const updatedBooks = books.map(b => b.id === book.id ? { ...b, status: newStatus } : b);
    setBooks(updatedBooks);
    if (newStatus === '完了') {
      showCelebrationAnim();
      const allDone = updatedBooks.every(b => b.status === '完了');
      if (allDone && updatedBooks.length > 0) {
        setTimeout(() => setShowCompleteRouteModal(true), 500);
      }
    }
  };

  const showCelebrationAnim = () => {
    setShowCelebration(true);
    celebScale.value = 0;
    celebOpacity.value = 1;
    celebScale.value = withSequence(
      withSpring(1.2, { damping: 4, stiffness: 200 }),
      withSpring(1.0, { damping: 8 })
    );
    celebOpacity.value = withSequence(
      withTiming(1, { duration: 100 }),
      withTiming(1, { duration: 1500 }),
      withTiming(0, { duration: 400 })
    );
    setTimeout(() => setShowCelebration(false), 2100);
  };

  const celebAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: celebScale.value }],
    opacity: celebOpacity.value,
  }));

  const deleteBook = async (book) => {
    if (!window.confirm(`「${book.title}」を削除しますか？`)) return;
    await supabase.from('my_books').delete().eq('id', book.id);
    setBooks(books.filter(b => b.id !== book.id));
  };

  const startTimer = async (book) => {
    if (book.status === '未着手') {
      await supabase.from('my_books').update({ status: '進行中' }).eq('id', book.id);
      setBooks(books.map(b => b.id === book.id ? { ...b, status: '進行中' } : b));
      book = { ...book, status: '進行中' };
    }
    setSelectedBook(book);
    setTimeLeft(pomoDuration);
    setTimerRunning(true);
    setPomoEndPage('');
  };

  const stopTimer = () => {
    clearInterval(intervalRef.current);
    setTimerRunning(false);
    const elapsed = Math.floor((pomoDuration - timeLeft) / 60);
    setElapsedMinutes(elapsed);
    setShowModal(true);
  };

  const finishPomodoro = async () => {
    const isCompleted = timeLeft === 0;
    const actualMinutes = isCompleted ? Math.floor(pomoDuration / 60) : elapsedMinutes;

    let updatedBook = { ...selectedBook };

    if (isCompleted) {
      // 完了ポモ
      const newCount = selectedBook.pomodoros + 1;
      updatedBook = { ...updatedBook, pomodoros: newCount };

      if (pomoEndPage && selectedBook.total_pages > 0) {
        const page = Math.min(parseInt(pomoEndPage) || 0, selectedBook.total_pages);
        let newStatus = selectedBook.status;
        if (page >= selectedBook.total_pages) {
          const confirm = window.confirm(`「${selectedBook.title}」を完了にしますか？`);
          newStatus = confirm ? '完了' : '進行中';
        } else {
          newStatus = '進行中';
        }
        await supabase.from('my_books').update({
          pomodoros: newCount, current_page: page, status: newStatus
        }).eq('id', selectedBook.id);
        updatedBook = { ...updatedBook, current_page: page, status: newStatus };
        if (newStatus === '完了') showCelebrationAnim();
      } else {
        await supabase.from('my_books').update({ pomodoros: newCount }).eq('id', selectedBook.id);
      }
    } else {
      // 途中終了：extra_minutesに加算
      if (actualMinutes > 0) {
        const newExtra = (selectedBook.extra_minutes || 0) + actualMinutes;
        await supabase.from('my_books').update({ extra_minutes: newExtra }).eq('id', selectedBook.id);
        updatedBook = { ...updatedBook, extra_minutes: newExtra };
      }
    }

    // ポモドーロログ
    await supabase.from('pomodoro_logs').insert({
      user_id: userId,
      book_id: selectedBook.id,
      focus_score: focus,
      understanding_score: understanding,
      is_completed: isCompleted,
      duration_minutes: actualMinutes
    });

    // 復習日
    if (nextReviewDate) {
      await supabase.from('my_books').update({ next_review_date: nextReviewDate }).eq('id', selectedBook.id);
      updatedBook = { ...updatedBook, next_review_date: nextReviewDate };
    }

    const updatedBooks = books.map(b => b.id === selectedBook.id ? updatedBook : b);
    setBooks(updatedBooks);
    const allDone = updatedBooks.every(b => b.status === '完了');
    if (allDone && updatedBooks.length > 0) {
      setTimeout(() => setShowCompleteRouteModal(true), 1000);
    }
    setShowModal(false); setSelectedBook(null); setTimeLeft(pomoDuration);
    setFocus(3); setUnderstanding(3); setNextReviewDate(''); setPomoEndPage('');
    setElapsedMinutes(0);
  };

  const publishRoute = async () => {
    if (!publishTitle.trim() || !publishTarget.trim()) {
      alert('タイトルと志望校・資格を入力してください'); return;
    }
    const totalPomodoros = books.reduce((sum, b) => sum + b.pomodoros, 0);
    const avgDaily = studyDays ? Math.round((totalPomodoros / parseInt(studyDays)) * 10) / 10 : 0;
    const { data: route, error } = await supabase.from('published_routes').insert({
      user_identifier: userId, title: publishTitle, target: publishTarget,
      is_passed: isPassed, study_days: parseInt(studyDays) || 0,
      total_pomodoros: totalPomodoros, avg_daily: avgDaily, likes_count: 0
    }).select().single();
    if (error) { alert('公開に失敗しました'); return; }
    await supabase.from('published_books').insert(
      books.map((b, i) => ({ route_id: route.id, title: b.title, position: i }))
    );
    setShowPublishModal(false);
    setPublishTitle(''); setPublishTarget(''); setIsPassed(false); setStudyDays('');
    alert('ルートを公開しました！\n※画像は共有されません');
  };

  const suggestToday = () => {
    const notDone = books.filter(b => b.status !== '完了');
    if (notDone.length === 0) { alert('全教材が完了しています！🎉'); return; }
    const random = notDone[Math.floor(Math.random() * notDone.length)];
    setTodaySuggestion(random); setShowTodayModal(true);
  };

  const logout = async () => { await supabase.auth.signOut(); };

  const getDaysLeft = () => {
    const examDate = routeExamDates[currentRoute];
    if (!examDate) return null;
    return Math.ceil((new Date(examDate) - new Date()) / (1000 * 60 * 60 * 24));
  };

  const getEstimatedCompletion = () => {
    if (books.length === 0) return null;
    const remaining = books.filter(b => b.status !== '完了');
    if (remaining.length === 0) return null;
    const totalPomos = books.reduce((s, b) => s + b.pomodoros, 0);
    const oldestBook = books.reduce((a, b) =>
      new Date(a.created_at) < new Date(b.created_at) ? a : b
    );
    const daysSinceStart = Math.max(
      Math.ceil((new Date() - new Date(oldestBook.created_at)) / (1000 * 60 * 60 * 24)), 1
    );
    const avgPomosPerDay = totalPomos / daysSinceStart;
    if (avgPomosPerDay <= 0) return null;
    let remainingPomos = 0;
    remaining.forEach(b => {
      if (b.total_pages > 0) {
        const remainPages = b.total_pages - (b.current_page || 0);
        remainingPomos += Math.ceil(remainPages / 20);
      } else {
        const avgPomoPerBook = totalPomos / Math.max(books.length, 1);
        remainingPomos += Math.max(avgPomoPerBook, 5);
      }
    });
    const daysNeeded = Math.ceil(remainingPomos / avgPomosPerDay);
    const estimatedDate = new Date(Date.now() + daysNeeded * 24 * 60 * 60 * 1000);
    return {
      date: estimatedDate.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' }),
      days: daysNeeded,
      avgPerDay: Math.round(avgPomosPerDay * 10) / 10
    };
  };

  const getProgress = () => {
    if (books.length === 0) return 0;
    if (books.some(b => b.total_pages > 0)) {
      const totalP = books.reduce((s, b) => s + (b.total_pages || 0), 0);
      const currentP = books.reduce((s, b) => s + (b.current_page || 0), 0);
      return totalP > 0 ? Math.round((currentP / totalP) * 100) : 0;
    }
    return Math.round((books.filter(b => b.status === '完了').length / books.length) * 100);
  };

  const formatTime = (sec) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const statusColor = (status) => {
    if (status === '完了') return '#4CAF50';
    if (status === '進行中') return '#FF9800';
    return '#9E9E9E';
  };

  const ScoreSelector = ({ label, value, onChange }) => (
    <View style={styles.scoreRow}>
      <Text style={[styles.scoreLabel, { color: theme.text }]}>{label}</Text>
      <View style={styles.scoreButtons}>
        {[1,2,3,4,5].map(n => (
          <TouchableOpacity
            key={n}
            style={[styles.scoreBtn, value === n && styles.scoreBtnActive]}
            onPress={() => onChange(n)}
          >
            <Text style={[styles.scoreBtnText, value === n && styles.scoreBtnTextActive]}>{n}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const daysLeft = getDaysLeft();
  const progress = getProgress();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* ヘッダー */}
      <View style={styles.headerRow}>
        <Text style={[styles.header, { color: theme.text }]}>📚 マイルート</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity style={styles.todayBtn} onPress={suggestToday}>
            <Text style={styles.todayBtnText}>🎲 今日は？</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.publishBtn} onPress={() => setShowPublishModal(true)}>
            <Text style={styles.publishBtnText}>公開</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.logoutBtn, { backgroundColor: theme.card }]} onPress={logout}>
            <Text style={[styles.logoutBtnText, { color: theme.subText }]}>ログアウト</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ルートタブ */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.routeTabs}>
        {routes.map(r => (
          <TouchableOpacity
            key={r}
            style={[styles.routeTab, { backgroundColor: theme.card, borderColor: theme.border },
              currentRoute === r && styles.routeTabActive]}
            onPress={() => setCurrentRoute(r)}
          >
            <Text style={[styles.routeTabText, { color: theme.subText },
              currentRoute === r && styles.routeTabTextActive]}>{r}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={[styles.addRouteBtn, { backgroundColor: theme.card }]}
          onPress={() => setShowAddRoute(true)}>
          <Text style={styles.addRouteBtnText}>＋ ルート追加</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* カウントダウン＋進捗 */}
      <View style={[styles.statsBar, { backgroundColor: theme.card }]}>
        <TouchableOpacity style={styles.statsBarItem} onPress={() => {
          setExamDateInput(routeExamDates[currentRoute] || '');
          setShowExamDateModal(true);
        }}>
          {daysLeft !== null ? (
            <>
              <Text style={[styles.statsBarNum, { color: theme.primary },
                daysLeft <= 7 && { color: '#E53935' }]}>
                {daysLeft > 0 ? daysLeft : '当日'}
              </Text>
              <Text style={[styles.statsBarLabel, { color: theme.subText }]}>
                {daysLeft > 0 ? '日後に試験' : '🎯試験日！'}
              </Text>
            </>
          ) : (
            <>
              <Text style={[styles.statsBarNum, { color: theme.primary }]}>📅</Text>
              <Text style={[styles.statsBarLabel, { color: theme.subText }]}>試験日設定</Text>
            </>
          )}
        </TouchableOpacity>
        <View style={[styles.statsBarDivider, { backgroundColor: theme.border }]} />
        <View style={styles.statsBarItem}>
          <Text style={[styles.statsBarNum, { color: theme.primary }]}>{progress}%</Text>
          <Text style={[styles.statsBarLabel, { color: theme.subText }]}>完了率</Text>
        </View>
        <View style={[styles.statsBarDivider, { backgroundColor: theme.border }]} />
        <View style={styles.statsBarItem}>
          <Text style={[styles.statsBarNum, { color: theme.primary }]}>
            {books.filter(b => b.status === '完了').length}/{books.length}
          </Text>
          <Text style={[styles.statsBarLabel, { color: theme.subText }]}>教材</Text>
        </View>
        {(() => {
          const est = getEstimatedCompletion();
          if (!est) return null;
          const daysLeft = getDaysLeft();
          const isLate = daysLeft !== null && est.days > daysLeft;
          return (
            <>
              <View style={[styles.statsBarDivider, { backgroundColor: theme.border }]} />
              <TouchableOpacity style={styles.statsBarItem}>
                <Text style={[styles.statsBarNum, { color: isLate ? '#E53935' : theme.primary, fontSize: 14 }]}>
                  {isLate ? '⚠️ ' : '📆 '}{est.date}
                </Text>
                <Text style={[styles.statsBarLabel, { color: isLate ? '#E53935' : theme.subText }]}>
                  {isLate ? '間に合わない！' : '推定完了日'}
                </Text>
              </TouchableOpacity>
            </>
          );
        })()}
      </View>

      {/* 進捗バー */}
      <View style={styles.progressBarBg}>
        <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
      </View>

      {/* タイマー */}
      {selectedBook && (
        <View style={styles.timerBox}>
          <Text style={styles.timerBook}>🍅 {selectedBook.title}</Text>
          <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
          <TouchableOpacity style={styles.stopBtn} onPress={stopTimer}>
            <Text style={styles.stopBtnText}>終了</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 参考書追加ボタン */}
      <TouchableOpacity
        style={[styles.addBookBtn, { backgroundColor: theme.card, borderColor: theme.primary }]}
        onPress={() => setShowAddBook(true)}
      >
        <Text style={styles.addBookBtnText}>＋ 参考書を追加</Text>
      </TouchableOpacity>

      {/* 参考書リスト */}
      {loading ? (
        <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 60 }} />
      ) : (
        <DraggableFlatList
          data={books}
          keyExtractor={item => item.id}
          onDragEnd={async ({ data }) => {
            setBooks(data);
            await Promise.all(data.map((book, index) =>
              supabase.from('my_books').update({ position: index }).eq('id', book.id)
            ));
          }}
          renderItem={({ item, drag, isActive }) => {
            const pageProgress = item.total_pages > 0
              ? Math.round((item.current_page / item.total_pages) * 100) : null;
            return (
              <ScaleDecorator>
                <View style={[styles.card, { backgroundColor: theme.card },
                  isActive && { opacity: 0.9, elevation: 8 }]}>
                  {/* 長押しハンドル */}
                  <TouchableOpacity onLongPress={drag} style={styles.dragHandle}>
                    <Text style={[styles.dragIcon, { color: theme.subText }]}>☰</Text>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={() => pickImage(item)} style={styles.imageArea}>
                    {item.local_image_uri ? (
                      <Image source={{ uri: item.local_image_uri }} style={styles.bookImage} />
                    ) : (
                      <View style={[styles.imagePlaceholder, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
                        <Text style={styles.imagePlaceholderText}>📷</Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  <View style={styles.cardMiddle}>
                    <Text style={[styles.bookTitle, { color: theme.text }]}>{item.title}</Text>
                    <Text style={[styles.pomodoros, { color: theme.subText }]}>
                      🍅 {item.pomodoros}ポモ
                      {item.extra_minutes > 0 ? ` +${item.extra_minutes}分` : ''}
                    </Text>
                    {item.total_pages > 0 && (
                      <TouchableOpacity onPress={() => openPageModal(item)}>
                        <View style={styles.pageRow}>
                          <View style={[styles.pageBarBg, { backgroundColor: theme.border }]}>
                            <View style={[styles.pageBarFill, { width: `${pageProgress}%` }]} />
                          </View>
                          <Text style={[styles.pageText, { color: theme.subText }]}>
                            {item.current_page}/{item.total_pages}p
                          </Text>
                        </View>
                      </TouchableOpacity>
                    )}
                    {item.next_review_date && (
                      <Text style={styles.reviewDate}>🔁 復習: {item.next_review_date}</Text>
                    )}
                    {item.memo ? (
                      <TouchableOpacity onPress={() => openMemoModal(item)}>
                        <Text style={[styles.memoPreview, { color: theme.subText }]} numberOfLines={1}>
                          📝 {item.memo}
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity onPress={() => openMemoModal(item)}>
                        <Text style={[styles.memoAdd, { color: theme.primary }]}>＋ メモを追加</Text>
                      </TouchableOpacity>
                    )}
                    {item.reference_url ? (
                      <TouchableOpacity onPress={() => window.open(item.reference_url, '_blank')}>
                        <Text style={[styles.urlLink, { color: theme.primary }]} numberOfLines={1}>
                          🔗 {item.reference_url}
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>

                  <View style={styles.cardRight}>
                    <TouchableOpacity
                      style={[styles.statusBadge, { backgroundColor: statusColor(item.status) }]}
                      onPress={() => cycleStatus(item)}
                    >
                      <Text style={styles.statusText}>{item.status}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.startBtn}
                      onPress={() => startTimer(item)}
                      disabled={timerRunning}
                    >
                      <Text style={styles.startBtnText}>▶</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteBook(item)}>
                      <Text style={styles.deleteBtnText}>🗑</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </ScaleDecorator>
            );
          }}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: theme.subText }]}>参考書を追加してルートを作ろう</Text>
          }
        />
      )}

      {/* 完了アニメーション */}
      {showCelebration && (
        <Animated.View style={[styles.celebOverlay, celebAnimStyle]}>
          <View style={styles.celebBox}>
            <Text style={styles.celebEmoji}>🎉</Text>
            <Text style={styles.celebTitle}>完了！</Text>
            <Text style={styles.celebSub}>よくがんばりました！</Text>
          </View>
        </Animated.View>
      )}

      {/* メモモーダル */}
      <Modal visible={showMemoModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>📝 メモ</Text>
            <Text style={[styles.modalSub, { color: theme.subText }]}>{memoBook?.title}</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
              placeholder="メモを入力..."
              placeholderTextColor={theme.subText}
              value={memoInput}
              onChangeText={setMemoInput}
              multiline
              numberOfLines={4}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowMemoModal(false)}>
                <Text style={styles.cancelBtnText}>キャンセル</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.doneBtn} onPress={saveMemo}>
                <Text style={styles.doneBtnText}>保存</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 参考書追加モーダル */}
      <Modal visible={showAddBook} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>📖 参考書を追加</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
              placeholder="参考書名"
              placeholderTextColor={theme.subText}
              value={title}
              onChangeText={setTitle}
            />
            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
              placeholder="総ページ数（任意）"
              placeholderTextColor={theme.subText}
              value={totalPages}
              onChangeText={setTotalPages}
              keyboardType="numeric"
            />
            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
              placeholder="参考URL（任意・自分のみ見えます）"
              placeholderTextColor={theme.subText}
              value={referenceUrl}
              onChangeText={setReferenceUrl}
              autoCapitalize="none"
              keyboardType="url"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn}
                onPress={() => { setShowAddBook(false); setTitle(''); setTotalPages(''); setReferenceUrl(''); }}>
                <Text style={styles.cancelBtnText}>キャンセル</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.doneBtn} onPress={addBook}>
                <Text style={styles.doneBtnText}>追加</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ページ進捗モーダル */}
      <Modal visible={showPageModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>📄 現在のページ</Text>
            <Text style={[styles.modalSub, { color: theme.subText }]}>{editingBook?.title}</Text>
            <Text style={[styles.modalSub, { color: theme.subText }]}>全{editingBook?.total_pages}ページ</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
              placeholder="現在のページ"
              placeholderTextColor={theme.subText}
              value={pageInput}
              onChangeText={setPageInput}
              keyboardType="numeric"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowPageModal(false)}>
                <Text style={styles.cancelBtnText}>キャンセル</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.doneBtn} onPress={saveCurrentPage}>
                <Text style={styles.doneBtnText}>保存</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 試験日設定モーダル */}
      <Modal visible={showExamDateModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>📅 試験日を設定</Text>
            <Text style={[styles.modalSub, { color: theme.subText }]}>{currentRoute}</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
              placeholder="例：2026-06-15"
              placeholderTextColor={theme.subText}
              value={examDateInput}
              onChangeText={setExamDateInput}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowExamDateModal(false)}>
                <Text style={styles.cancelBtnText}>キャンセル</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.doneBtn} onPress={saveExamDate}>
                <Text style={styles.doneBtnText}>設定</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ルート追加モーダル */}
      <Modal visible={showAddRoute} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>➕ ルートを追加</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
              placeholder="ルート名（例：数学・英語）"
              placeholderTextColor={theme.subText}
              value={newRouteName}
              onChangeText={setNewRouteName}
            />
            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
              placeholder="試験日（任意）例：2026-06-15"
              placeholderTextColor={theme.subText}
              value={newRouteExamDate}
              onChangeText={setNewRouteExamDate}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => { setShowAddRoute(false); setNewRouteName(''); setNewRouteExamDate(''); }}
              >
                <Text style={styles.cancelBtnText}>キャンセル</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.doneBtn} onPress={addRoute}>
                <Text style={styles.doneBtnText}>追加</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ポモドーロ完了モーダル */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>🍅 ポモドーロ完了！</Text>
            <Text style={[styles.modalSub, { color: theme.subText }]}>{selectedBook?.title}</Text>
            <ScoreSelector label="集中度" value={focus} onChange={setFocus} />
            <ScoreSelector label="理解度" value={understanding} onChange={setUnderstanding} />
            {selectedBook?.total_pages > 0 && (
              <>
                <Text style={[styles.scoreLabel, { color: theme.text }]}>
                  今どこまで進んだ？（現在: {selectedBook?.current_page}p / 全{selectedBook?.total_pages}p）
                </Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
                  placeholder={`例：${selectedBook?.current_page + 10}`}
                  placeholderTextColor={theme.subText}
                  value={pomoEndPage}
                  onChangeText={setPomoEndPage}
                  keyboardType="numeric"
                />
              </>
            )}
            <Text style={[styles.scoreLabel, { color: theme.text }]}>次回復習日（任意）</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
              placeholder="例：2026-03-10"
              placeholderTextColor={theme.subText}
              value={nextReviewDate}
              onChangeText={setNextReviewDate}
            />
            {/* 手動で完了にするボタン */}
            <TouchableOpacity
              style={[styles.completeBookBtn, {
                display: selectedBook?.status !== '完了' ? 'flex' : 'none'
              }]}
              onPress={async () => {
                await supabase.from('my_books').update({ status: '完了' }).eq('id', selectedBook.id);
                setBooks(books.map(b => b.id === selectedBook.id ? { ...b, status: '完了' } : b));
                showCelebrationAnim();
                finishPomodoro();
              }}
            >
              <Text style={styles.completeBookBtnText}>✅ この教材を完了にする</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.doneBtn} onPress={finishPomodoro}>
              <Text style={styles.doneBtnText}>記録して閉じる</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 今日どれやろう？モーダル */}
      <Modal visible={showTodayModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>🎲 今日はこれをやろう！</Text>
            <View style={[styles.suggestionCard, { backgroundColor: theme.inputBg }]}>
              <Text style={[styles.suggestionTitle, { color: theme.text }]}>{todaySuggestion?.title}</Text>
              <Text style={[styles.suggestionPomo, { color: theme.subText }]}>🍅 {todaySuggestion?.pomodoros}ポモ済み</Text>
              {todaySuggestion?.total_pages > 0 && (
                <Text style={[styles.suggestionPage, { color: theme.subText }]}>
                  📄 {todaySuggestion?.current_page}/{todaySuggestion?.total_pages}p
                </Text>
              )}
              {todaySuggestion?.memo ? (
                <Text style={[styles.suggestionMemo, { color: theme.subText }]} numberOfLines={2}>
                  📝 {todaySuggestion?.memo}
                </Text>
              ) : null}
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowTodayModal(false)}>
                <Text style={styles.cancelBtnText}>閉じる</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.doneBtn} onPress={() => {
                setShowTodayModal(false);
                startTimer(todaySuggestion);
              }}>
                <Text style={styles.doneBtnText}>▶ 開始する</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.reshuffleBtn} onPress={suggestToday}>
              <Text style={styles.reshuffleBtnText}>🔀 別の教材を提案</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 公開モーダル */}
      <Modal visible={showPublishModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>🌏 ルートを公開</Text>
            <Text style={[styles.modalNote, { color: theme.subText }]}>※画像は共有されません</Text>
            <TextInput style={[styles.modalInput, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
              placeholder="ルートのタイトル" placeholderTextColor={theme.subText}
              value={publishTitle} onChangeText={setPublishTitle} />
            <TextInput style={[styles.modalInput, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
              placeholder="志望校・資格" placeholderTextColor={theme.subText}
              value={publishTarget} onChangeText={setPublishTarget} />
            <TextInput style={[styles.modalInput, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
              placeholder="学習日数（例：90）" placeholderTextColor={theme.subText}
              value={studyDays} onChangeText={setStudyDays} keyboardType="numeric" />
            <View style={styles.switchRow}>
              <Text style={[styles.switchLabel, { color: theme.text }]}>合格済み</Text>
              <Switch value={isPassed} onValueChange={setIsPassed} trackColor={{ true: theme.primary }} />
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowPublishModal(false)}>
                <Text style={styles.cancelBtnText}>キャンセル</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.doneBtn} onPress={publishRoute}>
                <Text style={styles.doneBtnText}>公開する</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ルート完了→公開提案モーダル */}
      <Modal visible={showCompleteRouteModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: theme.card }]}>
            <Text style={styles.celebEmoji}>🎉</Text>
            <Text style={[styles.modalTitle, { color: theme.text }]}>ルート完走！</Text>
            <Text style={[styles.modalSub, { color: theme.subText }]}>
              「{currentRoute}」の全教材が完了しました！{'\n'}
              このルートを他の人にシェアしませんか？{'\n'}
              ※画像・URLは公開されません
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowCompleteRouteModal(false)}
              >
                <Text style={styles.cancelBtnText}>あとで</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.doneBtn}
                onPress={() => {
                  setShowCompleteRouteModal(false);
                  setShowPublishModal(true);
                }}
              >
                <Text style={styles.doneBtnText}>公開する🌏</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  header: { fontSize: 22, fontWeight: 'bold' },
  headerButtons: { flexDirection: 'row', gap: 6 },
  todayBtn: { backgroundColor: '#FF9800', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  todayBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 11 },
  publishBtn: { backgroundColor: '#5C6BC0', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  publishBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 11 },
  logoutBtn: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  logoutBtnText: { fontWeight: 'bold', fontSize: 11 },
  routeTabs: { flexDirection: 'row', marginBottom: 12, maxHeight: 44 },
  routeTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, marginRight: 8, height: 36 },
  routeTabActive: { backgroundColor: '#5C6BC0', borderColor: '#5C6BC0' },
  routeTabText: { fontSize: 13 },
  routeTabTextActive: { color: '#fff', fontWeight: 'bold' },
  addRouteBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#5C6BC0', marginRight: 8, height: 36 },
  addRouteBtnText: { fontSize: 13, color: '#5C6BC0' },
  statsBar: { borderRadius: 12, padding: 12, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', marginBottom: 8, elevation: 2 },
  statsBarItem: { alignItems: 'center', flex: 1 },
  statsBarNum: { fontSize: 20, fontWeight: 'bold' },
  statsBarLabel: { fontSize: 11, marginTop: 2 },
  statsBarDivider: { width: 1, height: 32 },
  progressBarBg: { backgroundColor: '#E0E0E0', borderRadius: 8, height: 8, marginBottom: 12 },
  progressBarFill: { backgroundColor: '#5C6BC0', borderRadius: 8, height: 8, minWidth: 4 },
  timerBox: { backgroundColor: '#5C6BC0', borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 12 },
  timerBook: { color: '#fff', fontSize: 14, marginBottom: 8 },
  timerText: { color: '#fff', fontSize: 48, fontWeight: 'bold', marginBottom: 12 },
  stopBtn: { backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 24, paddingVertical: 8 },
  stopBtnText: { color: '#5C6BC0', fontWeight: 'bold' },
  addBookBtn: { borderRadius: 10, padding: 14, alignItems: 'center', marginBottom: 12, borderWidth: 1, borderStyle: 'dashed' },
  addBookBtnText: { color: '#5C6BC0', fontWeight: 'bold', fontSize: 15 },
  card: { borderRadius: 12, padding: 12, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 12, elevation: 2 },
  imageArea: { width: 56, height: 56 },
  bookImage: { width: 56, height: 56, borderRadius: 8 },
  imagePlaceholder: { width: 56, height: 56, borderRadius: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderStyle: 'dashed' },
  imagePlaceholderText: { fontSize: 20 },
  cardMiddle: { flex: 1 },
  cardRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bookTitle: { fontSize: 15, fontWeight: '600' },
  pomodoros: { fontSize: 12, marginTop: 2 },
  pageRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  pageBarBg: { flex: 1, borderRadius: 4, height: 6 },
  pageBarFill: { backgroundColor: '#FF9800', borderRadius: 4, height: 6, minWidth: 2 },
  pageText: { fontSize: 11 },
  reviewDate: { fontSize: 11, color: '#5C6BC0', marginTop: 2 },
  memoPreview: { fontSize: 11, marginTop: 2 },
  memoAdd: { fontSize: 11, marginTop: 2 },
  statusBadge: { borderRadius: 16, paddingHorizontal: 8, paddingVertical: 6 },
  statusText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  startBtn: { backgroundColor: '#FF7043', borderRadius: 8, padding: 8 },
  startBtnText: { color: '#fff', fontSize: 14 },
  deleteBtn: { backgroundColor: '#FFEBEE', borderRadius: 8, padding: 8 },
  deleteBtnText: { fontSize: 14 },
  dragHandle: { paddingHorizontal: 4, justifyContent: 'center' },
  dragIcon: { fontSize: 18 },
  empty: { textAlign: 'center', marginTop: 60, fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  modalBox: { borderRadius: 20, padding: 24 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
  modalSub: { fontSize: 14, textAlign: 'center', marginBottom: 12 },
  modalNote: { fontSize: 12, textAlign: 'center', marginBottom: 16 },
  modalInput: { borderRadius: 8, padding: 12, fontSize: 15, marginBottom: 12, borderWidth: 1 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  switchLabel: { fontSize: 15, fontWeight: '600' },
  modalButtons: { flexDirection: 'row', gap: 8 },
  cancelBtn: { flex: 1, borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#ddd' },
  cancelBtnText: { fontSize: 16, color: '#666' },
  scoreRow: { marginBottom: 16 },
  scoreLabel: { fontSize: 15, fontWeight: '600', marginBottom: 8 },
  scoreButtons: { flexDirection: 'row', gap: 8 },
  scoreBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: '#ddd', justifyContent: 'center', alignItems: 'center' },
  scoreBtnActive: { borderColor: '#5C6BC0', backgroundColor: '#5C6BC0' },
  scoreBtnText: { fontSize: 16, color: '#666' },
  scoreBtnTextActive: { color: '#fff' },
  doneBtn: { flex: 1, backgroundColor: '#5C6BC0', borderRadius: 12, padding: 16, alignItems: 'center' },
  doneBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  suggestionCard: { borderRadius: 12, padding: 16, marginBottom: 16 },
  suggestionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  suggestionPomo: { fontSize: 14, marginBottom: 4 },
  suggestionPage: { fontSize: 14 },
  suggestionMemo: { fontSize: 13, marginTop: 4 },
  reshuffleBtn: { alignItems: 'center', marginTop: 12 },
  reshuffleBtnText: { color: '#5C6BC0', fontSize: 14 },
  celebOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  celebBox: {
    backgroundColor: '#5C6BC0',
    borderRadius: 24,
    padding: 40,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  celebEmoji: { fontSize: 64, marginBottom: 12 },
  celebTitle: { fontSize: 32, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  celebSub: { fontSize: 16, color: '#fff', opacity: 0.9 },
  completeBookBtn: {
    borderWidth: 2, borderColor: '#4CAF50', borderRadius: 12,
    padding: 14, alignItems: 'center', marginBottom: 8
  },
  completeBookBtnText: { color: '#4CAF50', fontSize: 15, fontWeight: 'bold' },
  urlLink: { fontSize: 11, marginTop: 2, textDecorationLine: 'underline' },
});