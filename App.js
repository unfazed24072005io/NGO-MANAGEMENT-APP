import React, { useState, useEffect } from 'react';
import { Platform, SafeAreaView, View, ActivityIndicator, TouchableOpacity, Text, StyleSheet, Modal } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import WorkingMemberMemberDetail from './screens/workingMember/WorkingMemberMemberDetail';
import { createStackNavigator } from '@react-navigation/stack';
import { MaterialIcons } from '@expo/vector-icons';
import { loadFonts, Fonts } from './config/fonts';
import WelcomeScreen from './screens/WelcomeScreen';
import CartScreen from './screens/member/CartScreen';
import CheckoutScreen from './screens/member/CheckoutScreen';
// Auth Screens
import LoginScreen from './screens/LoginScreen';
import DonorProfile from './screens/donation/DonorProfile';

import RegisterScreen from './screens/RegisterScreen';
import DonationScreen from './screens/member/DonationScreen';
import CompanyManagement from './screens/admin/CompanyManagement';
import MyOrders from './screens/member/MyOrders';
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

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Donation Tabs
function DonationTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Dashboard') iconName = 'dashboard';
          else if (route.name === 'Donate') iconName = 'favorite';
          else if (route.name === 'MyDonations') iconName = 'receipt';
          else if (route.name === 'Certificate') iconName = 'card-membership';
          else if (route.name === 'Company') iconName = 'business';
          else if (route.name === 'Profile') iconName = 'person';
          return <MaterialIcons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#10b981',
        tabBarInactiveTintColor: '#7f8c8d',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#e8ecf1',
          height: 65,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabel: () => null, // Hide labels
        headerShown: false,
      })}
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

// Admin Notification Tabs
function AdminNotificationTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Notifications') iconName = 'notifications';
          else if (route.name === 'Suggestions') iconName = 'lightbulb';
          else if (route.name === 'Complaints') iconName = 'report-problem';
          return <MaterialIcons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#4a90e2',
        tabBarInactiveTintColor: '#7f8c8d',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#e8ecf1',
          height: 65,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabel: () => null,
        headerShown: false,
      })}
    >
      <Tab.Screen name="Notifications" component={NotificationsScreen} />
      <Tab.Screen name="Suggestions" component={SuggestionsScreen} />
      <Tab.Screen name="Complaints" component={ComplaintsScreen} />
    </Tab.Navigator>
  );
}

// Member Notification Tabs
function MemberNotificationTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Notifications') iconName = 'notifications';
          else if (route.name === 'Suggestions') iconName = 'lightbulb';
          else if (route.name === 'Complaints') iconName = 'report-problem';
          return <MaterialIcons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#7f8c8d',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#e8ecf1',
          height: 65,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabel: () => null,
        headerShown: false,
      })}
    >
      <Tab.Screen name="Notifications" component={NotificationsScreen} />
      <Tab.Screen name="Suggestions" component={SuggestionsScreen} />
      <Tab.Screen name="Complaints" component={ComplaintsScreen} />
    </Tab.Navigator>
  );
}

// Working Member Notification Tabs
function WorkingMemberNotificationTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Notifications') iconName = 'notifications';
          else if (route.name === 'Suggestions') iconName = 'lightbulb';
          else if (route.name === 'Complaints') iconName = 'report-problem';
          return <MaterialIcons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#8b5cf6',
        tabBarInactiveTintColor: '#7f8c8d',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#e8ecf1',
          height: 65,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabel: () => null,
        headerShown: false,
      })}
    >
      <Tab.Screen name="Notifications" component={NotificationsScreen} />
      <Tab.Screen name="Suggestions" component={SuggestionsScreen} />
      <Tab.Screen name="Complaints" component={ComplaintsScreen} />
    </Tab.Navigator>
  );
}

