export function timeToCSeconds(timeString: string) {
  const [hours, minutes, seconds, centi] = timeString.split(/[:\.]/).map(Number);
  return hours! * 360000 + minutes! * 6000 + seconds! * 100 + centi!;
}

export function cSecondsToTime(cseconds: number) {
  const i22dstr = (n: number) => (Math.floor(n)).toString().padStart(2, "0");
  const time_str = `${i22dstr((cseconds/360000))}:${i22dstr((cseconds/6000)%60)}:${i22dstr((cseconds/100)%60)}.${i22dstr(cseconds%100)}`;
  return time_str;
}