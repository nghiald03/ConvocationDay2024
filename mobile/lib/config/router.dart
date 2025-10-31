import 'package:go_router/go_router.dart';
import 'package:mobile/home.dart';
import 'package:mobile/src/auth/views/login.dart';

final GoRouter router = GoRouter(
  initialLocation: '/login',
  routes: [
    GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
    GoRoute(path: '/home', builder: (_, __) => const HomeScreen()),
  ],
);
