export const DELIVERY_STATUS = {
  PENDING: "Pending",
  IN_PROGRESS: "In Progress",
  READY: "Ready",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

export const PAYMENT_STATUS = {
  PENDING: "Pending",
  PARTIAL: "Partial",
  PAID: "Paid",
};

export const ATTENDANCE_STATUS = {
  PRESENT: "Present",
  ABSENT: "Absent",
  LATE: "Late",
  HALF_DAY: "Half Day",
  LEAVE: "Leave",
  HOLIDAY: "Holiday",
  WEEKEND: "Weekend",
  WORK_FROM_HOME: "Work From Home",
};

export const ITEM_TYPES = [
  "Flex Banner",
  "Sticker",
  "Visiting Cards",
  "Letter Pad",
  "Lighting Board",
  "Aluminum Panel",
  "Invitaion Cards",
  "Glow Sign Board",
  "Leaflate",
  "Wedding Cards",
  "Name Board",
  "Video Graphy & Editing",
  "Photography",
  "Digital Calling Cards",
  "Digital Invitations",
  "Logo Design",
  "Social Media Posts",
  "Calendar",
  "Diary",
  "Banner Printing",
  "Brochure",
  "Photo Frame",
  "Abstract Art Frame",
  "Menu Card",
  "Bill Book",
  "ID Cards",
  "Customized Mug Printing",
  "Dress Printing",
  "Bags Printing",
  "2D/3D LED Letter Signage",
];

export const STATUS_BADGE_VARIANTS = {
  // Delivery
  [DELIVERY_STATUS.PENDING]: { variant: "warning", label: "Pending" },
  [DELIVERY_STATUS.IN_PROGRESS]: { variant: "brand", label: "In Progress" },
  [DELIVERY_STATUS.READY]: { variant: "info", label: "Ready" },
  [DELIVERY_STATUS.DELIVERED]: { variant: "success", label: "Delivered" },
  [DELIVERY_STATUS.CANCELLED]: { variant: "destructive", label: "Cancelled" },

  // Payment
  [PAYMENT_STATUS.PAID]: { variant: "success", label: "Paid" },
  [PAYMENT_STATUS.PARTIAL]: { variant: "warning", label: "Partial" },
  [PAYMENT_STATUS.PENDING]: { variant: "destructive", label: "Pending" },

  // Attendance
  [ATTENDANCE_STATUS.PRESENT]: { variant: "success", label: "Present" },
  [ATTENDANCE_STATUS.LATE]: { variant: "warning", label: "Late" },
  [ATTENDANCE_STATUS.HALF_DAY]: { variant: "secondary", label: "Half Day" },
  [ATTENDANCE_STATUS.ABSENT]: { variant: "destructive", label: "Absent" },
  [ATTENDANCE_STATUS.LEAVE]: { variant: "secondary", label: "Leave" },
  [ATTENDANCE_STATUS.WORK_FROM_HOME]: { variant: "info", label: "WFH" },
};
