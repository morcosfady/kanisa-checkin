// Fake demo data only. No real people.
export const demoService = { nameAr: "القداس الإلهي", nameEn: "Divine Liturgy", start: "8:00 AM" };

export const demoMembers = [
  { id: "1", gender: "male", deacon: true, name: "Mina Demo", arabic: "مينا ديمو", family: "Demo", status: "active", consent: true },
  { id: "2", gender: "female", deacon: false, name: "Mariam Sample", arabic: "مريم سمبل", family: "Sample", status: "active", consent: true },
  { id: "3", gender: "male", deacon: false, name: "Bishoy Test", arabic: "بيشوي تست", family: "Test", status: "active", consent: false },
  { id: "4", gender: "female", deacon: false, name: "Verena Example", arabic: "فيرينا إكزامبل", family: "Example", status: "active", consent: true },
  { id: "5", gender: "male", deacon: false, name: "Kyrillos Fake", arabic: "كيرلس فيك", family: "Fake", status: "visitor", consent: false },
  { id: "6", gender: "female", deacon: false, name: "Marina Mock", arabic: "مارينا موك", family: "Mock", status: "active", consent: true },
];

export const demoArrivals = [
  { memberId: "1", time: "7:52 AM", late: 0 },
  { memberId: "2", time: "8:03 AM", late: 0 },
  { memberId: "4", time: "8:21 AM", late: 21 },
];
