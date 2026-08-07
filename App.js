import React, { useState, useEffect } from 'react';
import { Platform, SafeAreaView, View, ActivityIndicator, TouchableOpacity, Text, StyleSheet, Modal, Image } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import WorkingMemberMemberDetail from './screens/workingMember/WorkingMemberMemberDetail';
import { createStackNavigator } from '@react-navigation/stack';
import { MaterialIcons } from '@expo/vector-icons';
import { loadFonts, Fonts } from './config/fonts';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { Asset } from 'expo-asset';
import * as Font from 'expo-font';

// Import the new tab screens
import HomeScreen from './screens/HomeScreen';
import ShopScreen from './screens/ShopScreen';
import EventsScreen from './screens/EventsScreen';
import ProfileScreen from './screens/ProfileScreen';

// Auth Screens
import LoginScreen from './screens/LoginScreen';
import DonorProfile from './screens/donation/DonorProfile';
import RegisterScreen from './screens/RegisterScreen';
import DonationScreen from './screens/member/DonationScreen';
import CompanyManagement from './screens/admin/CompanyManagement';
import MyOrders from './screens/member/MyOrders';

// Member Applications
import MemberApplications from './screens/member/MemberApplications';

// Working Member Applications
import WorkingMemberApplications from './screens/workingMember/WorkingMemberApplications';

// Admin Screens
import AdminDashboard from './screens/admin/AdminDashboard';
import AdminProfile from './screens/admin/AdminProfile';
import MemberListManagement from './screens/admin/MemberListManagement';
import WorkingMemberManagement from './screens/admin/WorkingMemberManagement';
import ECommerceManagement from './screens/admin/ECommerceManagement';
import FinancesManagement from './screens/admin/FinancesManagement';
import EventsManagement from './screens/admin/EventsManagement';
import CommissionManagement from './screens/admin/CommissionManagement';
import CompanyProfileManagement from './screens/admin/CompanyProfileManagement';

// Quote Management
import QuoteManagement from './screens/admin/QuoteManagement';
import MemberQuotes from './screens/member/MemberQuotes';
import WorkingMemberQuotes from './screens/workingMember/WorkingMemberQuotes';

// Employee Management
import EmployeeManagement from './screens/admin/EmployeeManagement';

// Online Class Management
import OnlineClassManagement from './screens/admin/OnlineClassManagement';

// Employee Screens
import EmployeeProfile from './screens/employee/EmployeeProfile';
import EmployeeTasks from './screens/employee/EmployeeTasks';

// Member Screens
import MemberDashboard from './screens/member/MemberDashboard';
import MemberProfile from './screens/member/MemberProfile';
import MemberIDCard from './screens/member/MemberIDCard';
import MemberCertificate from './screens/member/MemberCertificate';
import MemberECommerce from './screens/member/MemberECommerce';
import MemberEvents from './screens/member/MemberEvents';
import MemberNotice from './screens/member/MemberNotice';
import MemberCompany from './screens/member/MemberCompany';
import MemberComplaint from './screens/member/MemberComplaint';
import MemberClasses from './screens/member/MemberClasses';

// Working Member Screens
import WorkingMemberDashboard from './screens/workingMember/WorkingMemberDashboard';
import WorkingMemberProfile from './screens/workingMember/WorkingMemberProfile';
import WorkingMemberIDCard from './screens/workingMember/WorkingMemberIDCard';
import WorkingMemberCertificate from './screens/workingMember/WorkingMemberCertificate';
import WorkingMemberECommerce from './screens/workingMember/WorkingMemberECommerce';
import WorkingMemberCart from './screens/workingMember/WorkingMemberCart';
import WorkingMemberCheckout from './screens/workingMember/WorkingMemberCheckout';
import WorkingMemberMyOrders from './screens/workingMember/WorkingMemberMyOrders';
import WorkingMemberDonation from './screens/workingMember/WorkingMemberDonation';
import WorkingMemberEvents from './screens/workingMember/WorkingMemberEvents';
import WorkingMemberNotice from './screens/workingMember/WorkingMemberNotice';
import WorkingMemberCompany from './screens/workingMember/WorkingMemberCompany';
import WorkingMemberComplaint from './screens/workingMember/WorkingMemberComplaint';
import WorkingMemberSuggestion from './screens/workingMember/WorkingMemberSuggestion';
import WorkingMemberRegisteredMembers from './screens/workingMember/WorkingMemberRegisteredMembers';
import WorkingMemberCommission from './screens/workingMember/WorkingMemberCommission';
import WorkingMemberWallet from './screens/workingMember/WorkingMemberWallet';
import WorkingMemberClasses from './screens/workingMember/WorkingMemberClasses';

