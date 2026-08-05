import React, { useState, useEffect } from 'react';
import { Platform, SafeAreaView, View, ActivityIndicator, TouchableOpacity, Text, StyleSheet, Modal } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import WorkingMemberMemberDetail from './screens/workingMember/WorkingMemberMemberDetail';
import { createStackNavigator } from '@react-navigation/stack';
import { MaterialIcons } from '@expo/vector-icons';
import { loadFonts, Fonts } from './config/fonts';

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

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// ============ PUBLIC TABS (Home, Shop, Events, Profile) - SAFFRON THEME ============
function PublicTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home';
          } else if (route.name === 'Shop') {
            iconName = focused ? 'shopping-bag' : 'shopping-bag';
          } else if (route.name === 'Events') {
            iconName = focused ? 'event' : 'event';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person';
          }
          return <MaterialIcons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#FF7722',     // Saffron color for active tab
        tabBarInactiveTintColor: '#9ca3af',    // Gray for inactive tabs
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#e5e7eb',
          height: 75,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontFamily: Fonts.SemiBold,
          fontSize: 11,
          marginTop: 2,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
// ============ DONATION TABS ============
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
          height: 75,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontFamily: Fonts.SemiBold,
          fontSize: 11,
          marginTop: 2,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Dashboard" component={DonationDashboard} options={{ title: 'Home' }} />
      <Tab.Screen name="Donate" component={DonateScreen} />
      <Tab.Screen name="MyDonations" component={MyDonations} options={{ title: 'History' }} />
      <Tab.Screen name="Company" component={DonorCompany} />
      <Tab.Screen name="Certificate" component={DonationCertificate} options={{ title: 'Certificate' }} />
      <Tab.Screen name="Profile" component={DonorProfile} />
    </Tab.Navigator>
  );
}

// ============ ADMIN NOTIFICATION TABS ============
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
        tabBarActiveTintColor: '#FF7722',
        tabBarInactiveTintColor: '#7f8c8d',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#e8ecf1',
          height: 75,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontFamily: Fonts.SemiBold,
          fontSize: 11,
          marginTop: 2,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Notifications" component={NotificationsScreen} />
      <Tab.Screen name="Suggestions" component={SuggestionsScreen} />
      <Tab.Screen name="Complaints" component={ComplaintsScreen} />
    </Tab.Navigator>
  );
}

// ============ MEMBER NOTIFICATION TABS ============
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
          height: 75,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontFamily: Fonts.SemiBold,
          fontSize: 11,
          marginTop: 2,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Notifications" component={NotificationsScreen} />
      <Tab.Screen name="Suggestions" component={SuggestionsScreen} />
      <Tab.Screen name="Complaints" component={ComplaintsScreen} />
    </Tab.Navigator>
  );
}

// ============ WORKING MEMBER NOTIFICATION TABS ============
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
          height: 75,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontFamily: Fonts.SemiBold,
          fontSize: 11,
          marginTop: 2,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Notifications" component={NotificationsScreen} />
      <Tab.Screen name="Suggestions" component={SuggestionsScreen} />
      <Tab.Screen name="Complaints" component={ComplaintsScreen} />
    </Tab.Navigator>
  );
}

// ============ ORGANIZATION SETTINGS TABS (SAFFRON THEME) ============
function OrganizationSettingsTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Dashboard') {
            iconName = 'dashboard';
          } else if (route.name === 'Finances') {
            iconName = 'attach-money';
          } else if (route.name === 'Commission') {
            iconName = 'workspace-premium';
          } else if (route.name === 'Employees') {
            iconName = 'people';
          } else if (route.name === 'Classes') {
            iconName = 'video-library';
          } else if (route.name === 'Quotes') {
            iconName = 'format-quote';
          }
          return <MaterialIcons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#FF7722',
        tabBarInactiveTintColor: '#7f8c8d',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#e8ecf1',
          height: 75,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontFamily: Fonts.SemiBold,
          fontSize: 11,
          marginTop: 2,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Dashboard" component={CompanyManagement} />
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
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Applications') {
            iconName = focused ? 'handshake' : 'handshake';
          } else if (route.name === 'Classes') {
            iconName = focused ? 'video-library' : 'video-library';
          } else if (route.name === 'Organisation') {
            iconName = focused ? 'business' : 'business';
          } else if (route.name === 'Quotes') {
            iconName = focused ? 'format-quote' : 'format-quote';
          }
          return <MaterialIcons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#7f8c8d',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#e8ecf1',
          height: 75,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontFamily: Fonts.SemiBold,
          fontSize: 11,
          marginTop: 2,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Applications" component={MemberApplications} options={{ title: 'Apps' }} />
      <Tab.Screen name="Classes" component={MemberClasses} />
      <Tab.Screen name="Organisation" component={CompanyManagement} options={{ title: 'Org' }} />
      <Tab.Screen name="Quotes" component={MemberQuotes} />
    </Tab.Navigator>
  );
}

