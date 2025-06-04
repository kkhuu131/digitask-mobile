import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, TextInput, Platform, ScrollView, Alert } from 'react-native';
import { Button } from '@rneui/themed';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { Task } from '@/stores/taskStore';
import { IconSymbol } from './ui/IconSymbol';
import Toast from 'react-native-toast-message';
import { StatCategory } from '@/utils/categoryDetection';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

// Available stat categories for the dropdown
const STAT_CATEGORIES: StatCategory[] = ["HP", "SP", "ATK", "DEF", "INT", "SPD"];

// Task types
type TaskType = 'daily' | 'one-time' | 'recurring';

// Days of the week for recurring tasks
const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface TaskFormProps {
  isVisible: boolean;
  onClose: () => void;
  onSave: (task: Partial<Task>) => Promise<void>;
  task?: Task;
  onDelete: (id: string) => Promise<void>;
}

export const TaskForm: React.FC<TaskFormProps> = ({
  isVisible,
  onClose,
  onSave,
  task,
  onDelete
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  // Form state
  const [description, setDescription] = useState(task?.description || '');
  const [category, setCategory] = useState<StatCategory | ''>((task?.category as StatCategory) || '');
  const [notes, setNotes] = useState(task?.notes || '');
  const [dueDate, setDueDate] = useState(task?.due_date ? new Date(task.due_date) : null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  
  // Task type state
  const [taskType, setTaskType] = useState<TaskType>('one-time');
  
  // Recurring days state
  const [recurringDays, setRecurringDays] = useState<number[]>([]);
  
  const isEditing = !!task;
  
  // Reset form when visible changes or task changes
  useEffect(() => {
    if (isVisible) {
      setDescription(task?.description || '');
      setCategory((task?.category as StatCategory) || '');
      setNotes(task?.notes || '');
      
      // Set task type based on task properties
      if (task?.is_daily) {
        setTaskType('daily');
      } else if (task?.recurring_days && task.recurring_days.length > 0) {
        setTaskType('recurring');
        setRecurringDays(task.recurring_days.map(Number));
      } else {
        setTaskType('one-time');
      }
      
      setDueDate(task?.due_date ? new Date(task.due_date) : null);
    }
  }, [isVisible, task]);
  
  const handleSave = async () => {
    if (!description.trim()) return;
    
    try {
      // Validate recurring task has at least one day selected
      if (taskType === 'recurring' && recurringDays.length === 0) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Please select at least one day for recurring tasks',
          position: 'top',
        });
        return;
      }
      
      const taskData: Partial<Task> = {
        description: description.trim(),
        category: category || null,
        notes: notes.trim() || null,
        is_daily: taskType === 'daily',
        recurring_days: taskType === 'recurring' ? recurringDays.map(String) : null,
        due_date: taskType === 'one-time' && dueDate ? dueDate.toISOString() : null,
      };
      
      await onSave(taskData);
      
      // Show success toast
      Toast.show({
        type: 'success',
        text1: isEditing ? 'Task Updated' : 'Task Created',
        position: 'top',
        visibilityTime: 2000,
      });
    } catch (error) {
      console.error('Error saving task:', error);
      
      // Show error toast
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: `Could not ${isEditing ? 'update' : 'create'} task`,
        position: 'top',
      });
    }
  };
  
  const onChangeDate = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDueDate(selectedDate);
    }
  };
  
  // Toggle a day in recurring days
  const toggleRecurringDay = (dayIndex: number) => {
    if (recurringDays.includes(dayIndex)) {
      setRecurringDays(recurringDays.filter(d => d !== dayIndex));
    } else {
      setRecurringDays([...recurringDays, dayIndex]);
    }
  };
  
  // Get text input styling based on theme
  const getTextInputStyle = () => {
    return {
      borderColor: isDark ? '#555' : '#ddd',
      color: isDark ? '#fff' : '#000',
      backgroundColor: isDark ? 'rgba(30,30,30,0.8)' : 'transparent',
    };
  };
  
  // Replace the delete confirmation modal with an Alert
  const handleDeletePress = () => {
    Alert.alert(
      "Delete Task?",
      "This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        { 
          text: "Delete", 
          onPress: async () => {
            if (task?.id) {
              try {
                await onDelete(task.id);
                Toast.show({
                  type: 'success',
                  text1: 'Task Deleted',
                  position: 'top',
                  visibilityTime: 2000,
                });
                onClose();
              } catch (error) {
                console.error('Error deleting task:', error);
                Toast.show({
                  type: 'error',
                  text1: 'Error',
                  text2: 'Could not delete task',
                  position: 'top',
                });
              }
            }
          },
          style: "destructive"
        }
      ],
      { cancelable: true }
    );
  };
  
  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <ThemedView style={styles.modalContent}>
          <View style={styles.header}>
            <ThemedText style={styles.title}>
              {isEditing ? 'Edit Task' : 'New Task'}
            </ThemedText>
            <TouchableOpacity onPress={onClose}>
              <IconSymbol name="xmark" size={24} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.scrollView}>
            <View style={styles.form}>
              <View style={styles.formGroup}>
                <ThemedText style={styles.label}>Description</ThemedText>
                <TextInput
                  style={[styles.input, getTextInputStyle()]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="What needs to be done?"
                  placeholderTextColor={isDark ? '#999' : '#999'}
                />
              </View>
              
              <View style={styles.formGroup}>
                <ThemedText style={styles.label}>Category</ThemedText>
                <TouchableOpacity
                  style={[
                    styles.dropdownButton, 
                    {
                      borderColor: isDark ? '#555' : '#ddd',
                      backgroundColor: isDark ? 'rgba(30,30,30,0.8)' : 'transparent',
                    }
                  ]}
                  onPress={() => setShowCategoryDropdown(!showCategoryDropdown)}
                >
                  <ThemedText style={category ? styles.dropdownSelectedText : styles.dropdownPlaceholderText}>
                    {category || "Select stat to boost"}
                  </ThemedText>
                  <IconSymbol name="chevron.down" size={16} color="#3D7BF4" />
                </TouchableOpacity>
                
                {showCategoryDropdown && (
                  <ThemedView style={styles.dropdownMenu}>
                    {STAT_CATEGORIES.map((stat) => (
                      <TouchableOpacity
                        key={stat}
                        style={[
                          styles.dropdownItem, 
                          {
                            borderBottomColor: isDark ? '#333' : '#f0f0f0',
                          }
                        ]}
                        onPress={() => {
                          setCategory(stat);
                          setShowCategoryDropdown(false);
                        }}
                      >
                        <ThemedText style={[
                          styles.dropdownItemText,
                          category === stat && styles.dropdownItemSelectedText
                        ]}>
                          {stat}
                        </ThemedText>
                      </TouchableOpacity>
                    ))}
                    <TouchableOpacity
                      style={styles.dropdownItem}
                      onPress={() => {
                        setCategory('');
                        setShowCategoryDropdown(false);
                      }}
                    >
                      <ThemedText style={styles.dropdownItemText}>None</ThemedText>
                    </TouchableOpacity>
                  </ThemedView>
                )}
              </View>
              
              <View style={styles.formGroup}>
                <ThemedText style={styles.label}>Notes (Optional)</ThemedText>
                <TextInput
                  style={[styles.input, styles.textArea, getTextInputStyle()]}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Add some details..."
                  placeholderTextColor={isDark ? '#999' : '#999'}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
              
              <View style={styles.formGroup}>
                <ThemedText style={styles.label}>Task Type</ThemedText>
                <View style={styles.taskTypeContainer}>
                  <TouchableOpacity 
                    style={[
                      styles.taskTypeOption,
                      taskType === 'daily' && styles.taskTypeSelected,
                      {borderColor: isDark ? '#555' : '#ddd'}
                    ]}
                    onPress={() => setTaskType('daily')}
                  >
                    <IconSymbol 
                      name="repeat" 
                      size={18} 
                      color={taskType === 'daily' ? '#3D7BF4' : (isDark ? '#999' : '#666')} 
                    />
                    <ThemedText style={[
                      styles.taskTypeText,
                      taskType === 'daily' && styles.taskTypeSelectedText
                    ]}>
                      Daily
                    </ThemedText>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[
                      styles.taskTypeOption,
                      taskType === 'recurring' && styles.taskTypeSelected,
                      {borderColor: isDark ? '#555' : '#ddd'}
                    ]}
                    onPress={() => setTaskType('recurring')}
                  >
                    <IconSymbol 
                      name="calendar" 
                      size={18} 
                      color={taskType === 'recurring' ? '#3D7BF4' : (isDark ? '#999' : '#666')} 
                    />
                    <ThemedText style={[
                      styles.taskTypeText,
                      taskType === 'recurring' && styles.taskTypeSelectedText
                    ]}>
                      Recurring
                    </ThemedText>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[
                      styles.taskTypeOption,
                      taskType === 'one-time' && styles.taskTypeSelected,
                      {borderColor: isDark ? '#555' : '#ddd'}
                    ]}
                    onPress={() => setTaskType('one-time')}
                  >
                    <IconSymbol 
                      name="clock" 
                      size={18} 
                      color={taskType === 'one-time' ? '#3D7BF4' : (isDark ? '#999' : '#666')} 
                    />
                    <ThemedText style={[
                      styles.taskTypeText,
                      taskType === 'one-time' && styles.taskTypeSelectedText
                    ]}>
                      One-time
                    </ThemedText>
                  </TouchableOpacity>
                </View>
              </View>
              
              {taskType === 'recurring' && (
                <View style={styles.formGroup}>
                  <ThemedText style={styles.label}>Repeat on these days:</ThemedText>
                  <View style={styles.weekdaysContainer}>
                    {DAYS_OF_WEEK.map((day, index) => (
                      <TouchableOpacity
                        key={day}
                        style={[
                          styles.weekdayItem,
                          recurringDays.includes(index) && styles.weekdaySelected,
                          {borderColor: isDark ? '#555' : '#ddd'}
                        ]}
                        onPress={() => toggleRecurringDay(index)}
                      >
                        <ThemedText style={[
                          styles.weekdayText,
                          recurringDays.includes(index) && styles.weekdaySelectedText
                        ]}>
                          {day.substring(0, 3)}
                        </ThemedText>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
              
              {taskType === 'one-time' && (
                <View style={styles.formGroup}>
                  <ThemedText style={styles.label}>Due Date (Optional)</ThemedText>
                  <TouchableOpacity
                    style={[
                      styles.dateButton, 
                      {
                        borderColor: isDark ? '#555' : '#ddd',
                        backgroundColor: isDark ? 'rgba(30,30,30,0.8)' : 'transparent',
                      }
                    ]}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <IconSymbol name="calendar" size={18} color="#3D7BF4" />
                    <ThemedText style={styles.dateText}>
                      {dueDate 
                        ? dueDate.toLocaleDateString([], { 
                            month: 'short', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : 'Set date and time'}
                    </ThemedText>
                  </TouchableOpacity>
                  
                  {showDatePicker && (
                    <DateTimePicker
                      value={dueDate || new Date()}
                      mode="datetime"
                      display="default"
                      onChange={onChangeDate}
                      themeVariant={isDark ? 'dark' : 'light'}
                    />
                  )}
                </View>
              )}
            </View>
          </ScrollView>
          
          <View style={styles.buttonContainer}>
            {isEditing ? (
              <>
                <Button
                  title="Delete"
                  type="outline"
                  onPress={handleDeletePress}
                  buttonStyle={styles.deleteButton}
                  titleStyle={{ color: '#F44336' }}
                />
                <View style={{ flexDirection: 'row' }}>
                  <Button
                    title="Cancel"
                    type="outline"
                    onPress={onClose}
                    buttonStyle={styles.cancelButton}
                    containerStyle={{ marginRight: 8 }}
                  />
                  <Button
                    title="Update"
                    onPress={handleSave}
                    disabled={!description.trim()}
                    buttonStyle={styles.saveButton}
                  />
                </View>
              </>
            ) : (
              <>
                <Button
                  title="Cancel"
                  type="outline"
                  onPress={onClose}
                  buttonStyle={styles.cancelButton}
                />
                <Button
                  title="Create"
                  onPress={handleSave}
                  disabled={!description.trim()}
                  buttonStyle={styles.saveButton}
                />
              </>
            )}
          </View>
        </ThemedView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  scrollView: {
    maxHeight: '80%',
  },
  form: {
    padding: 20,
    paddingTop: 0,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    paddingTop: 12,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  dateText: {
    marginLeft: 8,
    fontSize: 16,
  },
  taskTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  taskTypeOption: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  taskTypeSelected: {
    borderColor: '#3D7BF4',
    backgroundColor: 'rgba(61, 123, 244, 0.1)',
  },
  taskTypeText: {
    fontSize: 14,
    marginTop: 4,
  },
  taskTypeSelectedText: {
    color: '#3D7BF4',
    fontWeight: 'bold',
  },
  weekdaysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  weekdayItem: {
    width: '30%',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  weekdaySelected: {
    borderColor: '#3D7BF4',
    backgroundColor: 'rgba(61, 123, 244, 0.1)',
  },
  weekdayText: {
    fontSize: 14,
  },
  weekdaySelectedText: {
    color: '#3D7BF4',
    fontWeight: 'bold',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 10,
  },
  cancelButton: {
    minWidth: 120,
    borderColor: '#3D7BF4',
    borderRadius: 8,
  },
  saveButton: {
    minWidth: 120,
    backgroundColor: '#3D7BF4',
    borderRadius: 8,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 6,
  },
  dropdownPlaceholderText: {
    color: '#999',
  },
  dropdownSelectedText: {
    fontWeight: '500',
  },
  dropdownMenu: {
    position: 'absolute',
    top: 72,
    left: 0,
    right: 0,
    borderWidth: 1,
    borderRadius: 6,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
    zIndex: 10,
  },
  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  dropdownItemText: {
    fontSize: 16,
  },
  dropdownItemSelectedText: {
    fontWeight: 'bold',
    color: '#3D7BF4',
  },
  deleteButton: {
    backgroundColor: 'transparent',
    borderColor: '#F44336',
    borderRadius: 8,
  },
}); 