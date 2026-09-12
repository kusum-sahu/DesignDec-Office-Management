import Order from "../models/Order.js";
import { notifyAdmins } from "../utils/notificationHelper.js";

/**
 * @desc Create New Order (Main Office or Santoshpur Branch)
 * @route POST /api/orders
 */
export const createOrder = async (req, res) => {
  try {
    // =====================================================
    // 1. IDEMPOTENCY KEY
    // =====================================================

    const idempotencyKey = req.get("Idempotency-Key");

    if (!idempotencyKey || !idempotencyKey.trim()) {
      return res.status(400).json({
        success: false,
        message: "Idempotency-Key header is required."
      });
    }

    // =====================================================
    // 2. CHECK DUPLICATE REQUEST
    // =====================================================

    const existingOrder = await Order.findOne({
      createdBy: req.user._id,
      idempotencyKey: idempotencyKey.trim()
    });

    if (existingOrder) {
      return res.status(200).json({
        success: true,
        message: "Order already created for this request.",
        order: existingOrder
      });
    }

    // =====================================================
    // 3. GET REQUEST BODY
    // =====================================================

    const {
      customerName,
      contactNo,
      itemType,
      description,
      quantity = 1,
      totalPrice,
      advancePaid = 0,
      deliveryDeadline,
      branch = "Main Office",
      revenueSplit
    } = req.body;

    // =====================================================
    // 4. REQUIRED FIELD VALIDATION
    // =====================================================

    if (
      !customerName ||
      !contactNo ||
      !itemType ||
      totalPrice === undefined ||
      !deliveryDeadline
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Please provide customerName, contactNo, itemType, totalPrice and deliveryDeadline."
      });
    }

    // =====================================================
    // 5. CLEAN STRING VALUES
    // =====================================================

    const cleanCustomerName = customerName.trim();
    const cleanContactNo = contactNo.trim();
    const cleanItemType = itemType.trim();
    const cleanDescription = description?.trim() || "";

    // =====================================================
    // 6. BASIC STRING VALIDATION
    // =====================================================

    if (!cleanCustomerName) {
      return res.status(400).json({
        success: false,
        message: "Customer name cannot be empty."
      });
    }

    if (!cleanContactNo) {
      return res.status(400).json({
        success: false,
        message: "Contact number cannot be empty."
      });
    }

    if (!cleanItemType) {
      return res.status(400).json({
        success: false,
        message: "Item type cannot be empty."
      });
    }

    // =====================================================
    // 7. NUMBER CONVERSION
    // =====================================================

    const total = Number(totalPrice);
    const advance = Number(advancePaid);
    const qty = Number(quantity);

    // =====================================================
    // 8. TOTAL PRICE VALIDATION
    // =====================================================

    if (!Number.isFinite(total) || total < 0) {
      return res.status(400).json({
        success: false,
        message: "Total price must be a valid non-negative number."
      });
    }

    // =====================================================
    // 9. ADVANCE PAYMENT VALIDATION
    // =====================================================

    if (!Number.isFinite(advance) || advance < 0) {
      return res.status(400).json({
        success: false,
        message: "Advance payment must be a valid non-negative number."
      });
    }

    if (advance > total) {
      return res.status(400).json({
        success: false,
        message: "Advance payment cannot exceed total price."
      });
    }

    // =====================================================
    // 10. QUANTITY VALIDATION
    // =====================================================

    if (!Number.isInteger(qty) || qty < 1) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be at least 1."
      });
    }

    // =====================================================
    // 11. BRANCH VALIDATION
    // =====================================================

    const allowedBranches = [
      "Main Office",
      "Santoshpur Branch"
    ];

    if (!allowedBranches.includes(branch)) {
      return res.status(400).json({
        success: false,
        message: "Invalid branch."
      });
    }

    // =====================================================
    // 12. DELIVERY DEADLINE VALIDATION
    // =====================================================

    const deadline = new Date(deliveryDeadline);

    if (Number.isNaN(deadline.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid delivery deadline."
      });
    }

    // =====================================================
    // 13. REVENUE SPLIT
    // =====================================================

    let split = {
      mainOfficeShare: total,
      branchShare: 0
    };

    // -----------------------------------------------------
    // Santoshpur Branch
    // -----------------------------------------------------

    if (branch === "Santoshpur Branch") {
      if (
        revenueSplit &&
        revenueSplit.mainOfficeShare !== undefined &&
        revenueSplit.branchShare !== undefined
      ) {
        const mainOfficeShare = Number(
          revenueSplit.mainOfficeShare
        );

        const branchShare = Number(
          revenueSplit.branchShare
        );

        // Validate numbers
        if (
          !Number.isFinite(mainOfficeShare) ||
          !Number.isFinite(branchShare)
        ) {
          return res.status(400).json({
            success: false,
            message: "Revenue split values must be valid numbers."
          });
        }

        // Validate negative values
        if (
          mainOfficeShare < 0 ||
          branchShare < 0
        ) {
          return res.status(400).json({
            success: false,
            message: "Revenue split values cannot be negative."
          });
        }

        // Verify split total
        if (mainOfficeShare + branchShare !== total) {
          return res.status(400).json({
            success: false,
            message:
              `Revenue split (Main: ₹${mainOfficeShare} + Branch: ₹${branchShare} = ₹${mainOfficeShare + branchShare}) does not match Total Price (₹${total}).`
          });
        }

        split = {
          mainOfficeShare,
          branchShare
        };
      } else {
        // Default:
        // 70% Main Office
        // 30% Santoshpur Branch

        const mainOfficeShare = Math.round(total * 0.7);

        const branchShare =
          total - mainOfficeShare;

        split = {
          mainOfficeShare,
          branchShare
        };
      }
    }

    // =====================================================
    // 14. PENDING BALANCE
    // =====================================================

    const pendingBalance = total - advance;

    // =====================================================
    // 15. CREATE ORDER
    // =====================================================

    const newOrder = await Order.create({
      idempotencyKey: idempotencyKey.trim(),

      customerName: cleanCustomerName,

      contactNo: cleanContactNo,

      itemType: cleanItemType,

      description: cleanDescription,

      quantity: qty,

      totalPrice: total,

      advancePaid: advance,

      pendingBalance,

      branch,

      revenueSplit: split,

      deliveryDeadline: deadline,

      createdBy: req.user._id
    });

    // =====================================================
    // 16. NOTIFICATION
    // =====================================================

    if (branch === "Santoshpur Branch") {
      await notifyAdmins({
        title: "🔔 New Branch Order Booked!",

        message:
          `Santoshpur Branch booked order #${newOrder.orderNumber} ` +
          `for ${cleanCustomerName} (${cleanItemType}). ` +
          `Total: ₹${total}, Advance: ₹${advance}.`,

        type: "NEW_BRANCH_ORDER",

        orderId: newOrder._id
      });
    }

    // =====================================================
    // 17. SUCCESS RESPONSE
    // =====================================================

    return res.status(201).json({
      success: true,
      message: "Order created successfully.",
      order: newOrder
    });

  } catch (error) {

    // =====================================================
    // 18. DUPLICATE KEY / RACE CONDITION
    // =====================================================

    if (error.code === 11000) {

      const existingOrder = await Order.findOne({
        createdBy: req.user._id,
        idempotencyKey: req.get("Idempotency-Key")?.trim()
      });

      if (existingOrder) {
        return res.status(200).json({
          success: true,
          message:
            "Order already created for this request.",
          order: existingOrder
        });
      }
    }

    // =====================================================
    // 19. MONGOOSE VALIDATION ERROR
    // =====================================================

    if (error.name === "ValidationError") {

      const validationMessages = Object.values(
        error.errors
      ).map((err) => err.message);

      return res.status(400).json({
        success: false,
        message: "Order validation failed.",
        errors: validationMessages
      });
    }

    // =====================================================
    // 20. UNKNOWN SERVER ERROR
    // =====================================================

    console.error("Create Order Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error."
    });
  }
};

