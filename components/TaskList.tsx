import React, { useState, useMemo } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { TaskItem } from './TaskItem';
import { Task } from '@/stores/taskStore';
import { IconSymbol } from './ui/IconSymbol';
import { Swipeable } from 'react-native-gesture-handler';
import Toast from 'react-native-toast-message';

interface TaskListProps {
  tasks: Task[];
  penalizedTasks: string[];
  onCompleteTask: (id: string) => Promise<void>;
  onEditTask: (task: Task) => void;
  onAddTask: () => void;
  onDeleteTask: (id: string) => Promise<void>;
}

type FilterType = 'all' | 'pending' | 'completed' | 'daily';

export const TaskList: React.FC<TaskListProps> = ({
  tasks,
  penalizedTasks,
  onCompleteTask,
  onEditTask,
  onAddTask,
  onDeleteTask
}) => {
  const [filter, setFilter] = useState<FilterType>('pending');
  
  // Group tasks based on current filter
  const groupedTasks = useMemo(() => {
    // Filter tasks based on current filter
    let filteredTasks = tasks;
    
    if (filter === 'pending') {
      filteredTasks = tasks.filter(task => !task.is_completed);
    } else if (filter === 'completed') {
      filteredTasks = tasks.filter(task => task.is_completed);
    } else if (filter === 'daily') {
      filteredTasks = tasks.filter(task => task.is_daily);
    }
    
    // Sort tasks: pending first, then by due date
    filteredTasks.sort((a, b) => {
      // Completed tasks come last
      if (a.is_completed && !b.is_completed) return 1;
      if (!a.is_completed && b.is_completed) return -1;
      
      // Sort by due date if available
      if (a.due_date && b.due_date) {
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      }
      
      // Tasks with due date come before tasks without due date
      if (a.due_date && !b.due_date) return -1;
      if (!a.due_date && b.due_date) return 1;
      
      // Default sort by creation date
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
    
    return filteredTasks;
  }, [tasks, filter]);
  
  // Filter selection header component
  const ListHeaderComponent = () => (
    <View style={styles.filterContainer}>
      <TouchableOpacity
        style={[styles.filterButton, filter === 'all' && styles.activeFilter]}
        onPress={() => setFilter('all')}
      >
        <ThemedText style={[styles.filterText, filter === 'all' && styles.activeFilterText]}>
          All
        </ThemedText>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.filterButton, filter === 'pending' && styles.activeFilter]}
        onPress={() => setFilter('pending')}
      >
        <ThemedText style={[styles.filterText, filter === 'pending' && styles.activeFilterText]}>
          Pending
        </ThemedText>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.filterButton, filter === 'completed' && styles.activeFilter]}
        onPress={() => setFilter('completed')}
      >
        <ThemedText style={[styles.filterText, filter === 'completed' && styles.activeFilterText]}>
          Completed
        </ThemedText>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.filterButton, filter === 'daily' && styles.activeFilter]}
        onPress={() => setFilter('daily')}
      >
        <ThemedText style={[styles.filterText, filter === 'daily' && styles.activeFilterText]}>
          Daily
        </ThemedText>
      </TouchableOpacity>
    </View>
  );
  
  const renderRightActions = (task: Task) => {
    return (
      <TouchableOpacity 
        style={styles.deleteAction}
        onPress={() => handleDeleteTask(task.id)}
      >
        <IconSymbol name="trash" size={20} color="#fff" />
      </TouchableOpacity>
    );
  };
  
  const handleDeleteTask = async (id: string) => {
    try {
      await onDeleteTask(id);
      Toast.show({
        type: 'success',
        text1: 'Task deleted',
        position: 'bottom',
        visibilityTime: 2000,
      });
    } catch (error) {
      console.error('Error deleting task:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Could not delete task',
        position: 'bottom',
      });
    }
  };
  
  const renderTaskItem = ({ item }: { item: Task }) => (
    <Swipeable
      renderRightActions={() => renderRightActions(item)}
      friction={2}
      rightThreshold={40}
    >
      <TaskItem
        task={item}
        onComplete={onCompleteTask}
        onPress={onEditTask}
        isPenalized={penalizedTasks.includes(item.id)}
      />
    </Swipeable>
  );
  
  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <IconSymbol name="list.bullet.clipboard" size={48} color="#ccc" />
      <ThemedText style={styles.emptyText}>
        {filter === 'all' ? "No tasks yet" :
         filter === 'pending' ? "No pending tasks" :
         filter === 'completed' ? "No completed tasks" : 
         "No daily tasks"}
      </ThemedText>
      <ThemedText style={styles.emptySubtext}>
        {filter === 'all' || filter === 'pending' ? 
          "Tap + to add a new task" : "Complete tasks to see them here"}
      </ThemedText>
    </View>
  );
  
  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText style={styles.title}>Tasks</ThemedText>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={onAddTask}
        >
          <IconSymbol name="plus" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={groupedTasks}
        renderItem={renderTaskItem}
        keyExtractor={item => item.id}
        ListHeaderComponent={ListHeaderComponent}
        ListEmptyComponent={renderEmptyList}
        style={styles.list}
        contentContainerStyle={[
          // Add padding at the bottom to prevent overlap with bottom navigation
          { paddingBottom: 80 },
          // If empty, align at top instead of centering vertically
          groupedTasks.length === 0 && styles.emptyListContent
        ]}
      />
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 16,
    marginHorizontal: 4,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  addButton: {
    backgroundColor: '#3D7BF4',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  filterButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginRight: 8,
  },
  activeFilter: {
    backgroundColor: '#3D7BF4',
  },
  filterText: {
    fontSize: 14,
  },
  activeFilterText: {
    color: '#fff',
    fontWeight: '500',
  },
  list: {
    flex: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
    marginTop: 20, // Add some top margin to push it down from the filters
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    opacity: 0.6,
    marginTop: 8,
    textAlign: 'center',
  },
  // Change this style to align at top instead of center
  emptyListContent: {
    flexGrow: 1,
    justifyContent: 'flex-start', // Changed from 'center' to 'flex-start'
  },
  deleteAction: {
    backgroundColor: '#F44336',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '100%',
  },
}); 