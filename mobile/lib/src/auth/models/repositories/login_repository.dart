import 'package:dio/dio.dart';
import 'package:mobile/config/dio_client.dart';

class LoginRepository {
  final Dio _dio = DioClient.client;

  Future<String> login(String email, String password) async {
    final response = await _dio.post(
      '/Auth/Login',
      data: {'userName': email, 'password': password},
    );

    if (response.statusCode == 200) {
      final token = response.data['accessToken']; // tùy backend trả về
      if (token != null) {
        return token;
      }
    }
    return '';
  }
}
