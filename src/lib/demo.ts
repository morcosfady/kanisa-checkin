// Fake demo data only. No real people.
export type DemoMember = {
  id: string; name: string; gender: "male" | "female"; deacon: boolean; family: string;
  status: "active" | "inactive" | "visitor"; consent: boolean; face: "enrolled" | "pending" | "none";
  phone: string; className: string; lastDays: number; rate: number; streak: number;
};

export const demoService = { nameEn: "Divine Liturgy", start: "8:00 AM", date: "Sunday" };

export const demoMembers: DemoMember[] = [
  { id: "1", name: "Mina Demo", gender: "male", deacon: true, family: "Demo", status: "active", consent: true, face: "enrolled", phone: "(555) 0101-1037", className: "Youth", lastDays: 5, rate: 77, streak: 7 },
  { id: "2", name: "Mariam Sample", gender: "female", deacon: false, family: "Demo", status: "active", consent: true, face: "enrolled", phone: "(555) 0102-1074", className: "Adults", lastDays: 10, rate: 54, streak: 2 },
  { id: "3", name: "Bishoy Test", gender: "male", deacon: false, family: "Demo", status: "active", consent: false, face: "none", phone: "(555) 0103-1111", className: "Servants", lastDays: 15, rate: 91, streak: 9 },
  { id: "4", name: "Verena Example", gender: "female", deacon: false, family: "Sample", status: "active", consent: true, face: "enrolled", phone: "(555) 0104-1148", className: "Sunday School 1", lastDays: 20, rate: 68, streak: 4 },
  { id: "5", name: "Kyrillos Fake", gender: "male", deacon: true, family: "Sample", status: "visitor", consent: false, face: "none", phone: "(555) 0105-1185", className: "Youth", lastDays: 4, rate: 45, streak: 11 },
  { id: "6", name: "Marina Mock", gender: "female", deacon: false, family: "Sample", status: "active", consent: true, face: "enrolled", phone: "(555) 0106-1222", className: "Sunday School 3", lastDays: 9, rate: 82, streak: 6 },
  { id: "7", name: "Antonios Sample", gender: "male", deacon: true, family: "Test", status: "active", consent: true, face: "enrolled", phone: "(555) 0107-1259", className: "Youth", lastDays: 14, rate: 59, streak: 1 },
  { id: "8", name: "Sandra Demo", gender: "female", deacon: false, family: "Test", status: "active", consent: true, face: "enrolled", phone: "(555) 0108-1296", className: "Adults", lastDays: 19, rate: 96, streak: 8 },
  { id: "9", name: "Marcos Mock", gender: "male", deacon: false, family: "Test", status: "active", consent: false, face: "none", phone: "(555) 0109-1333", className: "Servants", lastDays: 3, rate: 73, streak: 3 },
  { id: "10", name: "Christina Test", gender: "female", deacon: false, family: "Example", status: "active", consent: true, face: "pending", phone: "(555) 0110-1370", className: "Sunday School 1", lastDays: 8, rate: 50, streak: 10 },
  { id: "11", name: "Youssef Example", gender: "male", deacon: false, family: "Example", status: "active", consent: true, face: "enrolled", phone: "(555) 0111-1407", className: "Youth", lastDays: 13, rate: 87, streak: 5 },
  { id: "12", name: "Nermeen Fake", gender: "female", deacon: false, family: "Example", status: "active", consent: true, face: "enrolled", phone: "(555) 0112-1444", className: "Sunday School 3", lastDays: 18, rate: 64, streak: 0 },
  { id: "13", name: "Pavly Demo", gender: "male", deacon: true, family: "Mock", status: "active", consent: true, face: "enrolled", phone: "(555) 0113-1481", className: "Youth", lastDays: 2, rate: 41, streak: 7 },
  { id: "14", name: "Hannah Sample", gender: "female", deacon: false, family: "Mock", status: "active", consent: false, face: "none", phone: "(555) 0114-1518", className: "Adults", lastDays: 7, rate: 78, streak: 2 },
  { id: "15", name: "Beshoy Sample", gender: "male", deacon: false, family: "Mock", status: "inactive", consent: true, face: "pending", phone: "(555) 0115-1555", className: "Servants", lastDays: 12, rate: 55, streak: 9 },
  { id: "16", name: "Mira Example", gender: "female", deacon: false, family: "Fake", status: "active", consent: true, face: "enrolled", phone: "(555) 0116-1592", className: "Sunday School 1", lastDays: 17, rate: 92, streak: 4 },
  { id: "17", name: "Samuel Test", gender: "male", deacon: true, family: "Fake", status: "active", consent: true, face: "enrolled", phone: "(555) 0117-1629", className: "Youth", lastDays: 1, rate: 69, streak: 11 },
  { id: "18", name: "Rita Mock", gender: "female", deacon: false, family: "Fake", status: "visitor", consent: false, face: "none", phone: "(555) 0118-1666", className: "Sunday School 3", lastDays: 6, rate: 46, streak: 6 },
  { id: "19", name: "Abanoub Fake", gender: "male", deacon: false, family: "Anba", status: "active", consent: true, face: "enrolled", phone: "(555) 0119-1703", className: "Youth", lastDays: 11, rate: 83, streak: 1 },
  { id: "20", name: "Sherry Demo", gender: "female", deacon: false, family: "Anba", status: "active", consent: true, face: "pending", phone: "(555) 0120-1740", className: "Adults", lastDays: 16, rate: 60, streak: 8 },
  { id: "21", name: "Mark Example", gender: "male", deacon: true, family: "Anba", status: "active", consent: true, face: "enrolled", phone: "(555) 0121-1777", className: "Servants", lastDays: 0, rate: 97, streak: 3 },
  { id: "22", name: "Monica Test", gender: "female", deacon: false, family: "Girgis", status: "inactive", consent: true, face: "enrolled", phone: "(555) 0122-1814", className: "Sunday School 1", lastDays: 5, rate: 74, streak: 10 },
  { id: "23", name: "Fady Mock", gender: "male", deacon: false, family: "Girgis", status: "active", consent: false, face: "none", phone: "(555) 0123-1851", className: "Youth", lastDays: 10, rate: 51, streak: 5 },
  { id: "24", name: "Irene Fake", gender: "female", deacon: false, family: "Girgis", status: "active", consent: false, face: "none", phone: "(555) 0124-1888", className: "Sunday School 3", lastDays: 15, rate: 88, streak: 0 },
];

export const demoArrivals = [
  { memberId: "1", time: "7:48 AM", method: "face" },
  { memberId: "3", time: "7:52 AM", method: "face" },
  { memberId: "2", time: "7:55 AM", method: "face" },
  { memberId: "5", time: "7:58 AM", method: "qr" },
  { memberId: "9", time: "8:01 AM", method: "face" },
  { memberId: "4", time: "8:03 AM", method: "face" },
  { memberId: "13", time: "8:05 AM", method: "manual" },
  { memberId: "7", time: "8:09 AM", method: "face" },
  { memberId: "17", time: "8:12 AM", method: "face" },
  { memberId: "8", time: "8:15 AM", method: "qr" },
  { memberId: "21", time: "8:21 AM", method: "face" },
  { memberId: "6", time: "8:26 AM", method: "face" },
];

export const toMinutes = (t: string) => {
  const [hm, ap] = t.split(" ");
  const [h, m] = hm.split(":").map(Number);
  return ((h % 12) + (ap === "PM" ? 12 : 0)) * 60 + m;
};
export const fmtTime = (min: number) => {
  const h = Math.floor(min / 60), m = min % 60;
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
};