// Donation Screens
import DonationDashboard from './screens/donation/DonationDashboard';
import DonateScreen from './screens/donation/DonateScreen';
import MyDonations from './screens/donation/MyDonations';
import DonationCertificate from './screens/donation/DonationCertificate';
import DonorCompany from './screens/donation/DonorCompany';

// Notification Tab Screens
import NotificationsScreen from './screens/admin/NotificationsScreen';
import SuggestionsScreen from './screens/admin/SuggestionsScreen';
import ComplaintsScreen from './screens/admin/ComplaintsScreen';

// Cart Screens
import CartScreen from './screens/member/CartScreen';
import CheckoutScreen from './screens/member/CheckoutScreen';

// Splash Screen Component
function CustomSplashScreen() {
  return (
    <View style={styles.splashContainer}>
      <Image
        source={require('./assets/splash.png')}
        style={styles.splashImage}
        resizeMode="contain"
      />
      <ActivityIndicator size="large" color="#8b5cf6" style={styles.splashLoader} />
    </View>
  );
}

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Custom Tab Bar Component with Safe Area
const CustomTabBar = ({ state, descriptors, navigation, tabs, activeColor, inactiveColor, notificationButton, notificationColor }) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[
      styles.tabBarContainer,
      {
        paddingBottom: Platform.OS === 'ios' ? Math.max(insets.bottom, 20) : Math.max(insets.bottom, 8),
        height: Platform.OS === 'ios' ? 85 + Math.max(insets.bottom, 0) : 75 + Math.max(insets.bottom, 0),
      }
    ]}>
      {tabs.map((tab, index) => {
        const isFocused = state.index === index;
        const route = state.routes[index];
        
        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <TouchableOpacity
            key={index}
            style={styles.tabButton}
            onPress={onPress}
            activeOpacity={0.7}
          >
            <MaterialIcons 
              name={tab.icon} 
              size={26} 
              color={isFocused ? activeColor : inactiveColor} 
            />
            <Text style={[
              styles.tabLabel,
              { color: isFocused ? activeColor : inactiveColor }
            ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}

      {notificationButton && (
        <View style={[
          styles.notificationWrapper,
          { bottom: Platform.OS === 'ios' ? Math.max(insets.bottom, 0) + 30 : Math.max(insets.bottom, 0) + 30 }
        ]}>
          <TouchableOpacity
            style={[styles.notificationButton, { backgroundColor: notificationColor || activeColor }]}
            onPress={notificationButton.onPress}
            activeOpacity={0.8}
          >
            <MaterialIcons name="notifications" size={28} color="#ffffff" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

// ============ PUBLIC TABS ============
function PublicTabs() {
  const tabs = [
    { name: 'Home', icon: 'home', label: 'Home' },
    { name: 'Profile', icon: 'person', label: 'Profile' },
  ];

  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => (
        <CustomTabBar
          {...props}
          tabs={tabs}
          activeColor="#FF7722"
          inactiveColor="#9ca3af"
        />
      )}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// ============ DONATION TABS ============
function DonationTabs() {
  const tabs = [
    { name: 'Dashboard', icon: 'dashboard', label: 'Home' },
    { name: 'Donate', icon: 'favorite', label: 'Donate' },
    { name: 'MyDonations', icon: 'receipt', label: 'History' },
    { name: 'Company', icon: 'business', label: 'Company' },
    { name: 'Certificate', icon: 'card-membership', label: 'Certificate' },
    { name: 'Profile', icon: 'person', label: 'Profile' },
  ];

  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => (
        <CustomTabBar
          {...props}
          tabs={tabs}
          activeColor="#10b981"
          inactiveColor="#7f8c8d"
        />
      )}
    >
      <Tab.Screen name="Dashboard" component={DonationDashboard} />
      <Tab.Screen name="Donate" component={DonateScreen} />
      <Tab.Screen name="MyDonations" component={MyDonations} />
      <Tab.Screen name="Company" component={DonorCompany} />
      <Tab.Screen name="Certificate" component={DonationCertificate} />
      <Tab.Screen name="Profile" component={DonorProfile} />
    </Tab.Navigator>
  );
}

// ============ ADMIN NOTIFICATION TABS ============
function AdminNotificationTabs() {
  const tabs = [
    { name: 'Notifications', icon: 'notifications', label: 'Notifications' },
    { name: 'Suggestions', icon: 'lightbulb', label: 'Suggestions' },
    { name: 'Complaints', icon: 'report-problem', label: 'Complaints' },
  ];

  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => (
        <CustomTabBar
          {...props}
          tabs={tabs}
          activeColor="#FF7722"
          inactiveColor="#7f8c8d"
        />
      )}
    >
      <Tab.Screen name="Notifications" component={NotificationsScreen} />
      <Tab.Screen name="Suggestions" component={SuggestionsScreen} />
      <Tab.Screen name="Complaints" component={ComplaintsScreen} />
    </Tab.Navigator>
  );
}

// ============ MEMBER NOTIFICATION TABS ============
function MemberNotificationTabs() {
  const tabs = [
    { name: 'Notifications', icon: 'notifications', label: 'Notifications' },
    { name: 'Suggestions', icon: 'lightbulb', label: 'Suggestions' },
    { name: 'Complaints', icon: 'report-problem', label: 'Complaints' },
  ];

  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => (
        <CustomTabBar
          {...props}
          tabs={tabs}
          activeColor="#3b82f6"
          inactiveColor="#7f8c8d"
        />
      )}
    >
      <Tab.Screen name="Notifications" component={NotificationsScreen} />
      <Tab.Screen name="Suggestions" component={SuggestionsScreen} />
      <Tab.Screen name="Complaints" component={ComplaintsScreen} />
    </Tab.Navigator>
  );
}

