import { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, Dimensions
} from 'react-native';
import { useTheme } from '../lib/ThemeContext';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    emoji: '📚',
    title: 'ルートを設計しよう',
    desc: '参考書を登録して、志望校・資格への学習ルートを作ろう。ページ数を登録すれば進捗も一目でわかる。',
    color: '#5C6BC0',
  },
  {
    emoji: '🍅',
    title: 'ポモドーロで集中',
    desc: '25分集中・5分休憩のサイクルで効率よく学習。集中度・理解度を記録して振り返りも充実。',
    color: '#FF7043',
  },
  {
    emoji: '📊',
    title: '統計で成長を実感',
    desc: '週間グラフやストリークで学習の積み重ねを可視化。復習リマインドで忘れない学習習慣を。',
    color: '#4CAF50',
  },
  {
    emoji: '🔍',
    title: 'ルートをシェアしよう',
    desc: '合格者のルートをコピーして活用。自分のルートを公開して他の人の役に立てよう。',
    color: '#FF9800',
  },
  {
    emoji: '🤖',
    title: 'AIコーチに相談',
    desc: 'あなたの学習状況を分析して、今日やるべきことを提案。学習の悩みも気軽に相談できる。',
    color: '#7986CB',
  },
];

export default function OnboardingScreen({ onComplete }) {
  const { theme } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollRef = useRef(null);

  const goNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      const next = currentIndex + 1;
      scrollRef.current?.scrollTo({ x: next * width, animated: true });
      setCurrentIndex(next);
    } else {
      onComplete();
    }
  };

  const goTo = (index) => {
    scrollRef.current?.scrollTo({ x: index * width, animated: true });
    setCurrentIndex(index);
  };

  const slide = SLIDES[currentIndex];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* スキップ */}
      <TouchableOpacity style={styles.skipBtn} onPress={onComplete}>
        <Text style={[styles.skipText, { color: theme.subText }]}>スキップ</Text>
      </TouchableOpacity>

      {/* スライド */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        style={styles.slides}
      >
        {SLIDES.map((s, i) => (
          <View key={i} style={[styles.slide, { width }]}>
            <View style={[styles.emojiCircle, { backgroundColor: s.color }]}>
              <Text style={styles.emoji}>{s.emoji}</Text>
            </View>
            <Text style={[styles.title, { color: theme.text }]}>{s.title}</Text>
            <Text style={[styles.desc, { color: theme.subText }]}>{s.desc}</Text>
          </View>
        ))}
      </ScrollView>

      {/* ドットインジケーター */}
      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <TouchableOpacity key={i} onPress={() => goTo(i)}>
            <View style={[
              styles.dot,
              { backgroundColor: i === currentIndex ? slide.color : theme.border }
            ]} />
          </TouchableOpacity>
        ))}
      </View>

      {/* ボタン */}
      <TouchableOpacity
        style={[styles.nextBtn, { backgroundColor: slide.color }]}
        onPress={goNext}
      >
        <Text style={styles.nextBtnText}>
          {currentIndex === SLIDES.length - 1 ? 'はじめる 🚀' : '次へ →'}
        </Text>
      </TouchableOpacity>

      {/* ページ番号 */}
      <Text style={[styles.pageNum, { color: theme.subText }]}>
        {currentIndex + 1} / {SLIDES.length}
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  skipBtn: { alignSelf: 'flex-end', padding: 16 },
  skipText: { fontSize: 15 },
  slides: { flex: 1 },
  slide: { alignItems: 'center', justifyContent: 'center', padding: 40 },
  emojiCircle: {
    width: 140, height: 140, borderRadius: 70,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 40, elevation: 4,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10
  },
  emoji: { fontSize: 64 },
  title: { fontSize: 26, fontWeight: 'bold', textAlign: 'center', marginBottom: 16 },
  desc: { fontSize: 16, textAlign: 'center', lineHeight: 26 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 24 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  nextBtn: { marginHorizontal: 24, borderRadius: 16, padding: 18, alignItems: 'center', marginBottom: 12 },
  nextBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  pageNum: { textAlign: 'center', fontSize: 13, marginBottom: 16 }
});