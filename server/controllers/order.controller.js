import Order from "../models/Order.js";
import { notifyAdmins } from "../utils/notificationHelper.js";
import { generateOrderNumber } from "../utils/orderNumberGenerator.js";
import notificationService from "../services/notifications/NotificationService.js";

/**
 * Check if user is an Administrator
 */
export const isUserAdmin = (user) => {
  return Boolean(user && user.role === "Admin");
};

/**
 * Check if user is a Branch Manager
 * Strictly matches role "Branch Manager" or exact title "Branch Manager" / "Branch Manger" (never HR or other managers)
 */
export const isUserBranchManager = (user) => {
  if (!user) return false;
  if (user.role === "Branch Manager") return true;
  if (user.role !== "Admin" && /^\s*branch\s*man?ager\s*$/i.test(user.designation || "")) return true;
  return false;
};

/**
 * Check if user is a Normal Employee
 */
export const isUserNormalEmployee = (user) => {
  if (!user) return false;
  if (isUserAdmin(user) || isUserBranchManager(user)) return false;
  return true;
};


/**
 * Financial visibility: visible to ALL roles
 */
export const canViewFinancials = () => {
  return true;
};

/**
 * Sanitize order helper: retains all fields as financials are visible to all roles
 */
export const sanitizeOrderForUser = (order) => {
  if (!order) return order;
  return typeof order.toObject === "function" ? order.toObject() : order;
};

/**
 * @desc Create New Order (Main Office or Santoshpur Branch)
 * @route POST /api/v1/orders
 */
export const createOrder = async (req, res) => {
  try {
    // =====================================================
    // Role & Branch Resolution
    // - Admin: can choose target branch ("Main Office" or "Santoshpur Branch")
    // - Branch Manager: strictly derived and enforced from user account
    // - Employee: strictly derived and enforced from user account
    // =====================================================
    let branch;

    if (isUserAdmin(req.user)) {
      branch = req.body.branch ? req.body.branch.trim() : "Main Office";
    } else if (isUserBranchManager(req.user)) {
      if (!req.user.branch) {
        return res.status(403).json({
          success: false,
          message: "Access denied. No branch assigned to your Branch Manager account."
        });
      }
      if (req.body.branch && req.body.branch !== req.user.branch) {
        return res.status(403).json({
          success: false,
          message: "Branch Managers can only create orders for their assigned branch."
        });
      }
      branch = req.user.branch;
    } else if (isUserNormalEmployee(req.user)) {
      if (!req.user.branch) {
        return res.status(403).json({
          success: false,
          message: "Access denied. No branch assigned to your Employee account."
        });
      }
      if (req.body.branch && req.body.branch !== req.user.branch) {
        return res.status(403).json({
          success: false,
          message: "Employees can only create orders for their assigned branch."
        });
      }
      branch = req.user.branch;
    } else {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to create orders."
      });
    }

    const allowedBranches = ["Main Office", "Santoshpur Branch"];
    if (!allowedBranches.includes(branch)) {
      return res.status(400).json({
        success: false,
        message: "Invalid branch."
      });
    }

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
      orderDate,
      deliveryDeadline,
      revenueSplit
    } = req.body;

    // =====================================================
    // 4. REQUIRED FIELD VALIDATION
    // =====================================================

    if (
      !customerName ||
      !itemType ||
      totalPrice === undefined ||
      !deliveryDeadline
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Please provide customerName, itemType, totalPrice and deliveryDeadline."
      });
    }

    // =====================================================
    // 5. CLEAN STRING VALUES
    // =====================================================

    const cleanCustomerName = customerName.trim();
    const cleanContactNo = typeof contactNo === "string" ? contactNo.trim() : (contactNo ? String(contactNo).trim() : "");
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

    // Santoshpur Branch
    if (branch === "Santoshpur Branch") {
      if (
        revenueSplit &&
        revenueSplit.mainOfficeShare !== undefined &&
        revenueSplit.branchShare !== undefined
      ) {
        const mainOfficeShare = Number(revenueSplit.mainOfficeShare);
        const branchShare = Number(revenueSplit.branchShare);

        if (!Number.isFinite(mainOfficeShare) || !Number.isFinite(branchShare)) {
          return res.status(400).json({
            success: false,
            message: "Revenue split values must be valid numbers."
          });
        }

        if (mainOfficeShare < 0 || branchShare < 0) {
          return res.status(400).json({
            success: false,
            message: "Revenue split values cannot be negative."
          });
        }

        if (mainOfficeShare + branchShare !== total) {
          return res.status(400).json({
            success: false,
            message: `Revenue split (Main: ₹${mainOfficeShare} + Branch: ₹${branchShare} = ₹${mainOfficeShare + branchShare}) does not match Total Price (₹${total}).`
          });
        }

        split = {
          mainOfficeShare,
          branchShare
        };
      } else {
        const mainOfficeShare = Math.round(total * 0.7);
        const branchShare = total - mainOfficeShare;

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
    // 14b. ORDER / BOOKING DATE
    // =====================================================

    let bookingDate = new Date();
    if (orderDate) {
      const parsedDate = new Date(orderDate);
      if (!Number.isNaN(parsedDate.getTime())) {
        bookingDate = parsedDate;
      }
    }

    // =====================================================
    // 14c. GENERATE COLLISION-SAFE SEQUENTIAL ORDER NUMBER
    // =====================================================

    const orderNumber = await generateOrderNumber(branch);

    // =====================================================
    // 15. CREATE ORDER
    // =====================================================

    const newOrder = await Order.create({
      orderNumber,
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
      orderDate: bookingDate,
      deliveryDeadline: deadline,
      createdBy: req.user._id
    });

    // =====================================================
    // 16. NOTIFICATION (Production Multi-Channel Service)
    // =====================================================

    // Non-blocking fire-and-forget notification dispatch
    notificationService.notifyOrderCreated(newOrder).catch((notifErr) => {
      console.error("[OrderController] Failed to dispatch order creation notification:", notifErr);
    });

    // =====================================================
    // 17. SUCCESS RESPONSE
    // =====================================================

    return res.status(201).json({
      success: true,
      message: "Order created successfully.",
      order: newOrder
    });

  } catch (error) {
    if (error.code === 11000) {
      const existingOrder = await Order.findOne({
        createdBy: req.user._id,
        idempotencyKey: req.get("Idempotency-Key")?.trim()
      });

      if (existingOrder) {
        return res.status(200).json({
          success: true,
          message: "Order already created for this request.",
          order: existingOrder
        });
      }
    }

    if (error.name === "ValidationError") {
      const validationMessages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: "Order validation failed.",
        errors: validationMessages
      });
    }

    console.error("Create Order Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error."
    });
  }
};

