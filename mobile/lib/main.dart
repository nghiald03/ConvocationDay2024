import 'package:flutter/material.dart';
import 'package:mobile/app.dart';
import 'package:mobile/config/dio_client.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  DioClient.init();
  runApp(const MyApp());
}
