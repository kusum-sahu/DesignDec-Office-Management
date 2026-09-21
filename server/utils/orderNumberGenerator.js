import Counter from "../models/Counter.js";
import Order from "../models/Order.js";

/**
 * Returns branch prefix:
 * - "Santoshpur Branch" -> "DDS"
 * - "Main Office" -> "DDB"
 */
export const getBranchPrefix = (branch) => {
  if (branch === "Santoshpur Branch") {
    return "DDS";
  }
  return "DDB";
};

/**
 * Ensures the counter in database is at least equal to the highest existing sequence in Order collection.
 */
export const syncCounterWithExistingOrders = async (prefix, force = false) => {
  const counterId = `order_${prefix}`;
  const regex = new RegExp(`^${prefix}-(\\d+)`);

  const existingOrders = await Order.find({ orderNumber: regex }, { orderNumber: 1 }).lean();

  let maxSeq = 0;
  for (const ord of existingOrders) {
    const match = ord.orderNumber?.match(regex);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (num > maxSeq) maxSeq = num;
    }
  }

  // Ensure Counter is synchronized
  const counter = await Counter.findById(counterId);
  if (!counter) {
    await Counter.create({ _id: counterId, seq: maxSeq });
  } else if (force || counter.seq < maxSeq) {
    await Counter.findByIdAndUpdate(counterId, { seq: maxSeq });
  }

  return maxSeq;
};

/**
 * Generate a collision-safe sequential order number for a branch.
 * Format: DDS-001, DDS-002, ... or DDB-001, DDB-002, ...
 */
export const generateOrderNumber = async (branch, session = null) => {
  const prefix = getBranchPrefix(branch);
  const counterId = `order_${prefix}`;

  // Make sure counter is synchronized with any existing orders
  await syncCounterWithExistingOrders(prefix);

  let attempts = 0;
  while (attempts < 10) {
    attempts++;

    // Atomic increment
    const updateOptions = { returnDocument: "after", upsert: true };
    if (session) {
      updateOptions.session = session;
    }

    const counter = await Counter.findByIdAndUpdate(
      counterId,
      { $inc: { seq: 1 } },
      updateOptions
    );

    const paddedSeq = String(counter.seq).padStart(3, "0");
    const candidateNumber = `${prefix}-${paddedSeq}`;

    // Verify no collision exists with ANY existing orders in MongoDB (including soft-deleted)
    const findQuery = Order.findOne({ orderNumber: candidateNumber });
    if (session) {
      findQuery.session(session);
    }
    const exists = await findQuery.lean();

    if (!exists) {
      return candidateNumber;
    }
    console.warn(`Order number collision detected for ${candidateNumber}, incrementing again...`);
  }

  throw new Error(`Failed to generate a unique order number for branch: ${branch}`);
};