/**
 * @desc Get All Orders with Filter, Search & Pagination
 * @route GET /api/v1/orders
 */
export const getAllOrders = async (req, res) => {
  try {
    const {
      branch,
      deliveryStatus,
      paymentStatus,
      search,
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const query = { isDeleted: { $ne: true } };

    // Role-based branch scoping:
    // Admin: can view all branches or filter by ?branch=
    // Branch Manager: strictly locked to assigned branch
    // Normal Employee: strictly locked to assigned branch
    if (isUserAdmin(req.user)) {
      if (branch) query.branch = branch;
    } else if (isUserBranchManager(req.user) || isUserNormalEmployee(req.user)) {
      query.branch = req.user.branch || "Main Office";
    } else {
      return res.status(403).json({ success: false, message: "Access denied." });
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

    // Sort: Newest created orders on top by default
    const sortOptions = {};
    if (sortBy === "orderDate") {
      sortOptions.orderDate = sortOrder === "asc" ? 1 : -1;
      sortOptions.createdAt = -1;
    } else if (sortBy === "orderNumber") {
      sortOptions.orderNumber = sortOrder === "asc" ? 1 : -1;
    } else {
      sortOptions.createdAt = sortOrder === "asc" ? 1 : -1;
      sortOptions._id = -1;
    }

    const [orders, totalRecords] = await Promise.all([
      Order.find(query)
        .populate("createdBy", "name email role")
        .sort(sortOptions)
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
 * @route PATCH /api/v1/orders/:id/status
 */
export const updateOrderStatus = async (req, res) => {
  try {
    const { deliveryStatus } = req.body;
    const allowedStatus = ["Pending", "In Progress", "Ready", "Delivered", "Cancelled"];

    if (!allowedStatus.includes(deliveryStatus)) {
      return res.status(400).json({ success: false, message: "Invalid delivery status." });
    }

    const order = await Order.findOne({ _id: req.params.id, isDeleted: { $ne: true } });

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found." });
    }

    // Role check:
    // Admin: can update any order across branches
    // Branch Manager: can update only orders for their assigned branch
    // Normal Employees: cannot update order status (403 Forbidden)
    if (isUserAdmin(req.user)) {
      // Allowed across all branches
    } else if (isUserBranchManager(req.user)) {
      if (order.branch !== req.user.branch) {
        return res.status(403).json({
          success: false,
          message: "Branch Managers can only update order status for their assigned branch."
        });
      }
    } else {
      return res.status(403).json({
        success: false,
        message: "Employees are not authorized to change order status."
      });
    }

    const previousStatus = order.deliveryStatus;
    order.deliveryStatus = deliveryStatus;
    await order.save();

    if (previousStatus !== deliveryStatus) {
      notificationService
        .notifyOrderStatusUpdated(order, previousStatus, deliveryStatus)
        .catch((notifErr) => {
          console.error(
            "[OrderController] Failed to dispatch status update notification:",
            notifErr
          );
        });
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
 * @desc Update Full Order Details
 * @route PUT /api/v1/orders/:id
 */
export const updateOrder = async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, isDeleted: { $ne: true } });

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found." });
    }

    // Role check:
    // Admin: can edit any order across branches, and can reassign branch
    // Branch Manager: can edit only orders for their assigned branch, cannot reassign branch
    // Normal Employees: cannot edit orders (403 Forbidden)
    const isAdmin = isUserAdmin(req.user);
    const isBranchManager = isUserBranchManager(req.user);

    if (!isAdmin && !isBranchManager) {
      return res.status(403).json({
        success: false,
        message: "Employees are not authorized to edit orders."
      });
    }

    if (isBranchManager && order.branch !== req.user.branch) {
      return res.status(403).json({
        success: false,
        message: "Branch Managers can only edit orders for their assigned branch."
      });
    }

    const previousDeliveryStatus = order.deliveryStatus;

    const {
      customerName,
      contactNo,
      itemType,
      description,
      quantity,
      totalPrice,
      advancePaid,
      orderDate,
      deliveryDeadline,
      deliveryStatus,
      branch,
      revenueSplit
    } = req.body;

    // Branch handling
    if (branch && branch !== order.branch) {
      if (!isAdmin) {
        return res.status(403).json({
          success: false,
          message: "Branch Managers cannot re-assign an order to a different branch."
        });
      }
      const allowedBranches = ["Main Office", "Santoshpur Branch"];
      if (!allowedBranches.includes(branch)) {
        return res.status(400).json({
          success: false,
          message: "Invalid branch."
        });
      }
      order.branch = branch;
    }

    if (revenueSplit) {
      order.revenueSplit = revenueSplit;
    }

    // Editable fields
    if (customerName !== undefined && customerName.trim()) {
      order.customerName = customerName.trim();
    }
    if (contactNo !== undefined) {
      order.contactNo = typeof contactNo === "string" ? contactNo.trim() : (contactNo ? String(contactNo).trim() : "");
    }
    if (itemType !== undefined && itemType.trim()) {
      order.itemType = itemType.trim();
    }
    if (description !== undefined) {
      order.description = description.trim();
    }
    if (quantity !== undefined) {
      const q = Number(quantity);
      if (Number.isInteger(q) && q >= 1) order.quantity = q;
    }
    if (totalPrice !== undefined) {
      const p = Number(totalPrice);
      if (Number.isFinite(p) && p >= 0) order.totalPrice = p;
    }
    if (advancePaid !== undefined) {
      const a = Number(advancePaid);
      if (Number.isFinite(a) && a >= 0) order.advancePaid = a;
    }
    if (order.advancePaid > order.totalPrice) {
      return res.status(400).json({
        success: false,
        message: "Advance paid cannot exceed total price."
      });
    }

    if (orderDate) {
      const d = new Date(orderDate);
      if (!Number.isNaN(d.getTime())) order.orderDate = d;
    }
    if (deliveryDeadline) {
      const dl = new Date(deliveryDeadline);
      if (!Number.isNaN(dl.getTime())) order.deliveryDeadline = dl;
    }
    if (deliveryStatus) {
      const allowedStatus = ["Pending", "In Progress", "Ready", "Delivered", "Cancelled"];
      if (allowedStatus.includes(deliveryStatus)) {
        order.deliveryStatus = deliveryStatus;
      }
    }

    // Recalculate pendingBalance & paymentStatus
    order.pendingBalance = Math.max(0, order.totalPrice - order.advancePaid);
    if (order.advancePaid >= order.totalPrice) {
      order.paymentStatus = "Paid";
    } else if (order.advancePaid > 0) {
      order.paymentStatus = "Partial";
    } else {
      order.paymentStatus = "Pending";
    }

    // Adjust default revenue split if branch changed or not set
    if (order.branch === "Main Office" && !revenueSplit) {
      order.revenueSplit = {
        mainOfficeShare: order.totalPrice,
        branchShare: 0
      };
    } else if (order.branch === "Santoshpur Branch" && !revenueSplit && (!order.revenueSplit || order.revenueSplit.branchShare === 0)) {
      const mainShare = Math.round(order.totalPrice * 0.7);
      order.revenueSplit = {
        mainOfficeShare: mainShare,
        branchShare: order.totalPrice - mainShare
      };
    }

    await order.save();

    if (previousDeliveryStatus && order.deliveryStatus !== previousDeliveryStatus) {
      notificationService
        .notifyOrderStatusUpdated(order, previousDeliveryStatus, order.deliveryStatus)
        .catch((notifErr) => {
          console.error(
            "[OrderController] Failed to dispatch status update notification:",
            notifErr
          );
        });
    }

    return res.status(200).json({
      success: true,
      message: "Order updated successfully.",
      order
    });
  } catch (error) {
    console.error("Update Order Error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error." });
  }
};

/**
 * @desc Soft-Delete Order (Preserve business audit records)
 * @route DELETE /api/v1/orders/:id
 */
export const deleteOrder = async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, isDeleted: { $ne: true } });

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found." });
    }

    const isAdmin = isUserAdmin(req.user);
    const isBranchManager = isUserBranchManager(req.user);

    if (!isAdmin && !isBranchManager) {
      return res.status(403).json({
        success: false,
        message: "Employees are not authorized to delete orders."
      });
    }

    if (isBranchManager && order.branch !== req.user.branch) {
      return res.status(403).json({
        success: false,
        message: "Branch Managers can only delete orders belonging to their assigned branch."
      });
    }

    // Permanent soft-delete to preserve business records
    order.isDeleted = true;
    order.deletedAt = new Date();
    order.deletedBy = req.user._id;
    await order.save();

    return res.status(200).json({
      success: true,
      message: `Order #${order.orderNumber} has been deleted successfully.`
    });
  } catch (error) {
    console.error("Delete Order Error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error." });
  }
};

