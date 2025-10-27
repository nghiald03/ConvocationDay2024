import 'package:dio/dio.dart';
import 'package:mobile/config/dio_client.dart';
import 'package:mobile/config/token_storage.dart';

class LoginRepository {
  final Dio _dio = DioClient.client;

  Future<bool> login(String email, String password) async {
    final response = await _dio.post(
      '/auth/login',
      data: {'email': email, 'password': password},
    );

    if (response.statusCode == 200) {
      final token = response.data['token']; // tùy backend trả về
      if (token != null) {
        await TokenStorage.saveToken(token);
        return true;
      }
    }
    return false;
  }
}
