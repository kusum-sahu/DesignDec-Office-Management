const shiftTimings = {
  General: {
    startHour: 9,
    startMinute: 30,
    graceMinutes: 10,
  },

  Morning: {
    startHour: 8,
    startMinute: 0,
    graceMinutes: 10,
  },

  Evening: {
    startHour: 14,
    startMinute: 0,
    graceMinutes: 10,
  },

  Night: {
    startHour: 21,
    startMinute: 0,
    graceMinutes: 10,
  },
};

const getAttendanceStatus = (
  shift = "General",
  currentTime = new Date()
) => {
  const now = currentTime;

  const shiftTiming = shiftTimings[shift] || shiftTimings.General;

  const shiftStartTime = new Date(now);

  shiftStartTime.setHours(
    shiftTiming.startHour,
    shiftTiming.startMinute,
    0,
    0
  );
// Add Grace Time
shiftStartTime.setMinutes(
  shiftStartTime.getMinutes() + shiftTiming.graceMinutes
);
  if (now <= shiftStartTime) {
    return {
      attendanceStatus: "Present",
      isLate: false,
    };
  }

  return {
    attendanceStatus: "Late",
    isLate: true,
  };
};

export default getAttendanceStatus;