// Custom Tab Bar for Admin with Notification at Center
function AdminTabs() {
  const [fabModalVisible, setFabModalVisible] = useState(false);

  let navigationRef = null;

  return (
    <>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;
            if (route.name === 'Dashboard') iconName = 'dashboard';
            else if (route.name === 'Members') iconName = 'people';
            else if (route.name === 'E-Commerce') iconName = 'shopping-cart';
            else if (route.name === 'Finance') iconName = 'attach-money';
            else if (route.name === 'Events') iconName = 'event';
            else if (route.name === 'Profile') iconName = 'person';
            else if (route.name === 'Company') iconName = 'business';
            else if (route.name === 'Commission') iconName = 'workspace-premium';
            return <MaterialIcons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: '#4a90e2',
          tabBarInactiveTintColor: '#7f8c8d',
          tabBarStyle: {
            backgroundColor: '#ffffff',
            borderTopWidth: 1,
            borderTopColor: '#e8ecf1',
            height: 65,
            paddingBottom: 8,
            paddingTop: 6,
          },
          tabBarLabel: () => null,
          headerShown: false,
        })}
        tabBar={(props) => {
          const { state, descriptors, navigation } = props;
          navigationRef = navigation;
          
          const tabs = [
            { name: 'Dashboard', icon: 'dashboard' },
            { name: 'Members', icon: 'people' },
            { name: 'E-Commerce', icon: 'shopping-cart' },
            { name: 'Finance', icon: 'attach-money' },
            { name: 'Events', icon: 'event' },
            { name: 'Company', icon: 'business' },
            { name: 'Commission', icon: 'workspace-premium' },
            { name: 'Profile', icon: 'person' },
          ];

          return (
            <View style={styles.tabBarContainer}>
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
                  >
                    <MaterialIcons 
                      name={tab.icon} 
                      size={26} 
                      color={isFocused ? '#4a90e2' : '#7f8c8d'} 
                    />
                  </TouchableOpacity>
                );
              })}

              <View style={styles.notificationWrapper}>
                <TouchableOpacity
                  style={styles.adminNotificationButton}
                  onPress={() => {
                    if (navigationRef) {
                      navigationRef.navigate('AdminNotificationTabs');
                    }
                  }}
                  activeOpacity={0.8}
                >
                  <MaterialIcons name="notifications" size={28} color="#ffffff" />
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      >
        <Tab.Screen name="Dashboard" component={AdminDashboard} />
        <Tab.Screen name="Members" component={MemberListManagement} />
        <Tab.Screen name="E-Commerce" component={ECommerceManagement} />
        <Tab.Screen name="Finance" component={FinancesManagement} />
        <Tab.Screen name="Events" component={EventsManagement} />
        <Tab.Screen name="Company" component={CompanyManagement} />
        <Tab.Screen name="Commission" component={CommissionManagement} />
        <Tab.Screen name="Profile" component={AdminProfile} />
      </Tab.Navigator>
    </>
  );
}

// Custom Tab Bar for Member with Notification at Center
function MemberTabs() {
  const [fabModalVisible, setFabModalVisible] = useState(false);

  let navigationRef = null;

  return (
    <>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;
            if (route.name === 'Dashboard') iconName = 'dashboard';
            else if (route.name === 'Events') iconName = 'event';
            else if (route.name === 'Shop') iconName = 'shopping-cart';
            else if (route.name === 'Donate') iconName = 'favorite';
            else if (route.name === 'Profile') iconName = 'person';
            else if (route.name === 'Company') iconName = 'business';
            return <MaterialIcons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: '#3b82f6',
          tabBarInactiveTintColor: '#7f8c8d',
          tabBarStyle: {
            backgroundColor: '#ffffff',
            borderTopWidth: 1,
            borderTopColor: '#e8ecf1',
            height: 65,
            paddingBottom: 8,
            paddingTop: 6,
          },
          tabBarLabel: () => null,
          headerShown: false,
        })}
        tabBar={(props) => {
          const { state, descriptors, navigation } = props;
          navigationRef = navigation;
          
          const tabs = [
            { name: 'Dashboard', icon: 'dashboard' },
            { name: 'Events', icon: 'event' },
            { name: 'Shop', icon: 'shopping-cart' },
            { name: 'Company', icon: 'business' },
            { name: 'Donate', icon: 'favorite' },
            { name: 'Profile', icon: 'person' },
          ];

          return (
            <View style={styles.tabBarContainer}>
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
                  >
                    <MaterialIcons 
                      name={tab.icon} 
                      size={26} 
                      color={isFocused ? '#3b82f6' : '#7f8c8d'} 
                    />
                  </TouchableOpacity>
                );
              })}

              <View style={styles.notificationWrapper}>
                <TouchableOpacity
                  style={styles.notificationButton}
                  onPress={() => {
                    if (navigationRef) {
                      navigationRef.navigate('MemberNotificationTabs');
                    }
                  }}
                  activeOpacity={0.8}
                >
                  <MaterialIcons name="notifications" size={28} color="#ffffff" />
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      >
        <Tab.Screen name="Dashboard" component={MemberDashboard} />
        <Tab.Screen name="Events" component={MemberEvents} />
        <Tab.Screen name="Shop" component={MemberECommerce} />
        <Tab.Screen name="Company" component={MemberCompany} />
        <Tab.Screen name="Donate" component={DonationScreen} />
        <Tab.Screen name="Profile" component={MemberProfile} />
      </Tab.Navigator>
    </>
  );
}

