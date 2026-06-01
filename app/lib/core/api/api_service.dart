import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../config/app_config.dart';
import '../models/analytics.dart';
import '../models/appointment.dart';
import '../models/blocked_slot.dart';
import '../models/business.dart';
import '../models/project.dart';
import '../models/service.dart';
import '../models/staff.dart';
import '../models/customer.dart'
    show
        BusinessCustomField,
        CheckoutQuestion,
        Customer,
        CustomerDetail,
        CustomerFieldValue,
        CustomerSearchResult,
        CustomerStage,
        CustomerTag,
        DormantCustomer,
        HomeAppointment,
        HomeData,
        HomeMilestone,
        HomeProject,
        PendingPayment,
        Reminder,
        ReminderItem,
        SimpleCustomer;
import '../models/order.dart';
import '../models/product.dart';
import 'api_client.dart';

class ApiException implements Exception {
  final String message;
  final int? statusCode;

  const ApiException(this.message, {this.statusCode});

  @override
  String toString() => message;
}

ApiException _wrap(DioException e) {
  final msg = (e.response?.data is Map)
      ? (e.response!.data as Map)['error'] as String? ?? e.message ?? 'Unknown error'
      : e.message ?? 'Network error';
  return ApiException(msg, statusCode: e.response?.statusCode);
}

class ApiService {
  final Dio _dio;

  const ApiService(this._dio);

  // ── Auth ──────────────────────────────────────────────────────

  Future<void> requestOtp(String phone) async {
    try {
      await _dio.post('/auth/request-otp', data: {'phone': phone});
    } on DioException catch (e) {
      throw _wrap(e);
    }
  }

  Future<({String token, Map<String, dynamic> user, Map<String, dynamic>? business})>
      verifyOtp(
    String phone,
    String code, {
    bool? generalConsent,
    bool? crossBorderConsent,
  }) async {
    try {
      final res = await _dio.post(
        '/auth/verify-otp',
        data: {
          'phone': phone,
          'code': code,
          if (generalConsent != null) 'generalConsent': generalConsent,
          if (crossBorderConsent != null) 'crossBorderConsent': crossBorderConsent,
        },
      );
      return (
        token: res.data['token'] as String,
        user: res.data['user'] as Map<String, dynamic>,
        business: res.data['business'] as Map<String, dynamic>?,
      );
    } on DioException catch (e) {
      throw _wrap(e);
    }
  }

  // ── Onboarding ────────────────────────────────────────────────

  Future<({bool valid, String botUsername, String botName})> verifyBotToken(
      String token) async {
    try {
      final res = await _dio.post(
        '/onboarding/verify-bot-token',
        data: {'token': token},
      );
      return (
        valid: res.data['valid'] as bool,
        botUsername: res.data['botUsername'] as String,
        botName: res.data['botName'] as String,
      );
    } on DioException catch (e) {
      throw _wrap(e);
    }
  }

  Future<({String id, String name, String botUsername, String botLink})>
      completeOnboarding({
    required String businessName,
    required List<String> modes,
    required String language,
    required String botToken,
    String? cardNumber,
    String? cardBank,
  }) async {
    try {
      final res = await _dio.post('/onboarding/complete', data: {
        'businessName': businessName,
        'mode': modes,
        'language': language,
        'botToken': botToken,
        if (cardNumber != null && cardNumber.isNotEmpty) 'cardNumber': cardNumber,
        if (cardBank != null) 'cardBank': cardBank,
      });
      final b = res.data['business'] as Map<String, dynamic>;
      return (
        id: b['id'] as String,
        name: b['name'] as String,
        botUsername: b['botUsername'] as String,
        botLink: b['botLink'] as String,
      );
    } on DioException catch (e) {
      throw _wrap(e);
    }
  }

  // ── Business ──────────────────────────────────────────────────

