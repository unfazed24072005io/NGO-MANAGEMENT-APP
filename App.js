import React, { useState, useEffect } from 'react';
import { Platform, SafeAreaView, View, ActivityIndicator, TouchableOpacity, Text, StyleSheet, Modal } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { MaterialIcons } from '@expo/vector-icons';
import { loadFonts, Fonts } from './config/fonts';
import WelcomeScreen from './screens/WelcomeScreen';
import CartScreen from './screens/member/CartScreen';
import CheckoutScreen from './screens/member/CheckoutScreen';
// Auth Screens
import LoginScreen from './screens/LoginScreen';
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
import NoticeComplaintManagement from './screens/admin/NoticeComplaintManagement';
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

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Custom Tab Bar for Admin with Notification at Center
function AdminTabs() {
  const [fabModalVisible, setFabModalVisible] = useState(false);
  const [notificationCount, setNotificationCount] = useState(3);

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
            return <MaterialIcons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: '#4a90e2',
          tabBarInactiveTintColor: '#7f8c8d',
          tabBarStyle: {
            backgroundColor: '#ffffff',
            borderTopWidth: 1,
            borderTopColor: '#e8ecf1',
            height: 75,
            paddingBottom: 10,
            paddingTop: 8,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '500',
            marginBottom: 5,
          },
          headerShown: false,
        })}
        tabBar={(props) => {
          const { state, descriptors, navigation } = props;
          navigationRef = navigation;
          
          const tabs = [
            { name: 'Dashboard', icon: 'dashboard', label: 'Dashboard' },
            { name: 'Members', icon: 'people', label: 'Members' },
            { name: 'E-Commerce', icon: 'shopping-cart', label: 'E-Commerce' },
            { name: 'Finance', icon: 'attach-money', label: 'Finance' },
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
                      size={24} 
                      color={isFocused ? '#4a90e2' : '#7f8c8d'} 
                    />
                    <Text style={[
                      styles.tabLabel, 
                      { color: isFocused ? '#4a90e2' : '#7f8c8d' }
                    ]}>
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              <View style={styles.notificationWrapper}>
                <TouchableOpacity
                  style={styles.adminNotificationButton}
                  onPress={() => setFabModalVisible(true)}
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
        <Tab.Screen name="Profile" component={AdminProfile} />
      </Tab.Navigator>

      <Modal
        animationType="fade"
        transparent={true}
        visible={fabModalVisible}
        onRequestClose={() => setFabModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setFabModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Quick Actions</Text>
              
              <TouchableOpacity 
                style={styles.modalItem}
                onPress={() => {
                  setFabModalVisible(false);
                  if (navigationRef) {
                    navigationRef.navigate('NoticeComplaint');
                  }
                }}
              >
                <View style={[styles.modalItemIcon, { backgroundColor: '#4a90e2' }]}>
                  <MaterialIcons name="announcement" size={24} color="#ffffff" />
                </View>
                <View style={styles.modalItemTextContainer}>
                  <Text style={styles.modalItemTitle}>View Notices & Complaints</Text>
                  <Text style={styles.modalItemSubtitle}>Manage notices and complaints</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.modalItem}
                onPress={() => {
                  setFabModalVisible(false);
                  if (navigationRef) {
                    navigationRef.navigate('CompanyProfile');
                  }
                }}
              >
                <View style={[styles.modalItemIcon, { backgroundColor: '#8b5cf6' }]}>
                  <MaterialIcons name="business" size={24} color="#ffffff" />
                </View>
                <View style={styles.modalItemTextContainer}>
                  <Text style={styles.modalItemTitle}>Company Profile</Text>
                  <Text style={styles.modalItemSubtitle}>Manage company details</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.modalItem}
                onPress={() => {
                  setFabModalVisible(false);
                  if (navigationRef) {
                    navigationRef.navigate('WorkingMemberList');
                  }
                }}
              >
                <View style={[styles.modalItemIcon, { backgroundColor: '#10b981' }]}>
                  <MaterialIcons name="work" size={24} color="#ffffff" />
                </View>
                <View style={styles.modalItemTextContainer}>
                  <Text style={styles.modalItemTitle}>Working Members</Text>
                  <Text style={styles.modalItemSubtitle}>Manage working members</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setFabModalVisible(false)}
              >
                <Text style={styles.modalCloseButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

// Custom Tab Bar for Member with Notification at Center
function MemberTabs() {
  const [fabModalVisible, setFabModalVisible] = useState(false);
  const [notificationCount, setNotificationCount] = useState(3);

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
            paddingBottom: 10,
            paddingTop: 8,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '500',
            marginBottom: 5,
          },
          headerShown: false,
        })}
        tabBar={(props) => {
          const { state, descriptors, navigation } = props;
          navigationRef = navigation;
          
          const tabs = [
            { name: 'Dashboard', icon: 'dashboard', label: 'Dashboard' },
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
                  onPress={() => setFabModalVisible(true)}
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
        <Tab.Screen name="Donate" component={DonationScreen} />
        <Tab.Screen name="Profile" component={MemberProfile} />
      </Tab.Navigator>

      <Modal
        animationType="fade"
        transparent={true}
        visible={fabModalVisible}
        onRequestClose={() => setFabModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setFabModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Quick Actions</Text>
              
              <TouchableOpacity 
                style={styles.modalItem}
                onPress={() => {
                  setFabModalVisible(false);
                  if (navigationRef) {
                    navigationRef.navigate('MemberNotice');
                  }
                }}
              >
                <View style={[styles.modalItemIcon, { backgroundColor: '#3b82f6' }]}>
                  <MaterialIcons name="announcement" size={24} color="#ffffff" />
                </View>
                <View style={styles.modalItemTextContainer}>
                  <Text style={styles.modalItemTitle}>View Notices</Text>
                  <Text style={styles.modalItemSubtitle}>Check latest updates</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.modalItem}
                onPress={() => {
                  setFabModalVisible(false);
                  if (navigationRef) {
                    navigationRef.navigate('MemberComplaint');
                  }
                }}
              >
                <View style={[styles.modalItemIcon, { backgroundColor: '#ef4444' }]}>
                  <MaterialIcons name="report-problem" size={24} color="#ffffff" />
                </View>
                <View style={styles.modalItemTextContainer}>
                  <Text style={styles.modalItemTitle}>Submit Complaint</Text>
                  <Text style={styles.modalItemSubtitle}>Report an issue</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.modalItem}
                onPress={() => {
                  setFabModalVisible(false);
                  if (navigationRef) {
                    navigationRef.navigate('MemberCompany');
                  }
                }}
              >
                <View style={[styles.modalItemIcon, { backgroundColor: '#8b5cf6' }]}>
                  <MaterialIcons name="business" size={24} color="#ffffff" />
                </View>
                <View style={styles.modalItemTextContainer}>
                  <Text style={styles.modalItemTitle}>Company Info</Text>
                  <Text style={styles.modalItemSubtitle}>View company details</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setFabModalVisible(false)}
              >
                <Text style={styles.modalCloseButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

// Custom Tab Bar for Working Member with Notification at Center
function WorkingMemberTabs() {
  const [fabModalVisible, setFabModalVisible] = useState(false);
  const [notificationCount, setNotificationCount] = useState(3);

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
            return <MaterialIcons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: '#8b5cf6',
          tabBarInactiveTintColor: '#7f8c8d',
          tabBarStyle: {
            backgroundColor: '#ffffff',
            borderTopWidth: 1,
            borderTopColor: '#e8ecf1',
            height: 75,
            paddingBottom: 10,
            paddingTop: 8,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '500',
            marginBottom: 5,
          },
          headerShown: false,
        })}
        tabBar={(props) => {
          const { state, descriptors, navigation } = props;
          navigationRef = navigation;
          
          const tabs = [
            { name: 'Dashboard', icon: 'dashboard', label: 'Dashboard' },
            { name: 'Members', icon: 'people', label: 'Members' },
            { name: 'Shop', icon: 'shopping-cart', label: 'Shop' },
            { name: 'Commission', icon: 'attach-money', label: 'Commission' },
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
                  onPress={() => setFabModalVisible(true)}
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
        <Tab.Screen name="Commission" component={WorkingMemberCommission} />
        <Tab.Screen name="Profile" component={WorkingMemberProfile} />
      </Tab.Navigator>

      <Modal
        animationType="fade"
        transparent={true}
        visible={fabModalVisible}
        onRequestClose={() => setFabModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setFabModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Quick Actions</Text>
              
              <TouchableOpacity 
                style={styles.modalItem}
                onPress={() => {
                  setFabModalVisible(false);
                  if (navigationRef) {
                    navigationRef.navigate('WorkingMemberNotice');
                  }
                }}
              >
                <View style={[styles.modalItemIcon, { backgroundColor: '#3b82f6' }]}>
                  <MaterialIcons name="announcement" size={24} color="#ffffff" />
                </View>
                <View style={styles.modalItemTextContainer}>
                  <Text style={styles.modalItemTitle}>View Notices</Text>
                  <Text style={styles.modalItemSubtitle}>Check latest updates</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.modalItem}
                onPress={() => {
                  setFabModalVisible(false);
                  if (navigationRef) {
                    navigationRef.navigate('WorkingMemberComplaint');
                  }
                }}
              >
                <View style={[styles.modalItemIcon, { backgroundColor: '#ef4444' }]}>
                  <MaterialIcons name="report-problem" size={24} color="#ffffff" />
                </View>
                <View style={styles.modalItemTextContainer}>
                  <Text style={styles.modalItemTitle}>Submit Complaint</Text>
                  <Text style={styles.modalItemSubtitle}>Report an issue</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.modalItem}
                onPress={() => {
                  setFabModalVisible(false);
                  if (navigationRef) {
                    navigationRef.navigate('WorkingMemberSuggestion');
                  }
                }}
              >
                <View style={[styles.modalItemIcon, { backgroundColor: '#f59e0b' }]}>
                  <MaterialIcons name="lightbulb" size={24} color="#ffffff" />
                </View>
                <View style={styles.modalItemTextContainer}>
                  <Text style={styles.modalItemTitle}>Submit Suggestion</Text>
                  <Text style={styles.modalItemSubtitle}>Share your ideas</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.modalItem}
                onPress={() => {
                  setFabModalVisible(false);
                  if (navigationRef) {
                    navigationRef.navigate('WorkingMemberCompany');
                  }
                }}
              >
                <View style={[styles.modalItemIcon, { backgroundColor: '#10b981' }]}>
                  <MaterialIcons name="business" size={24} color="#ffffff" />
                </View>
                <View style={styles.modalItemTextContainer}>
                  <Text style={styles.modalItemTitle}>Company Info</Text>
                  <Text style={styles.modalItemSubtitle}>View company details</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setFabModalVisible(false)}
              >
                <Text style={styles.modalCloseButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
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
          
          {/* Auth Screens */}
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          
          {/* Admin Screens */}
          <Stack.Screen name="AdminTabs" component={AdminTabs} />
          <Stack.Screen name="WorkingMemberList" component={WorkingMemberManagement} />
          <Stack.Screen name="NoticeComplaint" component={NoticeComplaintManagement} />
          <Stack.Screen name="CompanyProfile" component={CompanyProfileManagement} />
          <Stack.Screen name="CompanyManagement" component={CompanyManagement} />
          
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
    paddingBottom: 10,
    paddingTop: 8,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 5,
    position: 'relative',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  notificationBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
  },
  modalContent: {
    width: '100%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#f9fafb',
  },
  modalItemIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  modalItemTextContainer: {
    flex: 1,
  },
  modalItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  modalItemSubtitle: {
    fontSize: 12,
    color: '#6b7280',
  },
  modalCloseButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    marginTop: 8,
  },
  modalCloseButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
});