import 'package:flutter/material.dart';
import 'package:mobile/app.dart';
import 'package:mobile/src/auth/viewmodels/auth_viewmodel.dart';
import 'package:provider/provider.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final authVM = AuthViewModel();
  await authVM.loadToken();

  runApp(ChangeNotifierProvider(create: (_) => authVM, child: MyApp()));
}
