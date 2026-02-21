import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar, Text } from 'react-native';

import EditorScreen from './src/screens/EditorScreen';
import CompareScreen from './src/screens/CompareScreen';
import ProblemsScreen from './src/screens/ProblemsScreen';

import { useStore } from './src/store/useStore';
import { Colors, Typography } from './src/constants/theme';

const Tab = createBottomTabNavigator();

// Lightweight text-based tab icons
function TabIcon({ label, focused, color }: { label: string; focused: boolean; color: string }) {
  const icons: Record<string, string> = {
    Editor: '{ }',
    Problems: '☰',
    Compare: '⟷',
  };
  return (
    <Text
      style={{
        color,
        fontSize: focused ? 18 : 16,
        fontFamily: Typography.mono,
        fontWeight: focused ? '700' : '400',
      }}
    >
      {icons[label] ?? label[0]}
    </Text>
  );
}

export default function App() {
  const loadProblems = useStore((s) => s.loadProblems);

  useEffect(() => {
    loadProblems();
  }, []);

  return (
    <NavigationContainer
      theme={{
        dark: true,
        fonts: {
          regular: { fontFamily: 'System', fontWeight: '400' },
          medium: { fontFamily: 'System', fontWeight: '500' },
          bold: { fontFamily: 'System', fontWeight: '700' },
          heavy: { fontFamily: 'System', fontWeight: '900' },
        },
        colors: {
          primary: Colors.accent,
          background: Colors.bg1,
          card: Colors.bg1,
          text: Colors.text,
          border: Colors.border,
          notification: Colors.accent,
        },
      }}
    >
      <StatusBar barStyle="light-content" backgroundColor={Colors.bg0} />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarStyle: {
            backgroundColor: Colors.bg1,
            borderTopColor: Colors.border,
            borderTopWidth: 1,
            height: 60,
            paddingBottom: 8,
          },
          tabBarActiveTintColor: Colors.accent,
          tabBarInactiveTintColor: Colors.textFaint,
          tabBarLabelStyle: {
            fontFamily: Typography.mono,
            fontSize: 11,
            marginTop: 2,
          },
          tabBarIcon: ({ focused, color }) => (
            <TabIcon label={route.name} focused={focused} color={color} />
          ),
        })}
      >
        <Tab.Screen name="Editor" component={EditorScreen} />
        <Tab.Screen name="Problems" component={ProblemsScreen} />
        <Tab.Screen name="Compare" component={CompareScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