/**
 * @desc Get All Orders with Filter, Search & Pagination
 * @route GET /api/orders
 */
export const getAllOrders = async (req, res) => {
  try {
    const { branch, deliveryStatus, paymentStatus, search, page = 1, limit = 10 } = req.query;

    const query = {};

    // Role-based security: Agar branch staff hai toh sirf apni branch ka order dekhega
    if (req.user.role !== "Admin") {
      query.branch = req.user.branch || "Santoshpur Branch";
    } else if (branch) {
      query.branch = branch;
    }

    if (deliveryStatus) query.deliveryStatus = deliveryStatus;
    if (paymentStatus) query.paymentStatus = paymentStatus;

    if (search) {
      query.$or = [
        { orderNumber: { $regex: search, $options: "i" } },
        { customerName: { $regex: search, $options: "i" } },
        { contactNo: { $regex: search, $options: "i" } }
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [orders, totalRecords] = await Promise.all([
      Order.find(query)
        .populate("createdBy", "name email role")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Order.countDocuments(query)
    ]);

    return res.status(200).json({
      success: true,
      totalRecords,
      currentPage: Number(page),
      totalPages: Math.ceil(totalRecords / Number(limit)),
      orders
    });
  } catch (error) {
    console.error("Get Orders Error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error." });
  }
};

/**
 * @desc Update Delivery Status
 * @route PATCH /api/orders/:id/status
 */
export const updateOrderStatus = async (req, res) => {
  try {
    const { deliveryStatus } = req.body;
    const allowedStatus = ["Pending", "In Progress", "Ready", "Delivered", "Cancelled"];

    if (!allowedStatus.includes(deliveryStatus)) {
      return res.status(400).json({ success: false, message: "Invalid delivery status." });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { deliveryStatus },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found." });
    }

    return res.status(200).json({
      success: true,
      message: `Order status updated to ${deliveryStatus}.`,
      order
    });
  } catch (error) {
    console.error("Update Status Error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error." });
  }
};

