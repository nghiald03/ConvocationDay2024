import 'package:dio/dio.dart';
import 'package:mobile/config/token_storage.dart';

class DioClient {
  static final Dio _dio = Dio(
    BaseOptions(
      baseUrl: "http://143.198.84.82:85/api",
      connectTimeout: Duration(seconds: 20),
      receiveTimeout: Duration(seconds: 20),
      headers: {"Content-Type": "application/json"},
    ),
  );

  // Khởi tạo 1 lần duy nhất
  static void init() {
    _dio.interceptors.clear(); // tránh trùng lặp nếu hot reload

    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await TokenStorage.getToken();
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          return handler.next(options);
        },
      ),
    );

    _dio.interceptors.add(
      LogInterceptor(requestBody: true, responseBody: true),
    );
  }

  static Dio get client => _dio;
}
