import apiClient from "./client";

export const orderApi = {
  /**
   * Get paginated orders list with search and branch filter
   */
  getOrders: (params) => apiClient.get("/orders", { params }),

  /**
   * Create a new order with Idempotency-Key
   */
  createOrder: (data, idempotencyKey) => {
    const key =
      idempotencyKey ||
      `ord-client-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    return apiClient.post("/orders", data, {
      headers: {
        "Idempotency-Key": key,
      },
    });
  },

  /**
   * Update order delivery status
   */
  updateStatus: (id, deliveryStatus) =>
    apiClient.patch(`/orders/${id}/status`, { deliveryStatus }),

  /**
   * Add payment / clear pending balance
   */
  addPayment: (id, paymentAmount) =>
    apiClient.patch(`/orders/${id}/payment`, { paymentAmount }),

  /**
   * Update full order details (PUT /api/v1/orders/:id)
   */
  updateOrder: (id, data) => apiClient.put(`/orders/${id}`, data),

  /**
   * Soft-delete order (DELETE /api/v1/orders/:id)
   */
  deleteOrder: (id) => apiClient.delete(`/orders/${id}`),
};

export default orderApi;