// ============ WORKING MEMBER NOTIFICATION TABS ============
function WorkingMemberNotificationTabs() {
  const tabs = [
    { name: 'Notifications', icon: 'notifications', label: 'Notifications' },
    { name: 'Suggestions', icon: 'lightbulb', label: 'Suggestions' },
    { name: 'Complaints', icon: 'report-problem', label: 'Complaints' },
  ];

  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => (
        <CustomTabBar
          {...props}
          tabs={tabs}
          activeColor="#8b5cf6"
          inactiveColor="#7f8c8d"
        />
      )}
    >
      <Tab.Screen name="Notifications" component={NotificationsScreen} />
      <Tab.Screen name="Suggestions" component={SuggestionsScreen} />
      <Tab.Screen name="Complaints" component={ComplaintsScreen} />
    </Tab.Navigator>
  );
}

// ============ ORGANIZATION SETTINGS TABS ============
function OrganizationSettingsTabs() {
  const tabs = [
    { name: 'Dashboard', icon: 'dashboard', label: 'Dashboard' },
    { name: 'WorkingMembers', icon: 'people-outline', label: 'Working' },
    { name: 'Finances', icon: 'attach-money', label: 'Finances' },
    { name: 'Commission', icon: 'workspace-premium', label: 'Commission' },
    { name: 'Employees', icon: 'people', label: 'Employees' },
    { name: 'Classes', icon: 'video-library', label: 'Classes' },
    { name: 'Quotes', icon: 'format-quote', label: 'Quotes' },
  ];

  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => (
        <CustomTabBar
          {...props}
          tabs={tabs}
          activeColor="#FF7722"
          inactiveColor="#7f8c8d"
        />
      )}
    >
      <Tab.Screen name="Dashboard" component={CompanyManagement} />
      <Tab.Screen name="WorkingMembers" component={WorkingMemberManagement} />
      <Tab.Screen name="Finances" component={FinancesManagement} />
      <Tab.Screen name="Commission" component={CommissionManagement} />
      <Tab.Screen name="Employees" component={EmployeeManagement} />
      <Tab.Screen name="Classes" component={OnlineClassManagement} />
      <Tab.Screen name="Quotes" component={QuoteManagement} />
    </Tab.Navigator>
  );
}