/**
 * @desc Add Payment / Clear Pending Balance
 * @route PATCH /api/orders/:id/payment
 */
export const addPayment = async (req, res) => {
  try {
    // =====================================================
    // 1. GET PAYMENT AMOUNT
    // =====================================================

    const { paymentAmount } = req.body;

    const amount = Number(paymentAmount);

    // =====================================================
    // 2. BASIC PAYMENT VALIDATION
    // =====================================================

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid payment amount."
      });
    }

    // =====================================================
    // 3. FIND ORDER
    // =====================================================

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found."
      });
    }

    // =====================================================
    // 4. PREVENT OVERPAYMENT
    // =====================================================

    if (amount > order.pendingBalance) {
      return res.status(400).json({
        success: false,
        message:
          `Payment amount cannot exceed pending balance of ₹${order.pendingBalance}.`
      });
    }

    // =====================================================
    // 5. ADD PAYMENT
    // =====================================================

    order.advancePaid += amount;

    // =====================================================
    // 6. CALCULATE REMAINING BALANCE
    // =====================================================

    order.pendingBalance = Math.max(
      0,
      order.totalPrice - order.advancePaid
    );

    // =====================================================
    // 7. UPDATE PAYMENT STATUS
    // =====================================================

    if (order.pendingBalance === 0) {
      order.paymentStatus = "Paid";
    } else {
      order.paymentStatus = "Partial";
    }

    // =====================================================
    // 8. SAVE ORDER
    // =====================================================

    await order.save();

    // =====================================================
    // 9. SUCCESS RESPONSE
    // =====================================================

    return res.status(200).json({
      success: true,
      message: "Payment recorded successfully.",
      order
    });

  } catch (error) {
    console.error("Payment Update Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error."
    });
  }
};