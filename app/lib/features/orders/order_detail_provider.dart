import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_service.dart';
import '../../core/models/order.dart';
import 'orders_provider.dart';

class OrderDetailNotifier extends FamilyAsyncNotifier<Order, String> {
  @override
  Future<Order> build(String orderId) async {
    return ref.read(apiServiceProvider).getOrder(orderId);
  }

  Future<void> confirmPayment() async {
    final current = state.valueOrNull;
    if (current == null) return;

    final next = await AsyncValue.guard(
      () => ref.read(apiServiceProvider).confirmOrderPayment(arg),
    );
    // On failure: keep the order data visible and throw so the screen
    // can show a SnackBar instead of replacing the screen with an error.
    if (next is AsyncError) throw (next as AsyncError).error;
    state = next;
    ref.invalidate(ordersProvider);
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() => ref.read(apiServiceProvider).getOrder(arg));
  }

  Future<void> updateStatus(String status) async {
    final next = await AsyncValue.guard(
      () => ref.read(apiServiceProvider).updateOrderStatus(arg, status),
    );
    if (next is AsyncError) throw (next as AsyncError).error;
    state = next;
    ref.invalidate(ordersProvider);
  }
}

final orderDetailProvider =
    AsyncNotifierProvider.family<OrderDetailNotifier, Order, String>(
  OrderDetailNotifier.new,
);
