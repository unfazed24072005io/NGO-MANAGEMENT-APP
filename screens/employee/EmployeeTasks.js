// screens/employee/EmployeeTasks.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl, FlatList, Modal, TextInput } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { db, auth } from '../../config/firebase';
import { collection, query, where, getDocs, onSnapshot, updateDoc, doc, orderBy, getDoc } from 'firebase/firestore';
import { Fonts } from '../../config/fonts';

export default function EmployeeTasks({ navigation }) {
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [employeeId, setEmployeeId] = useState('');

  useEffect(() => {
    fetchEmployeeId();
  }, []);

  const fetchEmployeeId = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const data = userDoc.data();
        if (data.employeeId) {
          setEmployeeId(data.employeeId);
          setupTasksListener(data.employeeId);
        }
      }
    } catch (error) {
      console.error('Error fetching employee ID:', error);
    }
  };

  const setupTasksListener = (empId) => {
    const q = query(
      collection(db, 'employeeTasks'),
      where('assignedTo', '==', empId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tasksList = [];
      snapshot.forEach((doc) => {
        tasksList.push({ id: doc.id, ...doc.data() });
      });
      setTasks(tasksList);
      applyFilters(tasksList, searchQuery, filterStatus);
      setLoading(false);
    });

    return () => unsubscribe();
  };

  const applyFilters = (data, searchText, status) => {
    let filtered = data;

    if (searchText) {
      filtered = filtered.filter(task =>
        task.title?.toLowerCase().includes(searchText.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchText.toLowerCase()) ||
        task.category?.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    if (status !== 'all') {
      filtered = filtered.filter(task => task.status === status);
    }

    setFilteredTasks(filtered);
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
    applyFilters(tasks, text, filterStatus);
  };

  const handleFilterPress = (status) => {
    setFilterStatus(status);
    applyFilters(tasks, searchQuery, status);
  };

  const handleStatusUpdate = async (taskId, status) => {
    Alert.alert(
      'Update Task Status',
      `Are you sure you want to mark this task as ${status}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Update',
          onPress: async () => {
            try {
              await updateDoc(doc(db, 'employeeTasks', taskId), {
                status,
                updatedAt: new Date().toISOString()
              });
              Alert.alert('Success', `Task status updated to ${status}`);
            } catch (error) {
              Alert.alert('Error', error.message);
            }
          }
        }
      ]
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'completed': return '#10b981';
      case 'in-progress': return '#3b82f6';
      case 'pending': return '#f59e0b';
      case 'cancelled': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'completed': return 'check-circle';
      case 'in-progress': return 'play-circle';
      case 'pending': return 'pending';
      case 'cancelled': return 'cancel';
      default: return 'info';
    }
  };

  const StatCard = ({ label, count, icon, color }) => (
    <TouchableOpacity 
      style={[styles.statCard, { borderLeftColor: color }]}
      onPress={() => {
        const statusMap = {
          'Total': 'all',
          'Pending': 'pending',
          'In Progress': 'in-progress',
          'Completed': 'completed'
        };
        handleFilterPress(statusMap[label] || 'all');
      }}
    >
      <View style={styles.statIconContainer}>
        <MaterialIcons name={icon} size={20} color={color} />
      </View>
      <View>
        <Text style={styles.statCount}>{count}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    </TouchableOpacity>
  );

  const TaskCard = ({ task }) => (
    <TouchableOpacity 
      style={styles.taskCard}
      onPress={() => {
        setSelectedTask(task);
        setDetailModalVisible(true);
      }}
    >
      <View style={styles.taskHeader}>
        <View style={styles.taskTitleContainer}>
          <View style={[styles.taskStatusDot, { backgroundColor: getStatusColor(task.status) }]} />
          <Text style={styles.taskTitle} numberOfLines={1}>{task.title}</Text>
        </View>
        <View style={[styles.taskStatusBadge, { backgroundColor: getStatusColor(task.status) + '15' }]}>
          <Text style={[styles.taskStatusText, { color: getStatusColor(task.status) }]}>
            {task.status || 'pending'}
          </Text>
        </View>
      </View>

      <Text style={styles.taskDescription} numberOfLines={2}>
        {task.description || 'No description'}
      </Text>

      <View style={styles.taskDetails}>
        <View style={styles.taskDetail}>
          <MaterialIcons name="category" size={14} color="#6b7280" />
          <Text style={styles.taskDetailText}>{task.category || 'General'}</Text>
        </View>
        <View style={[styles.taskPriorityBadge, { backgroundColor: getPriorityColor(task.priority) + '15' }]}>
          <MaterialIcons name="flag" size={12} color={getPriorityColor(task.priority)} />
          <Text style={[styles.taskPriorityText, { color: getPriorityColor(task.priority) }]}>
            {task.priority || 'medium'}
          </Text>
        </View>
      </View>

      <View style={styles.taskFooter}>
        <Text style={styles.taskDueDate}>Due: {task.dueDate || 'N/A'}</Text>
        <Text style={styles.taskAssignedBy}>Assigned by: {task.assignedByName || 'Admin'}</Text>
      </View>

      {task.status !== 'completed' && task.status !== 'cancelled' && (
        <View style={styles.taskActions}>
          {task.status === 'pending' && (
            <TouchableOpacity 
              style={[styles.actionButton, styles.startButton]}
              onPress={() => handleStatusUpdate(task.id, 'in-progress')}
            >
              <MaterialIcons name="play-arrow" size={14} color="#ffffff" />
              <Text style={styles.actionButtonText}>Start</Text>
            </TouchableOpacity>
          )}
          {task.status === 'in-progress' && (
            <TouchableOpacity 
              style={[styles.actionButton, styles.completeButton]}
              onPress={() => handleStatusUpdate(task.id, 'completed')}
            >
              <MaterialIcons name="check" size={14} color="#ffffff" />
              <Text style={styles.actionButtonText}>Complete</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Tasks</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <MaterialIcons name="search" size={20} color="#9ca3af" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search tasks..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={handleSearch}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <MaterialIcons name="close" size={20} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <StatCard 
            label="Total" 
            count={tasks.length} 
            icon="assignment" 
            color="#FF7722" 
          />
          <StatCard 
            label="Pending" 
            count={tasks.filter(t => t.status === 'pending').length} 
            icon="pending" 
            color="#f59e0b" 
          />
          <StatCard 
            label="In Progress" 
            count={tasks.filter(t => t.status === 'in-progress').length} 
            icon="play-circle" 
            color="#3b82f6" 
          />
          <StatCard 
            label="Completed" 
            count={tasks.filter(t => t.status === 'completed').length} 
            icon="check-circle" 
            color="#10b981" 
          />
        </View>
      </View>

      {/* Task List */}
      <FlatList
        data={filteredTasks}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <TaskCard task={item} />}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FF7722']} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialIcons name="assignment" size={44} color="#d1d5db" />
            <Text style={styles.emptyStateText}>No tasks assigned</Text>
            <Text style={styles.emptyStateSubtext}>You have no tasks at the moment</Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />

      {/* Task Detail Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={detailModalVisible}
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <ScrollView style={styles.modalContent}>
            {selectedTask && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Task Details</Text>
                  <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                    <MaterialIcons name="close" size={24} color="#6b7280" />
                  </TouchableOpacity>
                </View>

                <View style={styles.detailStatusBar}>
                  <View style={[styles.detailStatusBadge, { backgroundColor: getStatusColor(selectedTask.status) + '15' }]}>
                    <MaterialIcons name={getStatusIcon(selectedTask.status)} size={16} color={getStatusColor(selectedTask.status)} />
                    <Text style={[styles.detailStatusText, { color: getStatusColor(selectedTask.status) }]}>
                      {selectedTask.status || 'pending'}
                    </Text>
                  </View>
                  <View style={[styles.detailPriorityBadge, { backgroundColor: getPriorityColor(selectedTask.priority) + '15' }]}>
                    <MaterialIcons name="flag" size={14} color={getPriorityColor(selectedTask.priority)} />
                    <Text style={[styles.detailPriorityText, { color: getPriorityColor(selectedTask.priority) }]}>
                      {selectedTask.priority || 'medium'}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Title</Text>
                  <Text style={styles.detailValue}>{selectedTask.title}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Description</Text>
                  <Text style={styles.detailValue}>{selectedTask.description || 'No description'}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Category</Text>
                  <Text style={styles.detailValue}>{selectedTask.category || 'General'}</Text>
                </View>

                <View style={styles.detailRow}>
                  <View style={[styles.detailSection, { flex: 1 }]}>
                    <Text style={styles.detailLabel}>Due Date</Text>
                    <Text style={styles.detailValue}>{selectedTask.dueDate || 'N/A'}</Text>
                  </View>
                  <View style={[styles.detailSection, { flex: 1 }]}>
                    <Text style={styles.detailLabel}>Assigned By</Text>
                    <Text style={styles.detailValue}>{selectedTask.assignedByName || 'Admin'}</Text>
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Assigned Date</Text>
                  <Text style={styles.detailValue}>
                    {selectedTask.createdAt ? new Date(selectedTask.createdAt).toLocaleDateString() : 'N/A'}
                  </Text>
                </View>

                {selectedTask.status !== 'completed' && selectedTask.status !== 'cancelled' && (
                  <View style={styles.detailActions}>
                    {selectedTask.status === 'pending' && (
                      <TouchableOpacity 
                        style={[styles.detailActionButton, styles.detailStartButton]}
                        onPress={() => {
                          setDetailModalVisible(false);
                          handleStatusUpdate(selectedTask.id, 'in-progress');
                        }}
                      >
                        <MaterialIcons name="play-arrow" size={16} color="#ffffff" />
                        <Text style={styles.detailActionText}>Start Task</Text>
                      </TouchableOpacity>
                    )}
                    {selectedTask.status === 'in-progress' && (
                      <TouchableOpacity 
                        style={[styles.detailActionButton, styles.detailCompleteButton]}
                        onPress={() => {
                          setDetailModalVisible(false);
                          handleStatusUpdate(selectedTask.id, 'completed');
                        }}
                      >
                        <MaterialIcons name="check" size={16} color="#ffffff" />
                        <Text style={styles.detailActionText}>Mark Complete</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fdf8f3',
  },

  headerCard: {
    backgroundColor: '#FF7722',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontFamily: Fonts.Bold,
    fontSize: 20,
    color: '#ffffff',
    flex: 1,
    textAlign: 'center',
  },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: '#1f2937',
  },

  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    padding: 6,
    borderRadius: 10,
    gap: 6,
  },
  statIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statCount: {
    fontFamily: Fonts.Bold,
    fontSize: 14,
    color: '#ffffff',
  },
  statLabel: {
    fontFamily: Fonts.Regular,
    fontSize: 9,
    color: 'rgba(255,255,255,0.8)',
  },

  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },

  taskCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  taskTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  taskStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  taskTitle: {
    fontFamily: Fonts.SemiBold,
    fontSize: 14,
    color: '#1f2937',
    flex: 1,
  },
  taskStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  taskStatusText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 10,
  },
  taskDescription: {
    fontFamily: Fonts.Regular,
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 8,
  },
  taskDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  taskDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  taskDetailText: {
    fontFamily: Fonts.Regular,
    fontSize: 11,
    color: '#6b7280',
  },
  taskPriorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 4,
  },
  taskPriorityText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 10,
  },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  taskDueDate: {
    fontFamily: Fonts.Regular,
    fontSize: 11,
    color: '#6b7280',
  },
  taskAssignedBy: {
    fontFamily: Fonts.Regular,
    fontSize: 11,
    color: '#9ca3af',
  },
  taskActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  startButton: {
    backgroundColor: '#3b82f6',
  },
  completeButton: {
    backgroundColor: '#10b981',
  },
  actionButtonText: {
    fontFamily: Fonts.SemiBold,
    color: '#ffffff',
    fontSize: 12,
  },

  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    gap: 12,
  },
  emptyStateText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 16,
    color: '#1f2937',
  },
  emptyStateSubtext: {
    fontFamily: Fonts.Regular,
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
  },

  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontFamily: Fonts.Bold,
    fontSize: 20,
    color: '#1f2937',
  },
  detailStatusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  detailStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  detailStatusText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 12,
  },
  detailPriorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  detailPriorityText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 12,
  },
  detailSection: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    gap: 12,
  },
  detailLabel: {
    fontFamily: Fonts.SemiBold,
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  detailValue: {
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: '#1f2937',
  },
  detailActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  detailActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  detailStartButton: {
    backgroundColor: '#3b82f6',
  },
  detailCompleteButton: {
    backgroundColor: '#10b981',
  },
  detailActionText: {
    fontFamily: Fonts.SemiBold,
    color: '#ffffff',
    fontSize: 14,
  },
});