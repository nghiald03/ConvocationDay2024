import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';

class AuthViewModel extends ChangeNotifier {
  String? _accessToken;
  String? get token => _accessToken;

  Future<void> loadToken() async {
    final prefs = await SharedPreferences.getInstance();
    _accessToken = prefs.getString('accessToken');
    notifyListeners();
  }

  Future<void> saveToken(String token) async {
    final prefs = await SharedPreferences.getInstance();
    _accessToken = token;
    await prefs.setString('accessToken', token);
  }

  Future<void> logout(BuildContext context) async {
    final prefs = await SharedPreferences.getInstance();
    _accessToken = null;
    await prefs.remove('accessToken');
    notifyListeners();
    context.go('/login');
  }

  bool get isLoggedIn => _accessToken != null && _accessToken!.isNotEmpty;
}
