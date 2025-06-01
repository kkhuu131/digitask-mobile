import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Button, Input } from '@rneui/themed';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAuthStore } from '@/stores/authStore';

export default function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const { signUp, error, isLoading } = useAuthStore();

  const handleSignUp = async () => {
    if (!email || !password || !username) {
      return;
    }
    
    await signUp(email, password, username);
    if (!useAuthStore.getState().error) {
      router.replace('/(tabs)');
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>Create Account</ThemedText>
      
      {error && (
        <ThemedText style={styles.errorText}>{error}</ThemedText>
      )}
      
      <Input
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      
      <Input
        placeholder="Username"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
      />
      
      <Input
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      
      <Button
        title="Sign Up"
        onPress={handleSignUp}
        loading={isLoading}
        buttonStyle={styles.button}
      />
      
      <TouchableOpacity onPress={() => router.push('/auth/signin')}>
        <ThemedText style={styles.linkText}>
          Already have an account? Sign In
        </ThemedText>
      </TouchableOpacity>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    marginBottom: 30,
    textAlign: 'center',
  },
  button: {
    marginTop: 10,
    marginBottom: 20,
  },
  errorText: {
    color: 'red',
    marginBottom: 10,
    textAlign: 'center',
  },
  linkText: {
    textAlign: 'center',
    marginTop: 15,
  },
}); 