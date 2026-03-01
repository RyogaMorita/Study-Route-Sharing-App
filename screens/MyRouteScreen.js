import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  FlatList, StyleSheet, SafeAreaView, Modal,
  ActivityIndicator, Switch
} from 'react-native';
import { supabase } from '../lib/supabase';

const USER_ID = 'local_user';

export default function MyRouteScreen() {
  const [books, setBooks] = useState([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedBook, setSelectedBook] = useState(null);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [showModal, setShowModal] = useState(false);
  const [focus, setFocus] = useState(3);
  const [understanding, setUnderstanding] = useState(3);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishTitle, setPublishTitle] = useState('');
  const [publishTarget, setPublishTarget] = useState('');
  const [isPassed, setIsPassed] = useState(false);
  const [studyDays, setStudyDays] = useState('');
  const intervalRef = useRef(null);

  useEffect(() => { fetchBooks(); }, []);

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

  const fetchBooks = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('my_books')
      .select('*')
      .eq('user_identifier', USER_ID)
      .order('position', { ascending: true });
    if (!error) setBooks(data);
    setLoading(false);
  };

  const addBook = async () => {
    if (!title.trim()) return;
    const newBook = {
      user_identifier: USER_ID,
      title,
      status: '未着手',
      pomodoros: 0,
      position: books.length
    };
    const { data, error } = await supabase
      .from('my_books')
      .insert(newBook)
      .select()
      .single();
    if (!error) setBooks([...books, data]);
    setTitle('');
  };

  const cycleStatus = async (book) => {
    const next = { '未着手': '進行中', '進行中': '完了', '完了': '未着手' };
    const newStatus = next[book.status];
    await supabase.from('my_books').update({ status: newStatus }).eq('id', book.id);
    setBooks(books.map(b => b.id === book.id ? { ...b, status: newStatus } : b));
  };

  const startTimer = (book) => {
    setSelectedBook(book);
    setTimeLeft(25 * 60);
    setTimerRunning(true);
  };

  const stopTimer = () => {
    clearInterval(intervalRef.current);
    setTimerRunning(false);
    setShowModal(true);
  };

  const finishPomodoro = async () => {
    const newCount = selectedBook.pomodoros + 1;
    await supabase.from('my_books').update({ pomodoros: newCount }).eq('id', selectedBook.id);
    setBooks(books.map(b =>
      b.id === selectedBook.id ? { ...b, pomodoros: newCount } : b
    ));
    setShowModal(false);
    setSelectedBook(null);
    setTimeLeft(25 * 60);
    setFocus(3);
    setUnderstanding(3);
  };

  const publishRoute = async () => {
    if (!publishTitle.trim() || !publishTarget.trim()) {
      alert('タイトルと志望校・資格を入力してください');
      return;
    }
    const totalPomodoros = books.reduce((sum, b) => sum + b.pomodoros, 0);
    const avgDaily = studyDays ? Math.round((totalPomodoros / parseInt(studyDays)) * 10) / 10 : 0;

    const { data: route, error } = await supabase
      .from('published_routes')
      .insert({
        user_identifier: USER_ID,
        title: publishTitle,
        target: publishTarget,
        is_passed: isPassed,
        study_days: parseInt(studyDays) || 0,
        total_pomodoros: totalPomodoros,
        avg_daily: avgDaily,
        likes_count: 0
      })
      .select()
      .single();

    if (error) { alert('公開に失敗しました'); return; }

    await supabase.from('published_books').insert(
      books.map((b, i) => ({
        route_id: route.id,
        title: b.title,
        position: i
      }))
    );

    setShowPublishModal(false);
    setPublishTitle('');
    setPublishTarget('');
    setIsPassed(false);
    setStudyDays('');
    alert('ルートを公開しました！');
  };

  const statusColor = (status) => {
    if (status === '完了') return '#4CAF50';
    if (status === '進行中') return '#FF9800';
    return '#9E9E9E';
  };

  const formatTime = (sec) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const ScoreSelector = ({ label, value, onChange }) => (
    <View style={styles.scoreRow}>
      <Text style={styles.scoreLabel}>{label}</Text>
      <View style={styles.scoreButtons}>
        {[1,2,3,4,5].map(n => (
          <TouchableOpacity
            key={n}
            style={[styles.scoreBtn, value === n && styles.scoreBtnActive]}
            onPress={() => onChange(n)}
          >
            <Text style={[styles.scoreBtnText, value === n && styles.scoreBtnTextActive]}>
              {n}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.header}>📚 マイルート</Text>
        <TouchableOpacity
          style={styles.publishBtn}
          onPress={() => setShowPublishModal(true)}
        >
          <Text style={styles.publishBtnText}>公開する</Text>
        </TouchableOpacity>
      </View>

      {selectedBook && (
        <View style={styles.timerBox}>
          <Text style={styles.timerBook}>🍅 {selectedBook.title}</Text>
          <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
          <TouchableOpacity style={styles.stopBtn} onPress={stopTimer}>
            <Text style={styles.stopBtnText}>終了</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="参考書名を入力"
          value={title}
          onChangeText={setTitle}
        />
        <TouchableOpacity style={styles.addButton} onPress={addBook}>
          <Text style={styles.addButtonText}>追加</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#5C6BC0" style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={books}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardLeft}>
                <Text style={styles.bookTitle}>{item.title}</Text>
                <Text style={styles.pomodoros}>🍅 {item.pomodoros}ポモ</Text>
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
              </View>
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>参考書を追加してルートを作ろう</Text>
          }
        />
      )}

      {/* ポモドーロ完了モーダル */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>🍅 ポモドーロ完了！</Text>
            <Text style={styles.modalBook}>{selectedBook?.title}</Text>
            <ScoreSelector label="集中度" value={focus} onChange={setFocus} />
            <ScoreSelector label="理解度" value={understanding} onChange={setUnderstanding} />
            <TouchableOpacity style={styles.doneBtn} onPress={finishPomodoro}>
              <Text style={styles.doneBtnText}>記録して閉じる</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 公開モーダル */}
      <Modal visible={showPublishModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>🌏 ルートを公開</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="ルートのタイトル（例：東大理系数学ルート）"
              value={publishTitle}
              onChangeText={setPublishTitle}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="志望校・資格（例：東京大学・基本情報技術者）"
              value={publishTarget}
              onChangeText={setPublishTarget}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="学習日数（例：90）"
              value={studyDays}
              onChangeText={setStudyDays}
              keyboardType="numeric"
            />
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>合格済み</Text>
              <Switch
                value={isPassed}
                onValueChange={setIsPassed}
                trackColor={{ true: '#5C6BC0' }}
              />
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowPublishModal(false)}
              >
                <Text style={styles.cancelBtnText}>キャンセル</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.doneBtn} onPress={publishRoute}>
                <Text style={styles.doneBtnText}>公開する</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5', padding: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  header: { fontSize: 24, fontWeight: 'bold' },
  publishBtn: { backgroundColor: '#5C6BC0', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  publishBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  timerBox: {
    backgroundColor: '#5C6BC0', borderRadius: 16, padding: 20,
    alignItems: 'center', marginBottom: 16
  },
  timerBook: { color: '#fff', fontSize: 14, marginBottom: 8 },
  timerText: { color: '#fff', fontSize: 48, fontWeight: 'bold', marginBottom: 12 },
  stopBtn: { backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 24, paddingVertical: 8 },
  stopBtnText: { color: '#5C6BC0', fontWeight: 'bold' },
  inputRow: { flexDirection: 'row', marginBottom: 16, gap: 8 },
  input: {
    flex: 1, backgroundColor: '#fff', borderRadius: 8,
    padding: 12, fontSize: 16, borderWidth: 1, borderColor: '#ddd'
  },
  addButton: { backgroundColor: '#5C6BC0', borderRadius: 8, padding: 12, justifyContent: 'center' },
  addButtonText: { color: '#fff', fontWeight: 'bold' },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    marginBottom: 10, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between',
    elevation: 2
  },
  cardLeft: { flex: 1 },
  cardRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bookTitle: { fontSize: 16, fontWeight: '600' },
  pomodoros: { fontSize: 13, color: '#888', marginTop: 4 },
  statusBadge: { borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  statusText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  startBtn: { backgroundColor: '#FF7043', borderRadius: 8, padding: 10 },
  startBtnText: { color: '#fff', fontSize: 16 },
  empty: { textAlign: 'center', color: '#aaa', marginTop: 60, fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  modalBox: { backgroundColor: '#fff', borderRadius: 20, padding: 24 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 16 },
  modalBook: { fontSize: 15, color: '#666', textAlign: 'center', marginBottom: 20 },
  modalInput: {
    backgroundColor: '#F5F5F5', borderRadius: 8, padding: 12,
    fontSize: 15, marginBottom: 12, borderWidth: 1, borderColor: '#ddd'
  },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  switchLabel: { fontSize: 15, fontWeight: '600' },
  modalButtons: { flexDirection: 'row', gap: 8 },
  cancelBtn: { flex: 1, borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#ddd' },
  cancelBtnText: { fontSize: 16, color: '#666' },
  scoreRow: { marginBottom: 16 },
  scoreLabel: { fontSize: 15, fontWeight: '600', marginBottom: 8 },
  scoreButtons: { flexDirection: 'row', gap: 8 },
  scoreBtn: {
    width: 44, height: 44, borderRadius: 22,
    borderWidth: 2, borderColor: '#ddd',
    justifyContent: 'center', alignItems: 'center'
  },
  scoreBtnActive: { borderColor: '#5C6BC0', backgroundColor: '#5C6BC0' },
  scoreBtnText: { fontSize: 16, color: '#666' },
  scoreBtnTextActive: { color: '#fff' },
  doneBtn: { flex: 1, backgroundColor: '#5C6BC0', borderRadius: 12, padding: 16, alignItems: 'center' },
  doneBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});