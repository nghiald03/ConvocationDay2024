import 'package:go_router/go_router.dart';
import 'package:mobile/home.dart';
import 'package:mobile/src/auth/views/login.dart';

final GoRouter appRouter = GoRouter(
  initialLocation: '/login',
  routes: [
    GoRoute(
      path: '/login',
      name: 'login',
      builder: (context, state) => const LoginScreen(),
    ),
    GoRoute(
      path: '/home',
      name: 'home',
      builder: (context, state) => const HomeScreen(),
      routes: [],
    ),
  ],
);