  Future<Business> getBusiness() async {
    try {
      final res = await _dio.get('/business');
      return Business.fromJson(res.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw _wrap(e);
    }
  }

  Future<Business> createBusiness(Map<String, dynamic> data) async {
    try {
      final res = await _dio.post('/business', data: data);
      return Business.fromJson(res.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw _wrap(e);
    }
  }

  Future<Business> updateBusiness(Map<String, dynamic> data) async {
    try {
      final res = await _dio.patch('/business', data: data);
      return Business.fromJson(res.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw _wrap(e);
    }
  }

  Future<void> registerFcmToken(String token) async {
    try {
      await _dio.patch('/business/fcm-token', data: {'fcmToken': token});
    } on DioException catch (e) {
      throw _wrap(e);
    }
  }

  Future<void> registerDeviceToken(String token) async {
    try {
      await _dio.post('/device-token', data: {'token': token});
    } on DioException catch (e) {
      throw _wrap(e);
    }
  }

  Future<({String? cardNumber, String? cardBank})> updatePayment(
      String cardNumber, String cardBank) async {
    try {
      final res = await _dio.patch(
        '/business/payment',
        data: {'cardNumber': cardNumber, 'cardBank': cardBank},
      );
      return (
        cardNumber: res.data['cardNumber'] as String?,
        cardBank: res.data['cardBank'] as String?,
      );
    } on DioException catch (e) {
      throw _wrap(e);
    }
  }

  Future<({String? botUsername, String? botLink})> getBotInfo() async {
    try {
      final res = await _dio.get('/business/bot');
      return (
        botUsername: res.data['botUsername'] as String?,
        botLink: res.data['botLink'] as String?,
      );
    } on DioException catch (e) {
      throw _wrap(e);
    }
  }

  // ── Calendar sync ─────────────────────────────────────────────

  // Public base URL for ICS feeds — the API root without the /api/v1 prefix.
  static String get calendarBaseUrl =>
      AppConfig.apiBaseUrl.replaceAll('/api/v1', '');

  Future<String> generateCalendarToken() async {
    try {
      final res = await _dio.post('/business/calendar-token');
      return res.data['calendarToken'] as String;
    } on DioException catch (e) {
      throw _wrap(e);
    }
  }

  Future<void> disableCalendarSync() async {
    try {
      await _dio.delete('/business/calendar-token');
    } on DioException catch (e) {
      throw _wrap(e);
    }
  }

  // ── Owner reminders ───────────────────────────────────────────

  Future<Map<String, dynamic>> getReminderSettings() async {
    try {
      final res = await _dio.get('/business/reminder-settings');
      return Map<String, dynamic>.from(res.data as Map);
    } on DioException catch (e) {
      throw _wrap(e);
    }
  }

  Future<Map<String, dynamic>> updateReminderSettings(
      Map<String, dynamic> settings) async {
    try {
      final res = await _dio.patch('/business/reminder-settings', data: settings);
      return Map<String, dynamic>.from(res.data as Map);
    } on DioException catch (e) {
      throw _wrap(e);
    }
  }

  // ── Orders ────────────────────────────────────────────────────

  Future<List<Order>> getOrders({
    String? status,
    String? date,
    String? customerId,
  }) async {
    try {
      final res = await _dio.get(
        '/orders',
        queryParameters: {
          if (status != null) 'status': status,
          if (date != null) 'date': date,
          if (customerId != null) 'customerId': customerId,
        },
      );
      return (res.data as List)
          .map((e) => Order.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw _wrap(e);
    }
  }

  Future<Order> getOrder(String id) async {
    try {
      final res = await _dio.get('/orders/$id');
      return Order.fromJson(res.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw _wrap(e);
    }
  }

  Future<Order> updateOrderStatus(String id, String status) async {
    try {
      final res = await _dio.patch('/orders/$id/status', data: {'status': status});
      return Order.fromJson(res.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw _wrap(e);
    }
  }

  Future<Order> confirmOrderPayment(String id) async {
    try {
      final res = await _dio.patch('/orders/$id/payment', data: {});
      return Order.fromJson(res.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw _wrap(e);
    }
  }

  // ── Products ──────────────────────────────────────────────────

  Future<List<Product>> getProducts() async {
    try {
      final res = await _dio.get('/products');
      return (res.data as List)
          .map((e) => Product.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw _wrap(e);
    }
  }

  Future<Product> getProduct(String id) async {
    try {
      final res = await _dio.get('/products/$id');
      return Product.fromJson(res.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw _wrap(e);
    }
  }

  Future<Product> createProduct(Map<String, dynamic> data) async {
    try {
      final res = await _dio.post('/products', data: data);
      return Product.fromJson(res.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw _wrap(e);
    }
  }

  Future<Product> updateProduct(String id, Map<String, dynamic> data) async {
    try {
      final res = await _dio.patch('/products/$id', data: data);
      return Product.fromJson(res.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw _wrap(e);
    }
  }

  Future<({String id, bool active})> toggleProduct(String id) async {
    try {
      final res = await _dio.patch('/products/$id/toggle', data: {});
      return (
        id: res.data['id'] as String,
        active: res.data['active'] as bool,
      );
    } on DioException catch (e) {
      throw _wrap(e);
    }
  }

  // ── Customers ─────────────────────────────────────────────────

  // ── Home ──────────────────────────────────────────────────────

  Future<HomeData> getHome(String businessName) async {
    try {
      final res = await _dio.get('/home');
      final json = res.data as Map<String, dynamic>;
      return HomeData(
        businessName: businessName,
        overdueReminders: (json['overdueReminders'] as List)
            .map((e) => ReminderItem.fromJson(e as Map<String, dynamic>))
            .toList(),
        dormantCustomers: (json['dormantCustomers'] as List)
            .map((e) => DormantCustomer.fromJson(e as Map<String, dynamic>))
            .toList(),
        todayOrders: (json['todayOrders'] as List)
            .map((e) => Order.fromJson(e as Map<String, dynamic>))
            .toList(),
        pendingPayments: (json['pendingPayments'] as List)
            .map((e) => PendingPayment.fromJson(e as Map<String, dynamic>))
            .toList(),
        newCustomers: (json['newCustomers'] as List)
            .map((e) => SimpleCustomer.fromJson(e as Map<String, dynamic>))
            .toList(),
        todayAppointments: (json['todayAppointments'] as List)
            .map((e) => HomeAppointment.fromJson(e as Map<String, dynamic>))
            .toList(),
        recentCancellations: (json['recentCancellations'] as List)
            .map((e) => HomeAppointment.fromJson(e as Map<String, dynamic>))
            .toList(),
        todayProjects: (json['todayProjects'] as List)
            .map((e) => HomeProject.fromJson(e as Map<String, dynamic>))
            .toList(),
        recentMilestones: (json['recentMilestones'] as List)
            .map((e) => HomeMilestone.fromJson(e as Map<String, dynamic>))
            .toList(),
      );
    } on DioException catch (e) {
      throw _wrap(e);
    }
  }

  Future<List<Customer>> getCustomers({
    String? search,
    int page = 1,
    int limit = 30,
  }) async {
    try {
      final res = await _dio.get(
        '/customers',
        queryParameters: {
          if (search != null && search.isNotEmpty) 'search': search,
          'page': page,
          'limit': limit,
        },
      );
      final data = res.data;
      if (data is List) {
        return data
            .map((e) => Customer.fromJson(e as Map<String, dynamic>))
            .toList();
      }
      if (data is Map && data['customers'] is List) {
        return (data['customers'] as List)
            .map((e) => Customer.fromJson(e as Map<String, dynamic>))
            .toList();
      }
      return [];
    } on DioException catch (e) {
      throw _wrap(e);
    }
  }

  Future<Customer> createCustomer({
    required String name,
    String? phone,
    String? telegramUsername,
  }) async {
    try {
      final res = await _dio.post(
        '/customers',
        data: {
          'name': name,
          if (phone != null) 'phone': phone,
          if (telegramUsername != null) 'telegramUsername': telegramUsername,
        },
      );
      return Customer.fromJson(res.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw _wrap(e);
    }
  }

  Future<List<CustomerSearchResult>> searchCustomers(String query) async {
    try {
      final res = await _dio.get(
        '/customers',
        queryParameters: {'search': query},
        options: Options(receiveTimeout: const Duration(seconds: 5)),
      );
      return (res.data['customers'] as List)
          .map((e) => CustomerSearchResult.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw _wrap(e);
    }
  }

  Future<CustomerDetail> getCustomer(String id) async {
    try {
      final res = await _dio.get(
        '/customers/$id',
        options: Options(
          receiveTimeout: const Duration(seconds: 20),
          sendTimeout: const Duration(seconds: 5),
        ),
      );
      return CustomerDetail.fromJson(res.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw _wrap(e);
    }
  }

  // ── Analytics ─────────────────────────────────────────────────

  Future<AnalyticsData> getAnalytics() async {
    try {
      final res = await _dio.get('/analytics');
      return AnalyticsData.fromJson(res.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw _wrap(e);
    }
  }

  Future<String?> updateCustomerNotes(String id, String notes) async {
    try {
      final res = await _dio.patch(
        '/customers/$id/notes',
        data: {'notes': notes},
      );
      return res.data['notes'] as String?;
    } on DioException catch (e) {
      throw _wrap(e);
    }
  }

  Future<void> updateCustomer(String id, Map<String, dynamic> data) async {
    try {
      await _dio.patch('/customers/$id', data: data);
    } on DioException catch (e) {
      throw _wrap(e);
    }
  }

  Future<CustomerTag> addTag(String customerId, String label, String color) async {
    try {
      final res = await _dio.post(
        '/customers/$customerId/tags',
        data: {'label': label, 'color': color},
      );
      return CustomerTag.fromJson(res.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw _wrap(e);
    }
  }

  Future<void> removeTag(String customerId, String tagId) async {
    try {
      await _dio.delete('/customers/$customerId/tags/$tagId');
    } on DioException catch (e) {
      throw _wrap(e);
    }
  }

  Future<Reminder> addReminder(
      String customerId, String note, DateTime dueDate) async {
    try {
      final res = await _dio.post(
        '/customers/$customerId/reminders',
        data: {'note': note, 'dueDate': dueDate.toUtc().toIso8601String()},
      );
      return Reminder.fromJson(res.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw _wrap(e);
    }
  }

  Future<void> toggleReminder(String reminderId, bool done) async {
    try {
      await _dio.patch('/reminders/$reminderId', data: {'done': done});
    } on DioException catch (e) {
      throw _wrap(e);
    }
  }

  Future<void> sendCustomerMessage(String customerId, String text) async {
    try {
      await _dio.post('/customers/$customerId/message', data: {'text': text});
    } on DioException catch (e) {
      throw _wrap(e);
    }
  }

  // ── Custom Fields ─────────────────────────────────────────────

  Future<List<BusinessCustomField>> getCustomFields() async {
    try {
      final res = await _dio.get('/custom-fields');
      return (res.data as List)
          .map((e) => BusinessCustomField.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw _wrap(e);
    }
  }

  Future<BusinessCustomField> createCustomField(
      String name, String fieldType, int order) async {
    try {
      final res = await _dio.post('/custom-fields',
          data: {'name': name, 'fieldType': fieldType, 'order': order});
      return BusinessCustomField.fromJson(res.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw _wrap(e);
    }
  }

  Future<void> deleteCustomField(String fieldId) async {
    try {
      await _dio.delete('/custom-fields/$fieldId');
    } on DioException catch (e) {
      throw _wrap(e);
    }
  }

  Future<List<CustomerFieldValue>> setCustomerFieldValues(
      String customerId, Map<String, String> values) async {
    try {
      final res = await _dio.patch(
        '/customers/$customerId/fields',
        data: {'values': values},
      );
      return (res.data as List)
          .map((e) => CustomerFieldValue.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw _wrap(e);
    }
  }

  // ── Stages ────────────────────────────────────────────────────

  Future<List<CustomerStage>> getStages() async {
    try {
      final res = await _dio.get('/stages');
      return (res.data as List)
          .map((e) => CustomerStage.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw _wrap(e);
    }
  }

  Future<CustomerStage> createStage(
      String name, String color, int order) async {
    try {
      final res = await _dio.post('/stages',
          data: {'name': name, 'color': color, 'order': order});
      return CustomerStage.fromJson(res.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw _wrap(e);
    }
  }

  Future<CustomerStage> updateStage(
      String stageId, Map<String, dynamic> data) async {
    try {
      final res = await _dio.patch('/stages/$stageId', data: data);
      return CustomerStage.fromJson(res.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw _wrap(e);
    }
  }

  Future<void> deleteStage(String stageId) async {
    try {
      await _dio.delete('/stages/$stageId');
    } on DioException catch (e) {
      throw _wrap(e);
    }
  }

  Future<CustomerStage?> setCustomerStage(
      String customerId, String? stageId) async {
    try {
      final res = await _dio.patch(
        '/customers/$customerId/stage',
        data: {'stageId': stageId},
      );
      final stage = (res.data as Map<String, dynamic>)['currentStage'];
      return stage != null
          ? CustomerStage.fromJson(stage as Map<String, dynamic>)
          : null;
    } on DioException catch (e) {
      throw _wrap(e);
    }
  }

  // ── Services ──────────────────────────────────────────────────

  Future<List<Service>> getServices() async {
    try {
      final res = await _dio.get('/services');
      return (res.data as List)
          .map((e) => Service.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw _wrap(e);
    }
  }

  Future<Service> createService(Map<String, dynamic> data) async {
    try {
      final res = await _dio.post('/services', data: data);
      return Service.fromJson(res.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw _wrap(e);
    }
  }

  Future<Service> updateService(String id, Map<String, dynamic> data) async {
    try {
      final res = await _dio.patch('/services/$id', data: data);
      return Service.fromJson(res.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw _wrap(e);
    }
  }

  Future<({String id, bool active})> toggleService(String id) async {
    try {
      final res = await _dio.patch('/services/$id/toggle', data: {});
      return (
        id: res.data['id'] as String,
        active: res.data['active'] as bool,
      );
    } on DioException catch (e) {
      throw _wrap(e);
    }
  }

  // ── Staff ─────────────────────────────────────────────────────

  Future<List<Staff>> getStaff() async {
    try {
      final res = await _dio.get('/staff');
      return (res.data as List)
          .map((e) => Staff.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw _wrap(e);
    }
  }

  Future<Staff> createStaff(Map<String, dynamic> data) async {
    try {
      final res = await _dio.post('/staff', data: data);
      return Staff.fromJson(res.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw _wrap(e);
    }
  }

  Future<Staff> updateStaff(String id, Map<String, dynamic> data) async {
    try {
      final res = await _dio.patch('/staff/$id', data: data);
      return Staff.fromJson(res.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw _wrap(e);
    }
  }

  Future<void> deleteStaff(String id) async {
    try {
      await _dio.delete('/staff/$id');
    } on DioException catch (e) {
      throw _wrap(e);
    }
  }

  // ── Appointments ──────────────────────────────────────────────

  Future<List<Appointment>> getAppointments({
    String? date,
    String? startDate,
    String? endDate,
    String? staffId,
    String? status,
  }) async {
    try {
      final res = await _dio.get(
        '/appointments',
        queryParameters: {
          if (date != null) 'date': date,
          if (startDate != null) 'startDate': startDate,
          if (endDate != null) 'endDate': endDate,
          if (staffId != null) 'staffId': staffId,
          if (status != null) 'status': status,
        },
      );
      return (res.data as List)
          .map((e) => Appointment.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw _wrap(e);
    }
  }

  Future<Appointment> getAppointment(String id) async {
    try {
      final res = await _dio.get('/appointments/$id');
      return Appointment.fromJson(res.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw _wrap(e);
    }
  }

  Future<Appointment> createAppointment(Map<String, dynamic> data) async {
    try {
      final res = await _dio.post('/appointments', data: data);
      return Appointment.fromJson(res.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw _wrap(e);
    }
  }

  Future<Appointment> updateAppointmentStatus(String id, String status) async {
    try {
      final res = await _dio.patch('/appointments/$id/status', data: {'status': status});
      return Appointment.fromJson(res.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw _wrap(e);
    }
  }

  Future<Appointment> confirmAppointmentPayment(String id) async {
    try {
      final res = await _dio.patch('/appointments/$id/payment', data: {});
      return Appointment.fromJson(res.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw _wrap(e);
    }
  }

  Future<Appointment> updateAppointmentNotes(String id, String notes) async {
    try {
      final res = await _dio.patch('/appointments/$id/notes', data: {'notes': notes});
      return Appointment.fromJson(res.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw _wrap(e);
    }
  }

  Future<List<Map<String, dynamic>>> getAvailability({
    required String serviceId,
    required String date,
    String? staffId,
  }) async {
    try {
      final res = await _dio.get(
        '/availability',
        queryParameters: {
          'serviceId': serviceId,
          'date': date,
          if (staffId != null) 'staffId': staffId,
        },
      );
      return (res.data as List).cast<Map<String, dynamic>>();
    } on DioException catch (e) {
      throw _wrap(e);
    }
  }

  // ── Blocked time (scheduling) ─────────────────────────────────

  Future<List<BlockedSlot>> getBlockedSlots({
    String? from,
    String? to,
    String? staffId,
  }) async {
    try {
      final res = await _dio.get(
        '/blocked-slots',
        queryParameters: {
          if (from != null) 'from': from,
          if (to != null) 'to': to,
          if (staffId != null) 'staffId': staffId,
        },
      );
      return (res.data as List)
          .map((e) => BlockedSlot.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw _wrap(e);
    }
  }

  Future<BlockedSlot> createBlockedSlot(Map<String, dynamic> data) async {
    try {
      final res = await _dio.post('/blocked-slots', data: data);
      return BlockedSlot.fromJson(res.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw _wrap(e);
    }
  }

  Future<void> deleteBlockedSlot(String id) async {
    try {
      await _dio.delete('/blocked-slots/$id');
    } on DioException catch (e) {
      throw _wrap(e);
    }
  }

  // ── Checkout Questions ────────────────────────────────────────

  Future<List<CheckoutQuestion>> getCheckoutQuestions() async {
    try {
      final res = await _dio.get('/checkout-questions');
      return (res.data as List)
          .map((e) => CheckoutQuestion.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw _wrap(e);
    }
  }

  Future<CheckoutQuestion> createCheckoutQuestion(
      String question, bool required, int order) async {
    try {
      final res = await _dio.post('/checkout-questions',
          data: {'question': question, 'required': required, 'order': order});
      return CheckoutQuestion.fromJson(res.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw _wrap(e);
    }
  }

  Future<CheckoutQuestion> updateCheckoutQuestion(
      String id, Map<String, dynamic> data) async {
    try {
      final res = await _dio.patch('/checkout-questions/$id', data: data);
      return CheckoutQuestion.fromJson(res.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw _wrap(e);
    }
  }

  Future<void> deleteCheckoutQuestion(String id) async {
    try {
      await _dio.delete('/checkout-questions/$id');
    } on DioException catch (e) {
      throw _wrap(e);
    }
  }

  // ── Projects ──────────────────────────────────────────────────

  Future<List<Project>> getProjects({String? status}) async {
    try {
      final res = await _dio.get(
        '/projects',
        queryParameters: {if (status != null) 'status': status},
      );
      return (res.data as List)
          .map((e) => Project.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw _wrap(e);
    }
  }

  Future<Project> getProject(String id) async {
    try {
      final res = await _dio.get('/projects/$id');
      return Project.fromJson(res.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw _wrap(e);
    }
  }

  Future<Project> createProject(Map<String, dynamic> data) async {
    try {
      final res = await _dio.post('/projects', data: data);
      return Project.fromJson(res.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw _wrap(e);
    }
  }

  Future<Project> updateProject(String id, Map<String, dynamic> data) async {
    try {
      final res = await _dio.patch('/projects/$id', data: data);
      return Project.fromJson(res.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw _wrap(e);
    }
  }

  Future<void> deleteProject(String id) async {
    try {
      await _dio.delete('/projects/$id');
    } on DioException catch (e) {
      throw _wrap(e);
    }
  }

  Future<Milestone> createMilestone(String projectId, Map<String, dynamic> data) async {
    try {
      final res = await _dio.post('/projects/$projectId/milestones', data: data);
      return Milestone.fromJson(res.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw _wrap(e);
    }
  }

  Future<Milestone> updateMilestone(
      String projectId, String milestoneId, Map<String, dynamic> data) async {
    try {
      final res = await _dio.patch('/projects/$projectId/milestones/$milestoneId', data: data);
      return Milestone.fromJson(res.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw _wrap(e);
    }
  }

  Future<void> deleteMilestone(String projectId, String milestoneId) async {
    try {
      await _dio.delete('/projects/$projectId/milestones/$milestoneId');
    } on DioException catch (e) {
      throw _wrap(e);
    }
  }

  Future<Invoice> createInvoice(String projectId, Map<String, dynamic> data) async {
    try {
      final res = await _dio.post('/projects/$projectId/invoices', data: data);
      return Invoice.fromJson(res.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw _wrap(e);
    }
  }

  Future<Invoice> markInvoicePaid(String projectId, String invoiceId) async {
    try {
      final res = await _dio.patch('/projects/$projectId/invoices/$invoiceId/paid', data: {});
      return Invoice.fromJson(res.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw _wrap(e);
    }
  }
}

final apiServiceProvider = Provider<ApiService>((ref) {
  return ApiService(ref.read(dioProvider));
});
