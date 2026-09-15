/**
 * 📱 iEdu React Native Navigation Foundation Adapter
 *
 * This headless adapter translates the central NAVIGATION_CONFIG into standard
 * React Navigation (BottomTabNavigator & NativeStackNavigator) configurations.
 * Allows 100% reuse of navigation schemas, deep linking, and roles across Web and Mobile.
 */

import { NAVIGATION_CONFIG, resolveLocalizedLabel } from "../config/navigation";
import { pluginRegistry } from "../plugins/pluginRegistry";

export interface MobileScreenConfig {
  name: string;
  routeKey: string;
  title: string;
  iconName: string;
  domain?: string;
  subIds?: string[];
  initialParams?: Record<string, any>;
  isPlugin?: boolean;
}

export interface MobileLinkingConfig {
  prefixes: string[];
  config: {
    screens: Record<string, any>;
  };
}

// Maps Lucide React icons to typical Expo vector icon names (e.g. Ionicons / MaterialCommunityIcons)
const ICON_NAME_MAP: Record<string, string> = {
  LayoutDashboard: "view-dashboard-outline",
  GraduationCap: "school-outline",
  Users: "account-group-outline",
  BookOpen: "book-open-page-variant-outline",
  Award: "trophy-outline",
  Sparkles: "auto-fix",
  TrendingUp: "chart-line",
  MessageSquare: "chat-outline",
  Database: "database-outline",
  BookText: "book-outline",
  ClipboardList: "clipboard-text-outline",
  Settings: "cog-outline",
  MessageCircleWarning: "alert-circle-outline",
  BarChart3: "chart-bar",
};

/**
 * Generates Bottom Tab Navigator screen definitions for React Native
 */
export function getMobileTabScreens(role: string = "student", locale: string = "vi"): MobileScreenConfig[] {
  const normRole = (role || "").toLowerCase();
  const config = NAVIGATION_CONFIG[normRole] || NAVIGATION_CONFIG.student;
  const bottomItems = config.bottomNav(`/dashboard/${normRole}`);

  return bottomItems.map((item) => {
    const iconFn = item.icon as any;
    const iconName = iconFn?.displayName || iconFn?.name || "circle";
    const mappedIcon = ICON_NAME_MAP[iconName] || "circle-outline";
    const title = resolveLocalizedLabel(item, locale);

    return {
      name: item.name,
      routeKey: item.ids[0] || item.name.toLowerCase(),
      title,
      iconName: mappedIcon,
      domain: item.ids[0],
      subIds: item.ids,
      initialParams: {
        domain: item.ids[0],
        sub: item.ids[0],
      },
    };
  });
}

/**
 * Generates Root Stack Navigator screens (domains, sub-tabs, plugins, modals)
 */
export function getMobileStackScreens(role: string = "student", locale: string = "vi"): MobileScreenConfig[] {
  const normRole = (role || "").toLowerCase();
  const config = NAVIGATION_CONFIG[normRole] || NAVIGATION_CONFIG.student;
  const sidebarLinks = config.sidebar;

  const standardScreens: MobileScreenConfig[] = sidebarLinks.map((link) => {
    const iconFn2 = link.icon as any;
    const iconName = iconFn2?.displayName || iconFn2?.name || "circle";
    const mappedIcon = ICON_NAME_MAP[iconName] || "circle-outline";
    const title = resolveLocalizedLabel(link, locale);

    return {
      name: `Screen_${link.id}`,
      routeKey: link.id,
      title,
      iconName: mappedIcon,
      domain: link.id,
      subIds: link.subIds || [link.id],
      initialParams: { domain: link.id },
    };
  });

  // Dynamically include registered plugins
  const plugins = pluginRegistry.getAll();
  const pluginScreens: MobileScreenConfig[] = plugins.map((p) => {
    const labelStr = typeof p.label === "string" ? p.label : p.label[locale] || p.label.vi || p.id;
    return {
      name: `Plugin_${p.id}`,
      routeKey: p.id,
      title: labelStr,
      iconName: "puzzle-outline",
      domain: p.domain,
      isPlugin: true,
      initialParams: {
        pluginId: p.id,
        domain: p.domain,
        requiredSubscription: p.requiredSubscription,
      },
    };
  });

  return [...standardScreens, ...pluginScreens];
}

/**
 * Generates universal Deep Linking configuration for React Navigation
 * Matches iedu:// URIs and web https://iedu.app URLs
 */
export function getMobileLinkingConfig(role: string = "student"): MobileLinkingConfig {
  const normRole = (role || "").toLowerCase();

  return {
    prefixes: ["iedu://", "https://iedu.app", "http://localhost:3000"],
    config: {
      screens: {
        RootTabs: {
          path: `dashboard/${normRole}`,
          screens: {
            OverviewTab: "overview",
            LearningTab: "learning",
            CommunityTab: "community",
            LanguageTab: "language",
            PracticeTab: "practice",
            AICoachTab: "ai-tools",
            ProgressTab: "progress",
          },
        },
        PracticePlugin: {
          path: "domain/practice/:sub",
        },
        ClassDetail: {
          path: "classes/:classId",
        },
        ChatRoom: {
          path: "chat/:groupId",
        },
        ProfileModal: {
          path: "profile",
        },
        UpgradeModal: {
          path: "upgrade",
        },
      },
    },
  };
}

/**
 * Reusable Mobile Navigation State Bridge
 */
export function createMobileNavStateBridge() {
  let activeRoute = "overview";
  let activeSub = "";
  const listeners: Array<(route: string, sub: string) => void> = [];

  return {
    navigate: (route: string, sub: string = "") => {
      activeRoute = route;
      activeSub = sub;
      listeners.forEach((fn) => fn(route, sub));
    },
    getState: () => ({ activeRoute, activeSub }),
    subscribe: (fn: (route: string, sub: string) => void) => {
      listeners.push(fn);
      return () => {
        const idx = listeners.indexOf(fn);
        if (idx !== -1) listeners.splice(idx, 1);
      };
    },
  };
}
