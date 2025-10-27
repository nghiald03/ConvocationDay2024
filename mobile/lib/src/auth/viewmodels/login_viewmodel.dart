import 'package:flutter/material.dart';
import 'package:mobile/src/auth/models/repositories/login_repository.dart';
import 'package:go_router/go_router.dart';

class LoginViewModel extends ChangeNotifier {
  final LoginRepository _repository = LoginRepository();

  bool _isLoading = false;
  bool get isLoading => _isLoading;

  String email = '';
  String password = '';

  Future<void> login(BuildContext context) async {
    if (email.isEmpty || password.isEmpty) return;

    _isLoading = true;
    notifyListeners();

    try {
      bool result = await _repository.login(email, password);

      _isLoading = false;
      notifyListeners();

      if (result) {
        context.go('/home');
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Email hoặc mật khẩu không đúng')),
        );
      }
    } catch (e) {
      _isLoading = false;
      notifyListeners();
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Lỗi kết nối: $e')));
    }
  }
}
