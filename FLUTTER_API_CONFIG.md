# Flutter API Configuration Guide

## Problem
Flutter app running on Android emulator cannot connect to `localhost:8000` because `localhost` refers to the emulator itself, not your host machine.

## Solutions

### Option 1: Use Android Emulator's Special IP (Recommended for Android Emulator)
For Android emulator, use `10.0.2.2` instead of `localhost`:

```dart
// lib/config/api_config.dart
class ApiConfig {
  // For Android Emulator
  static const String baseUrl = 'http://10.0.2.2:8000';
  
  // For iOS Simulator (use localhost)
  // static const String baseUrl = 'http://localhost:8000';
  
  // For Physical Device (use your computer's IP)
  // static const String baseUrl = 'http://192.168.1.XXX:8000';
  
  static const String apiBase = '$baseUrl/api';
}
```

### Option 2: Use Your Computer's IP Address (For Physical Devices)
1. Find your computer's IP address:
   - Mac/Linux: `ifconfig | grep "inet " | grep -v 127.0.0.1`
   - Windows: `ipconfig`
   
2. Use that IP in your Flutter app:
```dart
static const String baseUrl = 'http://192.168.1.XXX:8000'; // Replace XXX with your IP
```

### Option 3: Platform-Specific Configuration
```dart
// lib/config/api_config.dart
import 'dart:io';

class ApiConfig {
  static String get baseUrl {
    if (Platform.isAndroid) {
      return 'http://10.0.2.2:8000'; // Android emulator
    } else if (Platform.isIOS) {
      return 'http://localhost:8000'; // iOS simulator
    } else {
      // For web or other platforms
      return 'http://localhost:8000';
    }
  }
  
  static String get apiBase => '$baseUrl/api';
}
```

## Fix ScaffoldMessenger Error

The error occurs when trying to access `ScaffoldMessenger` before the widget tree is ready. Fix it by using a `BuildContext` that's guaranteed to be mounted:

```dart
// Instead of this (WRONG):
void showError() {
  ScaffoldMessenger.of(context).showSnackBar(...);
}

// Do this (CORRECT):
void showError(BuildContext context) {
  if (!context.mounted) return; // Check if context is still valid
  ScaffoldMessenger.of(context).showSnackBar(...);
}

// Or use a GlobalKey:
final scaffoldMessengerKey = GlobalKey<ScaffoldMessengerState>();

// In your MaterialApp:
MaterialApp(
  scaffoldMessengerKey: scaffoldMessengerKey,
  // ...
)

// Then use it:
scaffoldMessengerKey.currentState?.showSnackBar(...);
```

## Quick Fix for styled_snackbar.dart

Update your `styled_snackbar.dart` file:

```dart
// lib/widgets/styled_snackbar.dart
import 'package:flutter/material.dart';

class StyledSnackBar {
  static void showError(BuildContext context, String message) {
    // Check if context is mounted before using it
    if (!context.mounted) return;
    
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.red,
        action: SnackBarAction(
          label: 'OK',
          textColor: Colors.white,
          onPressed: () {
            // Don't access ScaffoldMessenger here - just close
          },
        ),
      ),
    );
  }
}
```

## Verify Backend is Running

Make sure your backend is accessible:
```bash
# Test from terminal
curl http://localhost:8000/api/health

# Should return: {"status":"healthy"}
```

## Testing Connection from Emulator

You can test the connection from your Flutter app:
```dart
import 'package:http/http.dart' as http;

Future<void> testConnection() async {
  try {
    final response = await http.get(
      Uri.parse('http://10.0.2.2:8000/api/health'),
    );
    print('Connection successful: ${response.body}');
  } catch (e) {
    print('Connection failed: $e');
  }
}
```