/**
 * @desc Add Payment / Clear Pending Balance
 * @route PATCH /api/orders/:id/payment
 */
export const addPayment = async (req, res) => {
  try {
    const isAdmin = isUserAdmin(req.user);
    const isBranchManager = isUserBranchManager(req.user);

    if (!isAdmin && !isBranchManager) {
      return res.status(403).json({
        success: false,
        message: "Employees are not authorized to record payments."
      });
    }

    const { paymentAmount } = req.body;
    const amount = Number(paymentAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid payment amount."
      });
    }

    const order = await Order.findOne({ _id: req.params.id, isDeleted: { $ne: true } });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found."
      });
    }

    if (isBranchManager && order.branch !== req.user.branch) {
      return res.status(403).json({
        success: false,
        message: "Branch Managers can only record payments for their assigned branch orders."
      });
    }

    if (amount > order.pendingBalance) {
      return res.status(400).json({
        success: false,
        message: `Payment amount cannot exceed pending balance of ₹${order.pendingBalance}.`
      });
    }

    order.advancePaid += amount;
    order.pendingBalance = Math.max(0, order.totalPrice - order.advancePaid);

    if (order.pendingBalance === 0) {
      order.paymentStatus = "Paid";
    } else {
      order.paymentStatus = "Partial";
    }

    await order.save();

    notificationService
      .notifyPaymentReceived(order, amount)
      .catch((notifErr) => {
        console.error(
          "[OrderController] Failed to dispatch payment notification:",
          notifErr
        );
      });

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