// ============ WORKING MEMBER MORE SETTINGS TABS ============
function WorkingMemberMoreSettingsTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Applications') {
            iconName = focused ? 'handshake' : 'handshake';
          } else if (route.name === 'Classes') {
            iconName = focused ? 'video-library' : 'video-library';
          } else if (route.name === 'Organisation') {
            iconName = focused ? 'business' : 'business';
          } else if (route.name === 'Commission') {
            iconName = focused ? 'attach-money' : 'attach-money';
          } else if (route.name === 'Quotes') {
            iconName = focused ? 'format-quote' : 'format-quote';
          }
          return <MaterialIcons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#8b5cf6',
        tabBarInactiveTintColor: '#7f8c8d',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#e8ecf1',
          height: 75,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontFamily: Fonts.SemiBold,
          fontSize: 11,
          marginTop: 2,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Applications" component={WorkingMemberApplications} options={{ title: 'Apps' }} />
      <Tab.Screen name="Classes" component={WorkingMemberClasses} />
      <Tab.Screen name="Commission" component={WorkingMemberCommission} />
      <Tab.Screen name="Organisation" component={CompanyManagement} options={{ title: 'Org' }} />
      <Tab.Screen name="Quotes" component={WorkingMemberQuotes} />
    </Tab.Navigator>
  );
}

// ============ EMPLOYEE TABS ============
function EmployeeTabsNav() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person';
          } else if (route.name === 'Tasks') {
            iconName = focused ? 'assignment' : 'assignment';
          }
          return <MaterialIcons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#FF7722',
        tabBarInactiveTintColor: '#7f8c8d',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#e8ecf1',
          height: 75,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontFamily: Fonts.SemiBold,
          fontSize: 11,
          marginTop: 2,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Profile" component={EmployeeProfile} />
      <Tab.Screen name="Tasks" component={EmployeeTasks} />
    </Tab.Navigator>
  );
}