// Custom Tab Bar for Working Member with Notification at Center
function WorkingMemberTabs() {
  const [fabModalVisible, setFabModalVisible] = useState(false);

  let navigationRef = null;

  return (
    <>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;
            if (route.name === 'Dashboard') iconName = 'dashboard';
            else if (route.name === 'Members') iconName = 'people';
            else if (route.name === 'Shop') iconName = 'shopping-cart';
            else if (route.name === 'Commission') iconName = 'attach-money';
            else if (route.name === 'Profile') iconName = 'person';
            else if (route.name === 'Company') iconName = 'business';
            return <MaterialIcons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: '#8b5cf6',
          tabBarInactiveTintColor: '#7f8c8d',
          tabBarStyle: {
            backgroundColor: '#ffffff',
            borderTopWidth: 1,
            borderTopColor: '#e8ecf1',
            height: 65,
            paddingBottom: 8,
            paddingTop: 6,
          },
          tabBarLabel: () => null,
          headerShown: false,
        })}
        tabBar={(props) => {
          const { state, descriptors, navigation } = props;
          navigationRef = navigation;
          
          const tabs = [
            { name: 'Dashboard', icon: 'dashboard' },
            { name: 'Members', icon: 'people' },
            { name: 'Shop', icon: 'shopping-cart' },
            { name: 'Company', icon: 'business' },
            { name: 'Commission', icon: 'attach-money' },
            { name: 'Profile', icon: 'person' },
          ];

          return (
            <View style={styles.tabBarContainer}>
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
                  >
                    <MaterialIcons 
                      name={tab.icon} 
                      size={26} 
                      color={isFocused ? '#8b5cf6' : '#7f8c8d'} 
                    />
                  </TouchableOpacity>
                );
              })}

              <View style={styles.notificationWrapper}>
                <TouchableOpacity
                  style={styles.workingNotificationButton}
                  onPress={() => {
                    if (navigationRef) {
                      navigationRef.navigate('WorkingMemberNotificationTabs');
                    }
                  }}
                  activeOpacity={0.8}
                >
                  <MaterialIcons name="notifications" size={28} color="#ffffff" />
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      >
        <Tab.Screen name="Dashboard" component={WorkingMemberDashboard} />
        <Tab.Screen name="Members" component={WorkingMemberRegisteredMembers} />
        <Tab.Screen name="Shop" component={WorkingMemberECommerce} />
        <Tab.Screen name="Company" component={WorkingMemberCompany} />
        <Tab.Screen name="Commission" component={WorkingMemberCommission} />
        <Tab.Screen name="Profile" component={WorkingMemberProfile} />
      </Tab.Navigator>
    </>
  );
}

export default function App() {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    const loadAppFonts = async () => {
      try {
        await loadFonts();
        setFontsLoaded(true);
      } catch (error) {
        console.error('Error loading fonts:', error);
        setFontsLoaded(true);
      }
    };
    loadAppFonts();
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' }}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <NavigationContainer>
        <Stack.Navigator 
          initialRouteName="Welcome"
          screenOptions={{ headerShown: false }}
        >
          {/* Welcome Screen */}
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen 
            name="WorkingMemberMemberDetail" 
            component={WorkingMemberMemberDetail} 
            options={{ headerShown: false }} 
          />

          {/* Auth Screens */}
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          
          {/* Admin Screens */}
          <Stack.Screen name="AdminTabs" component={AdminTabs} />
          <Stack.Screen name="WorkingMemberList" component={WorkingMemberManagement} />
          <Stack.Screen name="CompanyProfile" component={CompanyProfileManagement} />
          <Stack.Screen name="CompanyManagement" component={CompanyManagement} />
          <Stack.Screen name="AdminProfile" component={AdminProfile} />
          
          {/* Admin Notification Screens */}
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
          
          {/* Member Notification Screens */}
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
          
          {/* Working Member Notification Screens */}
          <Stack.Screen name="WorkingMemberNotificationTabs" component={WorkingMemberNotificationTabs} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e8ecf1',
    height: 65,
    paddingBottom: 8,
    paddingTop: 6,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 5,
    position: 'relative',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  notificationWrapper: {
    position: 'absolute',
    top: -35,
    left: '50%',
    marginLeft: -28,
    zIndex: 999,
  },
  notificationButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  adminNotificationButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4a90e2',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  workingNotificationButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
});