// ============ MEMBER MORE SETTINGS TABS ============
function MemberMoreSettingsTabs() {
  const tabs = [
    { name: 'Applications', icon: 'handshake', label: 'Apps' },
    { name: 'Classes', icon: 'video-library', label: 'Classes' },
    { name: 'Organisation', icon: 'business', label: 'Org' },
    { name: 'Quotes', icon: 'format-quote', label: 'Quotes' },
  ];

  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => (
        <CustomTabBar
          {...props}
          tabs={tabs}
          activeColor="#3b82f6"
          inactiveColor="#7f8c8d"
        />
      )}
    >
      <Tab.Screen name="Applications" component={MemberApplications} />
      <Tab.Screen name="Classes" component={MemberClasses} />
      <Tab.Screen name="Organisation" component={CompanyManagement} />
      <Tab.Screen name="Quotes" component={MemberQuotes} />
    </Tab.Navigator>
  );
}

// ============ WORKING MEMBER MORE SETTINGS TABS ============
function WorkingMemberMoreSettingsTabs() {
  const tabs = [
    { name: 'Applications', icon: 'handshake', label: 'Apps' },
    { name: 'Classes', icon: 'video-library', label: 'Classes' },
    { name: 'Commission', icon: 'attach-money', label: 'Commission' },
    { name: 'Organisation', icon: 'business', label: 'Org' },
    { name: 'Quotes', icon: 'format-quote', label: 'Quotes' },
  ];

  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => (
        <CustomTabBar
          {...props}
          tabs={tabs}
          activeColor="#8b5cf6"
          inactiveColor="#7f8c8d"
        />
      )}
    >
      <Tab.Screen name="Applications" component={WorkingMemberApplications} />
      <Tab.Screen name="Classes" component={WorkingMemberClasses} />
      <Tab.Screen name="Commission" component={WorkingMemberCommission} />
      <Tab.Screen name="Organisation" component={CompanyManagement} />
      <Tab.Screen name="Quotes" component={WorkingMemberQuotes} />
    </Tab.Navigator>
  );
}

// ============ EMPLOYEE TABS ============
function EmployeeTabsNav() {
  const tabs = [
    { name: 'Profile', icon: 'person', label: 'Profile' },
    { name: 'Tasks', icon: 'assignment', label: 'Tasks' },
  ];

  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => (
        <CustomTabBar
          {...props}
          tabs={tabs}
          activeColor="#FF7722"
          inactiveColor="#7f8c8d"
        />
      )}
    >
      <Tab.Screen name="Profile" component={EmployeeProfile} />
      <Tab.Screen name="Tasks" component={EmployeeTasks} />
    </Tab.Navigator>
  );
}

// ============ ADMIN TABS ============
function AdminTabs() {
  const tabs = [
    { name: 'Dashboard', icon: 'dashboard', label: 'Home' },
    { name: 'Members', icon: 'people', label: 'Members' },
    { name: 'E-Commerce', icon: 'shopping-cart', label: 'Shop' },
    { name: 'Events', icon: 'event', label: 'Events' },
    { name: 'Profile', icon: 'person', label: 'Profile' },
  ];

  const notificationButton = {
    onPress: () => {
      // Navigate to notification tabs
      navigationRef?.navigate('AdminNotificationTabs');
    }
  };

  let navigationRef = null;

  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => {
        navigationRef = props.navigation;
        return (
          <CustomTabBar
            {...props}
            tabs={tabs}
            activeColor="#FF7722"
            inactiveColor="#7f8c8d"
            notificationButton={notificationButton}
            notificationColor="#FF7722"
          />
        );
      }}
    >
      <Tab.Screen name="Dashboard" component={AdminDashboard} />
      <Tab.Screen name="Members" component={MemberListManagement} />
      <Tab.Screen name="E-Commerce" component={ECommerceManagement} />
      <Tab.Screen name="Events" component={EventsManagement} />
      <Tab.Screen name="Profile" component={AdminProfile} />
    </Tab.Navigator>
  );
}

