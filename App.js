import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import MyRouteScreen from './screens/MyRouteScreen';
import ExploreScreen from './screens/ExploreScreen';
import StatsScreen from './screens/StatsScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator screenOptions={{ headerShown: false }}>
        <Tab.Screen
          name="マイルート"
          component={MyRouteScreen}
          options={{ tabBarIcon: () => <Text>📚</Text> }}
        />
        <Tab.Screen
          name="探す"
          component={ExploreScreen}
          options={{ tabBarIcon: () => <Text>🔍</Text> }}
        />
        <Tab.Screen
          name="統計"
          component={StatsScreen}
          options={{ tabBarIcon: () => <Text>📊</Text> }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}