// ============ ADMIN TABS (SAFFRON THEME) ============
function AdminTabs() {
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
            else if (route.name === 'Events') iconName = 'event';
            else if (route.name === 'Profile') iconName = 'person';
            return <MaterialIcons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: '#FF7722',
          tabBarInactiveTintColor: '#7f8c8d',
          tabBarStyle: {
            backgroundColor: '#ffffff',
            borderTopWidth: 1,
            borderTopColor: '#e8ecf1',
            height: 75,
            paddingBottom: 8,
            paddingTop: 6,
          },
          tabBarLabelStyle: {
            fontFamily: Fonts.SemiBold,
            fontSize: 11,
            marginTop: 2,
          },
          headerShown: false,
        })}
        tabBar={(props) => {
          const { state, navigation } = props;
          navigationRef = navigation;
          
          const tabs = [
            { name: 'Dashboard', icon: 'dashboard', label: 'Home' },
            { name: 'Members', icon: 'people', label: 'Members' },
            { name: 'E-Commerce', icon: 'shopping-cart', label: 'Shop' },
            { name: 'Events', icon: 'event', label: 'Events' },
            { name: 'Profile', icon: 'person', label: 'Profile' },
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
                      color={isFocused ? '#FF7722' : '#7f8c8d'} 
                    />
                    <Text style={[
                      styles.tabLabel,
                      { color: isFocused ? '#FF7722' : '#7f8c8d' }
                    ]}>
                      {tab.label}
                    </Text>
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
                  <Text style={styles.notificationLabel}></Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      >
        <Tab.Screen name="Dashboard" component={AdminDashboard} />
        <Tab.Screen name="Members" component={MemberListManagement} />
        <Tab.Screen name="E-Commerce" component={ECommerceManagement} />
        <Tab.Screen name="Events" component={EventsManagement} />
        <Tab.Screen name="Profile" component={AdminProfile} />
      </Tab.Navigator>
    </>
  );
}

// ============ MEMBER TABS ============
function MemberTabs() {
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
            return <MaterialIcons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: '#3b82f6',
          tabBarInactiveTintColor: '#7f8c8d',
          tabBarStyle: {
            backgroundColor: '#ffffff',
            borderTopWidth: 1,
            borderTopColor: '#e8ecf1',
            height: 75,
            paddingBottom: 8,
            paddingTop: 6,
          },
          tabBarLabelStyle: {
            fontFamily: Fonts.SemiBold,
            fontSize: 11,
            marginTop: 2,
          },
          headerShown: false,
        })}
        tabBar={(props) => {
          const { state, navigation } = props;
          navigationRef = navigation;
          
          const tabs = [
            { name: 'Dashboard', icon: 'dashboard', label: 'Home' },
            { name: 'Events', icon: 'event', label: 'Events' },
            { name: 'Shop', icon: 'shopping-cart', label: 'Shop' },
            { name: 'Donate', icon: 'favorite', label: 'Donate' },
            { name: 'Profile', icon: 'person', label: 'Profile' },
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
                    <Text style={[
                      styles.tabLabel,
                      { color: isFocused ? '#3b82f6' : '#7f8c8d' }
                    ]}>
                      {tab.label}
                    </Text>
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
                  <Text style={styles.notificationLabel}></Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      >
        <Tab.Screen name="Dashboard" component={MemberDashboard} />
        <Tab.Screen name="Events" component={MemberEvents} />
        <Tab.Screen name="Shop" component={MemberECommerce} />
        <Tab.Screen name="Donate" component={DonationScreen} />
        <Tab.Screen name="Profile" component={MemberProfile} />
      </Tab.Navigator>
    </>
  );
}

// ============ WORKING MEMBER TABS ============
function WorkingMemberTabs() {
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
            else if (route.name === 'Events') iconName = 'event';
            else if (route.name === 'Profile') iconName = 'person';
            return <MaterialIcons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: '#8b5cf6',
          tabBarInactiveTintColor: '#7f8c8d',
          tabBarStyle: {
            backgroundColor: '#ffffff',
            borderTopWidth: 1,
            borderTopColor: '#e8ecf1',
            height: 75,
            paddingBottom: 8,
            paddingTop: 6,
          },
          tabBarLabelStyle: {
            fontFamily: Fonts.SemiBold,
            fontSize: 11,
            marginTop: 2,
          },
          headerShown: false,
        })}
        tabBar={(props) => {
          const { state, navigation } = props;
          navigationRef = navigation;
          
          const tabs = [
            { name: 'Dashboard', icon: 'dashboard', label: 'Home' },
            { name: 'Members', icon: 'people', label: 'Members' },
            { name: 'Shop', icon: 'shopping-cart', label: 'Shop' },
            { name: 'Events', icon: 'event', label: 'Events' },
            { name: 'Profile', icon: 'person', label: 'Profile' },
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
                    <Text style={[
                      styles.tabLabel,
                      { color: isFocused ? '#8b5cf6' : '#7f8c8d' }
                    ]}>
                      {tab.label}
                    </Text>
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
                  <Text style={styles.notificationLabel}></Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      >
        <Tab.Screen name="Dashboard" component={WorkingMemberDashboard} />
        <Tab.Screen name="Members" component={WorkingMemberRegisteredMembers} />
        <Tab.Screen name="Shop" component={WorkingMemberECommerce} />
        <Tab.Screen name="Events" component={WorkingMemberEvents} />
        <Tab.Screen name="Profile" component={WorkingMemberProfile} />
      </Tab.Navigator>
    </>
  );
}

// ============ MAIN APP ============
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
        <ActivityIndicator size="large" color="#FF7722" />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <NavigationContainer>
        <Stack.Navigator 
          initialRouteName="PublicTabs"
          screenOptions={{ headerShown: false }}
        >
          {/* Public Tabs - Shows Home, Shop, Events, Profile */}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e8ecf1',
    height: 75,
    paddingBottom: 8,
    paddingTop: 4,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 5,
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
    top: -35,
    left: '50%',
    marginLeft: -32,
    zIndex: 999,
    alignItems: 'center',
  },
  notificationLabel: {
    fontFamily: Fonts.SemiBold,
    fontSize: 9,
    color: '#ffffff',
    marginTop: 1,
  },
  notificationButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
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
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FF7722',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  workingNotificationButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
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