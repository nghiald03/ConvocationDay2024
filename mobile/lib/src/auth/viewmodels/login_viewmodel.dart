import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:mobile/src/auth/models/repositories/login_repository.dart';
import 'package:mobile/src/auth/viewmodels/auth_viewmodel.dart';

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
      final token = await _repository.login(email, password);

      if (token.isNotEmpty) {
        await context.read<AuthViewModel>().saveToken(token);

        context.go('/home'); // <==== CHUYỂN TRANG LUÔN
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Email hoặc mật khẩu không đúng')),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Lỗi kết nối: $e')));
    }

    _isLoading = false;
    notifyListeners();
  }
}
