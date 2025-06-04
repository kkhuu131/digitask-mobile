import React, { useState, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedView } from '@/components/ThemedView';
import { useAuthStore } from '@/stores/authStore';
import { useDigimonStore } from '@/stores/petStore';
import { useTaskStore } from '@/stores/taskStore';
import { DigimonDisplay } from '@/components/DigimonDisplay';
import { TaskList } from '@/components/TaskList';
import { DailyQuotaDisplay } from '@/components/DailyQuotaDisplay';
import { TaskForm } from '@/components/TaskForm';
import { Task } from '@/stores/taskStore';
import { IconSymbol } from '@/components/ui/IconSymbol';
import PixelatedImage from '@/components/PixelatedImage';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function HomeScreen() {
  const router = useRouter();
  const { userProfile } = useAuthStore();
  const { userDigimon, fetchUserDigimon, fetchAllUserDigimon } = useDigimonStore();
  const { 
    tasks, 
    fetchTasks, 
    completeTask, 
    createTask, 
    updateTask,
    checkOverdueTasks,
    penalizedTasks,
    dailyQuota,
    fetchDailyQuota,
    getExpMultiplier,
    deleteTask
  } = useTaskStore();
  
  const [isTaskFormVisible, setIsTaskFormVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined);
  
  // Fetch initial data
  useEffect(() => {
    const initializeData = async () => {
      await fetchUserDigimon();
      await fetchAllUserDigimon();
      await fetchTasks();
      await fetchDailyQuota();
      await checkOverdueTasks();
    };
    
    initializeData();
  }, []);
  
  // Handle task completion
  const handleCompleteTask = async (id: string, autoAllocate = true) => {
    try {
      await completeTask(id, autoAllocate); // auto-allocate stats
      // Explicitly refresh Digimon data after task completion
      await fetchUserDigimon();
      await fetchDailyQuota();
    } catch (error) {
      console.error("Error in handleCompleteTask:", error);
    }
  };
  
  // Handle editing a task
  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setIsTaskFormVisible(true);
  };
  
  // Handle saving a task (create or update)
  const handleSaveTask = async (taskData: Partial<Task>) => {
    if (editingTask) {
      await updateTask(editingTask.id, taskData);
    } else {
      await createTask(taskData);
    }
    
    // Refresh data
    await fetchTasks();
    setIsTaskFormVisible(false);
    setEditingTask(undefined);
  };
  
  // Handle adding a new task
  const handleAddTask = () => {
    setEditingTask(undefined);
    setIsTaskFormVisible(true);
  };
  
  // Navigate to Digimon details
  const handleDigimonPress = () => {
    // @ts-ignore - This is a navigation route
    router.push('/digimon-details');
  };
  
  // Calculate daily quota stats
  const dailyQuotaProps = {
    completedToday: dailyQuota?.completed_today || 0,
    quota: 3, // This is defined in the taskStore as DAILY_QUOTA_AMOUNT
    streak: dailyQuota?.current_streak || 0,
    multiplier: getExpMultiplier()
  };
  
  // Add the deleteTask handler
  const handleDeleteTask = async (id: string) => {
    await deleteTask(id);
    await fetchTasks();
  };
  
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemedView style={styles.container}>
        {/* <View style={styles.headerBg}>
          <IconSymbol
            name="pawprint.fill"
            size={170}
            color="rgba(255,255,255,0.2)"
            style={styles.headerImage}
          />
        </View> */}
        
        <View style={styles.topSection}>
          {/* Digimon Display */}
          <DigimonDisplay 
            userDigimon={userDigimon} 
            onPress={handleDigimonPress}
          />

          
          {/* Daily Quota Display */}
          <DailyQuotaDisplay {...dailyQuotaProps} />
        </View>
        
        {/* Tasks List - Takes remaining space */}
        <View style={styles.taskListContainer}>
          <TaskList
            tasks={tasks}
            penalizedTasks={penalizedTasks}
            onCompleteTask={handleCompleteTask}
            onEditTask={handleEditTask}
            onAddTask={handleAddTask}
            onDeleteTask={handleDeleteTask}
          />
        </View>
        
        {/* Task Form Modal */}
        <TaskForm
          isVisible={isTaskFormVisible}
          onClose={() => {
            setIsTaskFormVisible(false);
            setEditingTask(undefined);
          }}
          onSave={handleSaveTask}
          onDelete={handleDeleteTask}
          task={editingTask}
        />
      </ThemedView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBg: {
    height: 120,
    backgroundColor: '#1D3D47',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
  },
  headerImage: {
    position: 'absolute',
    bottom: -20,
    right: -20,
  },
  topSection: {
    paddingTop: 40,
    paddingHorizontal: 16,
    zIndex: 1,
  },
  taskListContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 16,
  }
});
