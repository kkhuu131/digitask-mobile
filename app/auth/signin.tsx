import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Button, Input } from '@rneui/themed';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAuthStore } from '@/stores/authStore';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { signIn, error, isLoading } = useAuthStore();

  const handleSignIn = async () => {
    if (!email || !password) {
      return;
    }
    
    await signIn(email, password);
    if (!useAuthStore.getState().error) {
      router.replace('/(tabs)');
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>Sign In</ThemedText>
      
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
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      
      <Button
        title="Sign In"
        onPress={handleSignIn}
        loading={isLoading}
        buttonStyle={styles.button}
      />
      
      <TouchableOpacity onPress={() => router.push('/auth/signup')}>
        <ThemedText style={styles.linkText}>
          Don't have an account? Sign Up
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