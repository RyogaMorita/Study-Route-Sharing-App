import { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, ActivityIndicator, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './lib/supabase';
import { ThemeProvider, useTheme } from './lib/ThemeContext';
import MyRouteScreen from './screens/MyRouteScreen';
import ExploreScreen from './screens/ExploreScreen';
import StatsScreen from './screens/StatsScreen';
import AuthScreen from './screens/AuthScreen';
import ProfileSetupScreen from './screens/ProfileSetupScreen';
import MyPublishedScreen from './screens/MyPublishedScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import FriendsScreen from './screens/FriendsScreen';
import RankingScreen from './screens/RankingScreen';
import SettingsScreen from './screens/SettingsScreen';

const Tab = createBottomTabNavigator();

function MainTabs() {
  const { theme } = useTheme();

  const tabBarStyle = {
    backgroundColor: theme.tabBarBg,
    borderTopColor: theme.border,
    borderTopWidth: 1,
    height: 60,
    paddingBottom: 8,
    paddingTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 10,
  };

  const screenOptions = {
    headerShown: false,
    tabBarStyle,
    tabBarActiveTintColor: theme.primary,
    tabBarInactiveTintColor: theme.subText,
    tabBarLabelStyle: { fontSize: 10, fontWeight: '600', marginBottom: 2 },
  };

  return (
    <Tab.Navigator screenOptions={screenOptions}>
      <Tab.Screen
        name="マイルート"
        component={MyRouteScreen}
        options={{ tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>📚</Text> }}
      />
      <Tab.Screen
        name="探す"
        component={ExploreScreen}
        options={{ tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>🔍</Text> }}
      />
      <Tab.Screen
        name="統計"
        component={StatsScreen}
        options={{ tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>📊</Text> }}
      />
      <Tab.Screen
        name="公開中"
        component={MyPublishedScreen}
        options={{ tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>🌏</Text> }}
      />
      <Tab.Screen
        name="フレンド"
        component={FriendsScreen}
        options={{ tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>👥</Text> }}
      />
      <Tab.Screen
        name="ランキング"
        component={RankingScreen}
        options={{ tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>🏆</Text> }}
      />
      <Tab.Screen
        name="設定"
        component={SettingsScreen}
        options={{ tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>⚙️</Text> }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasProfile, setHasProfile] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) checkProfile(session.user.id);
      else setLoading(false);
    });
    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) checkProfile(session.user.id);
      else { setHasProfile(false); setLoading(false); }
    });
  }, []);

  useEffect(() => {
    const checkMonthlyBadges = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const now = new Date();
        const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const lastCheck = await AsyncStorage.getItem('lastBadgeCheck');

        if (lastCheck === month) return;

        await supabase.functions.invoke('award-monthly-badges');
        await AsyncStorage.setItem('lastBadgeCheck', month);
      } catch (e) {
        console.log('badge check error:', e);
      }
    };

    checkMonthlyBadges();
  }, []);

  const checkProfile = async (userId) => {
    const { data } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('user_id', userId)
      .single();
    setHasProfile(!!data);
    setLoading(false);
  };

  if (loading) return (
    <ThemeProvider>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#5C6BC0" />
      </View>
    </ThemeProvider>
  );

  if (!session) return <ThemeProvider><AuthScreen /></ThemeProvider>;
  if (!hasProfile) return (
    <ThemeProvider>
      <ProfileSetupScreen onComplete={() => setHasProfile(true)} />
    </ThemeProvider>
  );

  return (
    <ThemeProvider>
      <NavigationContainer>
        <MainTabs />
      </NavigationContainer>
    </ThemeProvider>
  );
}