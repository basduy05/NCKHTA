# 📱 iEdu React Native Mobile App Architecture & Integration Guide

This document outlines how the **React Native / Expo** mobile application consumes 100% of the centralized navigation configuration and business logic established in iEdu Phase 0 - Phase 4.

---

## 1. Core Principle: Zero-Duplication Navigation

Instead of maintaining a separate navigation tree for mobile, the mobile application imports configuration directly from `mobileNavAdapter.ts`:

```
                 ┌───────────────────────────┐
                 │   navigation.ts (Core)    │
                 └─────────────┬─────────────┘
                               │
               ┌───────────────┴───────────────┐
               ▼                               ▼
    ┌────────────────────┐          ┌───────────────────────┐
    │ Web Dashboard      │          │ Mobile Foundation     │
    │ (Sidebar/BottomNav)│          │ (mobileNavAdapter.ts) │
    └────────────────────┘          └───────────┬───────────┘
                                                │
                                                ▼
                                    ┌───────────────────────┐
                                    │ React Native / Expo   │
                                    │ Navigation Container  │
                                    └───────────────────────┘
```

---

## 2. React Native Implementation Example

### App.tsx (or navigation/index.tsx)

```tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import {
  getMobileTabScreens,
  getMobileStackScreens,
  getMobileLinkingConfig,
} from './mobile-foundation/mobileNavAdapter';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// 1. Bottom Tab Navigator generated dynamically
function MainTabs({ userRole, locale }: { userRole: string; locale: string }) {
  const tabs = getMobileTabScreens(userRole, locale);

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#2563eb', // --brand
        tabBarInactiveTintColor: '#64748b',
        headerShown: true,
      }}
    >
      {tabs.map((t) => (
        <Tab.Screen
          key={t.routeKey}
          name={t.name}
          component={getComponentForRoute(t.routeKey)}
          initialParams={t.initialParams}
          options={{
            title: t.title,
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name={t.iconName} color={color} size={size} />
            ),
          }}
        />
      ))}
    </Tab.Navigator>
  );
}

// 2. Root Navigator with Deep Linking
export default function App() {
  const userRole = 'student';
  const locale = 'vi';
  const linking = getMobileLinkingConfig(userRole);

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator>
        <Stack.Screen name="Main" options={{ headerShown: false }}>
          {() => <MainTabs userRole={userRole} locale={locale} />}
        </Stack.Screen>

        {/* Dynamic Plugin & Detail Screens */}
        <Stack.Screen name="PracticePlugin" component={PluginScreen} />
        <Stack.Screen name="ClassDetail" component={ClassDetailScreen} />
        <Stack.Screen name="ChatRoom" component={ChatRoomScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

---

## 3. Deep Linking Schema

The app supports universal URLs and custom scheme URIs:

| Universal Link | Custom Scheme | Target Destination |
| :--- | :--- | :--- |
| `https://iedu.app/dashboard/student?tab=learning` | `iedu://dashboard/student?tab=learning` | Lớp học Domain |
| `https://iedu.app/dashboard/student?tab=practice&sub=cambridge-test` | `iedu://domain/practice/cambridge-test` | Cambridge Mock Plugin |
| `https://iedu.app/classes/42` | `iedu://classes/42` | Chi tiết Lớp học #42 |
| `https://iedu.app/chat/10` | `iedu://chat/10` | Phòng chat nhóm #10 |

---

## 4. Reusing Shared Hooks and Business Logic

The following shared hooks are 100% platform-agnostic and ready for mobile:
1. **`usePersonalizedNav(role)`**: Manages pinned domains and usage frequency.
2. **`useI18n()`**: Provides instant localization (`vi`, `en`, `km`).
3. **`usePresence()`**: Real-time unread messages badge and student activity tracking.
4. **`pluginRegistry`**: Dynamically renders 3rd party plugins inside React Native views.