// ============ MEMBER TABS ============
function MemberTabs() {
  const tabs = [
    { name: 'Dashboard', icon: 'dashboard', label: 'Home' },
    { name: 'Events', icon: 'event', label: 'Events' },
    { name: 'Shop', icon: 'shopping-cart', label: 'Shop' },
    { name: 'Donate', icon: 'favorite', label: 'Donate' },
    { name: 'Orders', icon: 'receipt', label: 'Orders' },
    { name: 'Profile', icon: 'person', label: 'Profile' },
  ];

  const notificationButton = {
    onPress: () => navigationRef?.navigate('MemberNotificationTabs')
  };

  let navigationRef = null;

  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => {
        navigationRef = props.navigation;
        return (
          <CustomTabBar
            {...props}
            tabs={tabs}
            activeColor="#3b82f6"
            inactiveColor="#7f8c8d"
            notificationButton={notificationButton}
            notificationColor="#3b82f6"
          />
        );
      }}
    >
      <Tab.Screen name="Dashboard" component={MemberDashboard} />
      <Tab.Screen name="Events" component={MemberEvents} />
      <Tab.Screen name="Shop" component={MemberECommerce} />
      <Tab.Screen name="Donate" component={DonationScreen} />
      <Tab.Screen name="Orders" component={MyOrders} />
      <Tab.Screen name="Profile" component={MemberProfile} />
    </Tab.Navigator>
  );
}

// ============ WORKING MEMBER TABS ============
function WorkingMemberTabs() {
  const tabs = [
    { name: 'Dashboard', icon: 'dashboard', label: 'Home' },
    { name: 'Members', icon: 'people', label: 'Members' },
    { name: 'Shop', icon: 'shopping-cart', label: 'Shop' },
    { name: 'Events', icon: 'event', label: 'Events' },
    { name: 'Donate', icon: 'favorite', label: 'Donate' },
    { name: 'Orders', icon: 'receipt', label: 'Orders' },
    { name: 'Wallet', icon: 'account-balance-wallet', label: 'Wallet' },
    { name: 'Profile', icon: 'person', label: 'Profile' },
  ];

  const notificationButton = {
    onPress: () => navigationRef?.navigate('WorkingMemberNotificationTabs')
  };

  let navigationRef = null;

  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => {
        navigationRef = props.navigation;
        return (
          <CustomTabBar
            {...props}
            tabs={tabs}
            activeColor="#8b5cf6"
            inactiveColor="#7f8c8d"
            notificationButton={notificationButton}
            notificationColor="#8b5cf6"
          />
        );
      }}
    >
      <Tab.Screen name="Dashboard" component={WorkingMemberDashboard} />
      <Tab.Screen name="Members" component={WorkingMemberRegisteredMembers} />
      <Tab.Screen name="Shop" component={WorkingMemberECommerce} />
      <Tab.Screen name="Events" component={WorkingMemberEvents} />
      <Tab.Screen name="Donate" component={WorkingMemberDonation} />
      <Tab.Screen name="Orders" component={WorkingMemberMyOrders} />
      <Tab.Screen name="Wallet" component={WorkingMemberWallet} />
      <Tab.Screen name="Profile" component={WorkingMemberProfile} />
    </Tab.Navigator>
  );
}

