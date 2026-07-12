const scheduleDaysStr = '["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]';
const scheduleTimeStr = "12:00";
const timezoneOffset = -330; // IST

function getNextScheduledDate(scheduleDaysStr, scheduleTimeStr, timezoneOffset) {
  const now = new Date();
  
  let days = JSON.parse(scheduleDaysStr || '[]');
  
  const timeStr = scheduleTimeStr || '12:00';
  const [hours, minutes] = timeStr.split(':').map(Number);

  const dayMap = {
    'SUN': 0, 'MON': 1, 'TUE': 2, 'WED': 3, 'THU': 4, 'FRI': 5, 'SAT': 6
  };
  const targetDayNumbers = days.map(d => dayMap[d.toUpperCase()]).filter(n => n !== undefined);

  const offsetMs = timezoneOffset !== undefined ? timezoneOffset * 60 * 1000 : now.getTimezoneOffset() * 60 * 1000;
  
  const userNow = new Date(now.getTime() - offsetMs);
  
  let candidateUser = new Date(userNow.getTime());
  candidateUser.setUTCHours(hours, minutes, 0, 0);

  if (candidateUser <= userNow) {
    candidateUser.setUTCDate(candidateUser.getUTCDate() + 1);
  }

  for (let i = 0; i < 8; i++) {
    const dayOfWeek = candidateUser.getUTCDay(); // 0-6
    if (targetDayNumbers.includes(dayOfWeek)) {
      return new Date(candidateUser.getTime() + offsetMs);
    }
    candidateUser.setUTCDate(candidateUser.getUTCDate() + 1);
  }

  return new Date(candidateUser.getTime() + offsetMs);
}

console.log("Now UTC:", new Date().toISOString());
console.log("Next UTC:", getNextScheduledDate(scheduleDaysStr, scheduleTimeStr, timezoneOffset).toISOString());
console.log("Next IST:", getNextScheduledDate(scheduleDaysStr, scheduleTimeStr, timezoneOffset).toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));

