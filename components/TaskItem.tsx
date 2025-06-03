import React from 'react';
import { View, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { CheckBox } from '@rneui/themed';
import { ThemedText } from './ThemedText';
import { IconSymbol } from './ui/IconSymbol';
import { getExpPoints, Task } from '@/stores/taskStore';
import { useColorScheme } from '@/hooks/useColorScheme';
import { format } from 'date-fns';
import Toast from 'react-native-toast-message';

// Days of the week abbreviations
const DAY_ABBREVIATIONS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface TaskItemProps {
  task: Task;
  onComplete: (id: string) => void;
  onPress: (task: Task) => void;
  isPenalized?: boolean;
}

export const TaskItem: React.FC<TaskItemProps> = ({ 
  task, 
  onComplete, 
  onPress,
  isPenalized = false
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  // Animation values
  const fadeAnim = React.useRef(new Animated.Value(1)).current;
  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  
  // Format date to a more readable format
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No due date';
    
    const date = new Date(dateString);
    const today = new Date();
    
    // If it's today, just show time
    if (date.toDateString() === today.toDateString()) {
      return `Today, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    // If it's tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    if (date.toDateString() === tomorrow.toDateString()) {
      return `Tomorrow, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    // Otherwise show date
    return date.toLocaleDateString([], { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Format recurring days into readable text
  const formatRecurringDays = () => {
    if (!task.recurring_days || task.recurring_days.length === 0) return '';
    
    // Convert recurring_days to numbers
    const days = task.recurring_days.map(day => typeof day === 'string' ? parseInt(day, 10) : day);
    
    // Check for special patterns
    const isWeekdays = [1, 2, 3, 4, 5].every(day => days.includes(day)) && 
                     ![0, 6].some(day => days.includes(day));
    
    const isWeekends = [0, 6].every(day => days.includes(day)) && 
                      ![1, 2, 3, 4, 5].some(day => days.includes(day));
    
    const isAllDays = days.length === 7;
    
    // Return special pattern text
    if (isAllDays) return 'Daily';
    if (isWeekdays) return 'Weekdays';
    if (isWeekends) return 'Weekends';
    
    // Otherwise, format individual days with distinguishable abbreviations
    const dayAbbreviations = ['Su', 'M', 'Tu', 'W', 'Th', 'F', 'Sa'];
    return days.sort().map(day => dayAbbreviations[day]).join(', ');
  };
  
  // Format task schedule text
  const formatTaskSchedule = () => {
    if (task.due_date) {
      return formatDate(task.due_date);
    } else if (task.is_daily) {
      return 'Daily';
    } else if (task.recurring_days && task.recurring_days.length > 0) {
      return formatRecurringDays();
    } else {
      return 'One-time';
    }
  };
  
  // Get appropriate icon for the task type
  const getTaskIcon = () => {
    if (task.is_daily) return "repeat";
    if (task.recurring_days) return "calendar";
    return "list.bullet";
  };
  
  // Get appropriate color for the task status
  const getTaskColor = () => {
    if (task.is_completed) return "#4CAF50"; // Green
    if (isPenalized) return "#F44336"; // Red
    
    // Check if task is overdue
    if (task.due_date) {
      const dueDate = new Date(task.due_date);
      const now = new Date();
      if (dueDate < now && !task.is_daily && !task.recurring_days) {
        return "#FF9800"; // Orange for overdue
      }
    }
    
    return "#3D7BF4"; // Default blue
  };
  
  // Format the due date nicely
  const formatDueDate = () => {
    if (!task.due_date) return null;
    const dueDate = new Date(task.due_date);
    return format(dueDate, 'MMM dd, yyyy');
  };
  
  // Handle task completion with animation
  const handleToggleComplete = async () => {
    if (!task.is_completed) {
      // Start animation
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 1.05,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0.7,
          duration: 150,
          useNativeDriver: true,
        })
      ]).start();
      
      try {
        // Complete the task
        await onComplete(task.id);
        
        // Show success toast
        Toast.show({
          type: 'success',
          text1: `Active Digimon gained +${getExpPoints(task)} XP gained ${task.category && `and +1 ${task.category}`}`,
          text2: `Reserve Digimon gained +${Math.round(getExpPoints(task) / 2)} XP gained`,
          position: 'top',
          visibilityTime: 2000,
        });
        
        // Finish animation
        Animated.parallel([
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnim, {
            toValue: 0.6,
            duration: 150,
            useNativeDriver: true,
          })
        ]).start();
      } catch (error) {
        // Reset animation if error
        Animated.parallel([
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          })
        ]).start();
        
        // Show error toast
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Could not complete task',
          position: 'bottom',
        });
      }
    }
  };
  
  // Handle editing the task
  const handleEdit = () => {
    onPress(task);
  };
  
  // Determine if the task is overdue
  const isOverdue = () => {
    if (task.is_completed || !task.due_date) return false;
    
    const now = new Date();
    const dueDate = new Date(task.due_date);
    dueDate.setHours(23, 59, 59, 999); // End of the due date
    
    return now > dueDate;
  };
  
  return (
    <Animated.View style={{ 
      transform: [{ scale: scaleAnim }],
      opacity: task.is_completed ? fadeAnim : 1
    }}>
      <TouchableOpacity 
        style={[
          styles.container, 
          task.is_completed && styles.completedTask,
          isPenalized && styles.penalizedTask
        ]} 
        onPress={handleEdit}
        activeOpacity={0.7}
      >
        <View style={styles.iconContainer}>
          <IconSymbol 
            name={getTaskIcon()} 
            size={16} 
            color={getTaskColor()} 
          />
        </View>
        
        <View style={styles.contentContainer}>
          <ThemedText 
            style={[
              styles.description, 
              task.is_completed && styles.completedText
            ]}
            numberOfLines={2}
          >
            {task.description}
          </ThemedText>
          
          {/* Add notes display if notes exist */}
          {task.notes && (
            <ThemedText 
              style={[
                styles.notes,
                task.is_completed && styles.completedText
              ]}
              numberOfLines={2}
            >
              {task.notes}
            </ThemedText>
          )}
          
          <View style={styles.metaRow}>
            {task.category && (
              <View style={[styles.categoryBadge, { backgroundColor: getTaskColor() + '20' }]}>
                <ThemedText style={[styles.categoryText, { color: getTaskColor() }]}>
                  {task.category}
                </ThemedText>
              </View>
            )}
            
            <ThemedText style={styles.dateText}>
              {formatTaskSchedule()}
            </ThemedText>
          </View>
        </View>
        
        <CheckBox
          checked={task.is_completed}
          onPress={handleToggleComplete}
          checkedColor={getTaskColor()}
          uncheckedColor={isDark ? '#777777' : '#cccccc'}
          checkedIcon="check-circle"
          uncheckedIcon="circle-o"
          containerStyle={[
            styles.checkboxContainer,
            isDark && styles.darkCheckboxContainer
          ]}
          disabled={task.is_completed}
        />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  completedTask: {
    opacity: 0.7,
  },
  penalizedTask: {
    backgroundColor: 'rgba(244, 67, 54, 0.05)',
  },
  iconContainer: {
    width: 30,
    alignItems: 'center',
  },
  contentContainer: {
    flex: 1,
    paddingRight: 8,
  },
  description: {
    fontSize: 16,
    marginBottom: 4,
  },
  completedText: {
    textDecorationLine: 'line-through',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginRight: 8,
  },
  categoryText: {
    fontSize: 12,
  },
  dateText: {
    fontSize: 12,
    opacity: 0.6,
  },
  checkboxContainer: {
    backgroundColor: 'transparent',
    padding: 0,
    margin: 0,
    marginLeft: 8,
    borderWidth: 0,
  },
  darkCheckboxContainer: {
    backgroundColor: 'transparent',
  },
  notes: {
    fontSize: 13,
    marginBottom: 4,
    fontStyle: 'italic',
    opacity: 0.7,
    marginTop: -2,
  },
}); 