// ============ MAIN APP ============
export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        // Keep splash screen visible while loading
        await SplashScreen.preventAutoHideAsync();

        // Load fonts using your existing loadFonts function
        await loadFonts();
        setFontsLoaded(true);

        // Load images/assets
        await Asset.loadAsync([
          require('./assets/splash.png'),
          require('./assets/icon.png'),
        ]);

        // Artificially delay for smooth transition (optional)
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (e) {
        console.warn('Error loading app:', e);
      } finally {
        setAppIsReady(true);
        // Hide splash screen
        await SplashScreen.hideAsync();
      }
    }

    prepare();
  }, []);

  if (!appIsReady || !fontsLoaded) {
    return <CustomSplashScreen />;
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <NavigationContainer>
        <Stack.Navigator 
          initialRouteName="PublicTabs"
          screenOptions={{ headerShown: false }}
        >
          {/* Public Tabs */}
          <Stack.Screen name="PublicTabs" component={PublicTabs} />
          
          {/* Member More Settings */}
          <Stack.Screen name="MemberMoreSettingsTabs" component={MemberMoreSettingsTabs} />
          
          {/* Auth Screens */}
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          
          {/* Organization Settings */}
          <Stack.Screen name="OrganizationSettingsTabs" component={OrganizationSettingsTabs} />
          
          {/* Working Member More Settings */}
          <Stack.Screen name="WorkingMemberMoreSettingsTabs" component={WorkingMemberMoreSettingsTabs} />
          
          {/* Employee Tabs */}
          <Stack.Screen name="EmployeeTabs" component={EmployeeTabsNav} />
          
          {/* Admin Screens */}
          <Stack.Screen name="AdminTabs" component={AdminTabs} />
          <Stack.Screen name="WorkingMemberList" component={WorkingMemberManagement} />
          <Stack.Screen name="CompanyProfile" component={CompanyProfileManagement} />
          <Stack.Screen name="AdminProfile" component={AdminProfile} />
          <Stack.Screen name="AdminNotificationTabs" component={AdminNotificationTabs} />
          
          {/* Member Screens */}
          <Stack.Screen name="MemberTabs" component={MemberTabs} />
          <Stack.Screen name="MemberProfile" component={MemberProfile} />
          <Stack.Screen name="MemberIDCard" component={MemberIDCard} />
          <Stack.Screen name="MemberCertificate" component={MemberCertificate} />
          <Stack.Screen name="MemberECommerce" component={MemberECommerce} />
          <Stack.Screen name="DonationScreen" component={DonationScreen} />
          <Stack.Screen name="CartScreen" component={CartScreen} />
          <Stack.Screen name="CheckoutScreen" component={CheckoutScreen} />
          <Stack.Screen name="MemberEvents" component={MemberEvents} />
          <Stack.Screen name="MemberNotice" component={MemberNotice} />
          <Stack.Screen name="MemberCompany" component={MemberCompany} />
          <Stack.Screen name="MemberComplaint" component={MemberComplaint} />
          <Stack.Screen name="MyOrders" component={MyOrders} />
          <Stack.Screen name="MemberApplications" component={MemberApplications} />
          <Stack.Screen name="MemberNotificationTabs" component={MemberNotificationTabs} />
          
          {/* Donation Screens */}
          <Stack.Screen name="DonationTabs" component={DonationTabs} />
          <Stack.Screen name="DonorProfile" component={DonorProfile} />
          <Stack.Screen name="DonorCompany" component={DonorCompany} />
          
          {/* Working Member Screens */}
          <Stack.Screen name="WorkingMemberTabs" component={WorkingMemberTabs} />
          <Stack.Screen name="WorkingMemberProfile" component={WorkingMemberProfile} />
          <Stack.Screen name="WorkingMemberIDCard" component={WorkingMemberIDCard} />
          <Stack.Screen name="WorkingMemberCertificate" component={WorkingMemberCertificate} />
          <Stack.Screen name="WorkingMemberECommerce" component={WorkingMemberECommerce} />
          <Stack.Screen name="WorkingMemberCart" component={WorkingMemberCart} />
          <Stack.Screen name="WorkingMemberCheckout" component={WorkingMemberCheckout} />
          <Stack.Screen name="WorkingMemberMyOrders" component={WorkingMemberMyOrders} />
          <Stack.Screen name="WorkingMemberDonation" component={WorkingMemberDonation} />
          <Stack.Screen name="WorkingMemberEvents" component={WorkingMemberEvents} />
          <Stack.Screen name="WorkingMemberNotice" component={WorkingMemberNotice} />
          <Stack.Screen name="WorkingMemberCompany" component={WorkingMemberCompany} />
          <Stack.Screen name="WorkingMemberComplaint" component={WorkingMemberComplaint} />
          <Stack.Screen name="WorkingMemberSuggestion" component={WorkingMemberSuggestion} />
          <Stack.Screen name="WorkingMemberRegisteredMembers" component={WorkingMemberRegisteredMembers} />
          <Stack.Screen name="WorkingMemberCommission" component={WorkingMemberCommission} />
          <Stack.Screen name="WorkingMemberWallet" component={WorkingMemberWallet} />
          <Stack.Screen name="WorkingMemberNotificationTabs" component={WorkingMemberNotificationTabs} />
          <Stack.Screen name="WorkingMemberMemberDetail" component={WorkingMemberMemberDetail} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e8ecf1',
    paddingTop: 6,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'space-around',
    position: 'relative',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  tabLabel: {
    fontFamily: Fonts.SemiBold,
    fontSize: 10,
    marginTop: 2,
  },
  notificationWrapper: {
    position: 'absolute',
    left: '50%',
    marginLeft: -32,
    zIndex: 999,
    alignItems: 'center',
  },
  notificationButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  // Splash Screen Styles
  splashContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashImage: {
    width: 200,
    height: 200,
    marginBottom: 30,
  },
  splashLoader: {
    marginTop: 20,
  },
});