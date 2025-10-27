import 'package:dio/dio.dart';
import 'package:mobile/config/token_storage.dart'; // dùng để đọc token khi gọi API

class DioClient {
  static final Dio _dio = Dio(
    BaseOptions(
      baseUrl: "http://143.198.84.82:85/api",
      connectTimeout: const Duration(seconds: 20),
      receiveTimeout: const Duration(seconds: 20),
      headers: {"Content-Type": "application/json"},
    ),
  );

  static Dio get client {
    // tránh thêm interceptor nhiều lần
    if (_dio.interceptors.isEmpty) {
      _dio.interceptors.add(
        InterceptorsWrapper(
          onRequest: (options, handler) async {
            // Lấy token từ local
            final token = await TokenStorage.getToken();
            if (token != null && token.isNotEmpty) {
              options.headers['Authorization'] = 'Bearer $token';
            }
            return handler.next(options);
          },
          onError: (DioException error, handler) {
            if (error.response?.statusCode == 401) {
              TokenStorage.clearToken(); // Token hết hạn → logout
            }
            return handler.next(error);
          },
        ),
      );

      _dio.interceptors.add(
        LogInterceptor(requestBody: true, responseBody: true),
      );
    }

    return _dio;
  }
}
