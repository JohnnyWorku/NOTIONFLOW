enum Tone { slate, blue, green, amber, red, violet }

const _months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const _weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

Tone statusTone(String? s) {
  if (s == null || s.isEmpty) return Tone.slate;
  if (RegExp('done|complete|finish|shipped', caseSensitive: false).hasMatch(s)) return Tone.green;
  if (RegExp('progress|doing|active|started|working', caseSensitive: false).hasMatch(s)) return Tone.blue;
  if (RegExp('block|hold|wait|paused|stuck', caseSensitive: false).hasMatch(s)) return Tone.amber;
  return Tone.slate;
}

Tone priorityTone(String? p) {
  if (p == null || p.isEmpty) return Tone.slate;
  if (RegExp('high|urgent|critical', caseSensitive: false).hasMatch(p)) return Tone.red;
  if (RegExp('med|normal', caseSensitive: false).hasMatch(p)) return Tone.amber;
  return Tone.slate;
}

String shortDate(String ymd) {
  final p = ymd.split('-');
  return '${_months[int.parse(p[1]) - 1]} ${int.parse(p[2])}';
}

String longDate(DateTime d) => '${_weekdays[d.weekday - 1]}, ${_months[d.month - 1]} ${d.day}';

String greeting([DateTime? now]) {
  final h = (now ?? DateTime.now()).hour;
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

class DueInfo {
  final String label;
  final bool overdue, today;
  const DueInfo(this.label, this.overdue, this.today);
}

String _ymd(DateTime d) => '${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

DueInfo formatDue(String due, {required bool done, DateTime? now}) {
  final day = due.substring(0, 10);
  final n = now ?? DateTime.now();
  final today = _ymd(n);
  final tomorrow = _ymd(DateTime(n.year, n.month, n.day + 1));
  final label = day == today ? 'Today' : day == tomorrow ? 'Tomorrow' : shortDate(day);
  return DueInfo(label, !done && day.compareTo(today) < 0, day == today);
}
