"""Builds scenes.json (the full feature walkthrough). Edit the words here, then run: python scripts/make_scenes.py"""
import json, pathlib

def img(f): return {"type": "image", "file": f}
def scr(mock, f, a, b): return {"type": "screen", "mockup": mock, "src": {"file": f, "from": a, "to": b}}
def mix(f, w, s): return {"type": "mix", "parts": [{"type": "image", "file": f, "weight": w}, dict(s, weight=round(1 - w, 2))]}

S = [
 ("a1", "A", "A Sunday morning", "Every Sunday, more families come", img("a1-church-sunday.jpg"), None, [
   ("Thank God, His people keep growing!", "الحمد لله، شعبه في ازدياد!"),
   ("Every Sunday, more families fill our churches, and more little feet come running through the doors.", "في كل يوم أحد تمتلئ كنائسنا بعائلات أكثر، وأقدام صغيرة تركض عبر الأبواب.")]),
 ("a2", "A", "The question", "Who came today? Who is missing?", img("a2-abouna-night.jpg"), None, [
   ("But here's the question every priest quietly asks.", "لكن هذا هو السؤال الذي يسأله كل كاهن في صمت."),
   ("Who came today? Who didn't? And who has been missing for weeks, without anyone noticing?", "من حضر اليوم؟ ومن لم يحضر؟ ومن غاب أسابيع دون أن ينتبه أحد؟"),
   ("Paper lists get lost. Names get forgotten. And the people who need a phone call the most are the easiest to miss.", "القوائم الورقية تضيع، والأسماء تُنسى، والذين يحتاجون إلى اتصال أكثر من غيرهم هم الأسهل في أن يفوتنا أمرهم.")]),
 ("a3", "A", "Amoinee", "ⲁⲙⲱⲓⲛⲓ · Come!", {"type": "logo"}, None, [
   ("That's why we built Amoinee.", "لهذا صنعنا أمويني."),
   ("It comes from the Coptic word for \"Come!\" It helps every church know its people, care for them, and never lose one of them.", "الاسم من الكلمة القبطية «تعال!». وهي تساعد كل كنيسة أن تعرف أولادها وترعاهم ولا تفقد واحدًا منهم."),
   ("So let's see how it works, step by step.", "فلنرَ كيف تعمل، خطوة بخطوة.")]),

 ("b1", "B", "Create your profile, once", "Create your profile. Once.", mix("b1-mother-phone.jpg", 0.3, scr("phone", "phone-signup", 0.5, 14)), None, [
   ("It all starts with the members.", "كل شيء يبدأ بالأعضاء."),
   ("Create your profile just once. Your name, your phone, your email, your address, and your church, which you simply start typing and pick from the list.", "أنشئ ملفك الشخصي مرة واحدة فقط: اسمك وهاتفك وبريدك وعنوانك وكنيستك، وتكتب أول حروفها فقط وتختارها من القائمة."),
   ("It takes a minute, and it works on any phone.", "يستغرق الأمر دقيقة، ويعمل على أي هاتف.")]),
 ("b2", "B", "Face check-in is your choice", "Face check-in: your choice", scr("phone", "phone-signup", 14, 25), None, [
   ("You also choose whether to turn on face check-in.", "وتختار أيضًا هل تريد تفعيل تسجيل الحضور بالوجه."),
   ("Say yes, sign the consent, and take a quick face setup. Say no, and that's perfectly fine, because there are other ways to check in.", "إن وافقت، توقّع الموافقة وتُجري إعدادًا سريعًا للوجه. وإن رفضت فلا مشكلة، فهناك طرق أخرى لتسجيل الحضور."),
   ("And you can always take it back: turn it off, and your face data is deleted.", "ويمكنك التراجع في أي وقت: أوقفه وتُحذف بيانات وجهك.")]),
 ("b3", "B", "The kiosk at the door", "The kiosk at the door", img("b3-kiosk-setup.jpg"), None, [
   ("At the church door stands the Amoinee kiosk, a tablet on a stand that an admin signs in.", "عند باب الكنيسة يقف جهاز أمويني، وهو جهاز لوحي على حامل يسجّل مسؤول الدخول عليه."),
   ("Before the service, it just shows what's coming next, with the camera switched off. When check-in opens, it wakes up all by itself.", "قبل الخدمة يعرض ما هو قادم فقط والكاميرا مغلقة. وعندما يُفتح تسجيل الحضور يستيقظ وحده.")]),
 ("b4", "B", "Just look at the screen", "Just look at the screen", mix("b4-family-kiosk.jpg", 0.35, scr("tablet", "kiosk", 1.2, 9)), None, [
   ("Now watch. Someone walks in, looks at the screen, and in a second it says, welcome, by name.", "شاهد الآن. يدخل شخص وينظر إلى الشاشة، وفي لحظة تقول له: أهلًا بك، باسمه."),
   ("It records that you're here. It even checks that it's a real face and not a photo.", "ويسجّل حضوره، بل ويتأكد أنه وجه حقيقي وليس صورة."),
   ("And it takes one person at a time, so everyone gets their moment.", "ويستقبل شخصًا واحدًا في كل مرة، فينال الجميع لحظته.")]),
 ("b5", "B", "Scan the QR code", "Scan the QR code", mix("b5-qr-phone.jpg", 0.4, scr("tablet", "kiosk", 9, 13.5)), None, [
   ("Prefer not to use your face? Just scan the QR code on the kiosk with your phone, and you're checked in.", "لا تفضّل استخدام وجهك؟ امسح رمز الاستجابة السريعة على الجهاز بهاتفك فيُسجَّل حضورك."),
   ("The code changes every minute, so it can't be passed around.", "الرمز يتغيّر كل دقيقة، فلا يمكن تداوله.")]),
 ("b6", "B", "Or type the code", "Or type the 3-digit code", mix("b6-teen-code.jpg", 0.4, scr("phone", "phone-checkin", 0.5, 10)), None, [
   ("Or type the three-digit code of the day in the app.", "أو اكتب الرمز المكوّن من ثلاثة أرقام لهذا اليوم في التطبيق."),
   ("Three simple ways to check in, and nobody is ever left at the door.", "ثلاث طرق بسيطة لتسجيل الحضور، ولا أحد يُترك عند الباب.")]),
 ("b7", "B", "My history", "My history, always there", scr("phone", "phone-checkin", 10, 22), None, [
   ("And members can open My History at any time, to see every service they attended, with the date and time.", "ويستطيع الأعضاء فتح «سجلّي» في أي وقت ليروا كل خدمة حضروها بتاريخها ووقتها.")]),

 ("c0", "C", "For Abouna and servants", "Attendance becomes care", img("c0-abouna-laptop.jpg"), None, [
   ("Now let's see what Abouna and the servants get.", "والآن لنرَ ما يحصل عليه أبونا والخدام."),
   ("This is where attendance turns into care.", "هنا يتحوّل الحضور إلى رعاية.")]),
 ("c1", "C", "Today, live", "Today, live", scr("laptop", "today", 0.5, 14.3), None, [
   ("The Today screen is live. As people arrive, their names pop up with the arrival time, whether they came by face, QR code or the daily code.", "شاشة «اليوم» مباشرة. فعند وصول الناس تظهر أسماؤهم مع وقت الوصول، سواء بالوجه أو بالرمز أو بالرمز اليومي."),
   ("You see who is on time and who is late, who is still missing, and you can check someone in by hand with one tap.", "ترى من جاء في موعده ومن تأخر ومن لم يصل بعد، ويمكنك تسجيل حضور أحدهم يدويًا بلمسة واحدة.")]),
 ("c2", "C", "Services open by themselves", "Services open by themselves", scr("laptop", "schedule", 0.5, 18), None, [
   ("Services open by themselves. Set your weekly events once, like the Divine Liturgy on Sunday morning, and check-in opens and closes on time.", "الخدمات تُفتح وحدها. اضبط أحداثك الأسبوعية مرة واحدة، مثل القداس الإلهي صباح الأحد، ويفتح التسجيل ويُغلق في موعده."),
   ("Each church has its own list of services, like Vespers, Bible Study, Sunday School, choir, youth, and family meetings. Add or remove your own, any time.", "ولكل كنيسة قائمة خدماتها: العشية ودراسة الكتاب وإعداد الخدام وكورال والشباب واجتماعات الأسر. أضف أو احذف ما تشاء في أي وقت.")]),
 ("c3", "C", "Members", "Every person, one place", scr("laptop", "members", 1.5, 21), None, [
   ("The Members page keeps every person in one place, numbered and easy to search by name, phone, city or church.", "صفحة الأعضاء تجمع كل شخص في مكان واحد، مرقّمين وسهلي البحث بالاسم أو الهاتف أو المدينة أو الكنيسة."),
   ("Filter by men, women, deacons, or visitors.", "ويمكنك التصفية: رجال، نساء، شمامسة، أو زوّار."),
   ("Open any profile to add a photo, make someone a deacon, call or text with one tap, see their family, and write private notes that only your church's admins can read.", "افتح أي ملف لتضيف صورة، أو تجعل شخصًا شماسًا، أو تتصل أو ترسل رسالة بلمسة، وترى عائلته، وتكتب ملاحظات خاصة لا يقرؤها إلا مسؤولو كنيستك.")]),
 ("c4", "C", "The Attendance Sheet", "The Attendance Sheet", scr("laptop", "attendance2", 3.8, 23.2), None, [
   ("And now, the heart of Amoinee: the Attendance Sheet.", "والآن قلب أمويني: صفحة الحضور."),
   ("At the top, a short summary in plain words. How many people came, the average per service, and how many need a follow-up.", "في الأعلى ملخص قصير بكلمات بسيطة: كم شخصًا حضر، ومتوسط كل خدمة، وكم شخصًا يحتاج متابعة."),
   ("Four big numbers show the average attendance, the attendance rate, how many attend every week, and how many need a call.", "وأربعة أرقام كبيرة تعرض متوسط الحضور ونسبته، وكم يحضرون كل أسبوع، وكم يحتاجون إلى اتصال.")]),
 ("c5", "C", "Charts", "Clear charts", scr("laptop", "attendance2", 23.3, 43.2), None, [
   ("Below, simple charts. Who came at least once. Attendance over time, compared with the period before.", "وتحتها رسوم بسيطة: من حضر مرة على الأقل، والحضور عبر الزمن مقارنةً بالفترة السابقة."),
   ("How many attend every week, how many come often, sometimes, or rarely. What time people arrive. And men, women and deacons at each service.", "كم يحضرون كل أسبوع، وكم يأتون كثيرًا أو أحيانًا أو نادرًا، ومتى يصل الناس، وعدد الرجال والنساء والشمامسة في كل خدمة."),
   ("Pick any period you like, or a single kind of service.", "اختر أي فترة تريدها، أو نوعًا واحدًا من الخدمات.")]),
 ("c6", "C", "The register and the list", "The register", scr("laptop", "attendance2", 43.3, 72.0), None, [
   ("Then the register. One little square for every person at every service, like the paper register of old, but alive.", "ثم السجلّ. مربع صغير لكل شخص في كل خدمة، مثل السجل الورقي القديم لكنه حيّ."),
   ("And the ranked list puts everyone in order, from the people who attend every single week, with a medal for the top three, to those who could use a gentle call.", "والقائمة المرتّبة تضع الجميع في ترتيبه، من الذين يحضرون كل أسبوع، مع ميدالية للثلاثة الأوائل، إلى الذين يحتاجون إلى اتصال لطيف."),
   ("You'll see streaks, the last visit, and how late they usually arrive. On a phone, a compact view shows one line per person.", "سترى تتابع الحضور وآخر زيارة ومتوسط التأخير. وعلى الهاتف يعرض العرض المختصر سطرًا واحدًا لكل شخص.")]),
 ("c7", "C", "Follow-up and labels", "Follow up, with care", mix("c7-servants-team.jpg", 0.25, scr("laptop", "labels", 4, 22)), None, [
   ("When someone misses a few Sundays, Amoinee gently marks them \"Follow up needed\", so nobody slips through the cracks.", "عندما يغيب شخص بضعة آحاد، تضع أمويني عليه بلطف علامة «يحتاج متابعة»، فلا يسقط أحد من بين الأيدي."),
   ("Then your servants can add labels: Called, Visited, Needs prayer, Traveling, Sick, Away at college.", "ويستطيع خدامك إضافة علامات: تم الاتصال، تمت الزيارة، يحتاج صلاة، مسافر، مريض، بعيد للدراسة."),
   ("They can snooze a reminder when it's not the right time, and everyone sees who is taking care of whom. You can even create your own labels.", "ويمكنهم تأجيل التذكير حين لا يكون الوقت مناسبًا، ويرى الجميع من يرعى من. بل يمكنك إنشاء علاماتك الخاصة.")]),
 ("c7b", "C", "Welcome back, new, birthdays", "Welcome back · New · Birthdays", mix("c7b-birthday.jpg", 0.4, scr("laptop", "labels", 22, 29.5)), None, [
   ("And when that person comes back, they show up under Welcome Back, so you can greet them warmly.", "وعندما يعود ذلك الشخص يظهر تحت «أهلًا بعودتك»، لتستقبله بحرارة."),
   ("You'll also see who is new, and whose birthday is this week, so every member feels remembered.", "وسترى أيضًا من هو جديد ومن عيد ميلاده هذا الأسبوع، فيشعر كل عضو بأنه مذكور.")]),
 ("c8", "C", "Encouragement", "Behind every name, a person", img("c8-abouna-call.jpg"), None, [
   ("Because behind every name is a person who may be waiting for a call.", "لأن وراء كل اسم إنسانًا قد ينتظر اتصالًا."),
   ("A word of encouragement, a visit, a prayer, can bring someone home.", "كلمة تشجيع أو زيارة أو صلاة قد تعيد إنسانًا إلى بيته.")]),
 ("c9", "C", "Reports", "One-page report · Excel", scr("laptop", "reports", 1.5, 12), None, [
   ("Need a report? With one tap, Abouna gets a one-page summary to print or save as a PDF, in English or in Arabic.", "تحتاج تقريرًا؟ بلمسة واحدة يحصل أبونا على ملخص من صفحة واحدة للطباعة أو الحفظ بصيغة PDF، بالإنجليزية أو العربية."),
   ("And the full data goes to Excel, with the register, the follow-up list, and the label history.", "والبيانات الكاملة تذهب إلى إكسل: السجلّ وقائمة المتابعة وتاريخ العلامات.")]),
 ("c10", "C", "Access and privacy", "Each church sees its own people", mix("c10-two-priests.jpg", 0.35, scr("laptop", "reports", 8, 17.8)), None, [
   ("Access is simple and safe. Anyone can ask to become an admin of their church, and an existing admin approves it.", "الصلاحيات بسيطة وآمنة. يستطيع أي شخص طلب أن يصبح مسؤولًا عن كنيسته، ويوافق عليه مسؤول حالي."),
   ("Each admin sees only their own church. The super admin can switch between churches.", "كل مسؤول يرى كنيسته فقط، ويستطيع المسؤول الأعلى التنقل بين الكنائس."),
   ("Notes and labels are never public, never on the kiosk, and every face is stored only with consent.", "الملاحظات والعلامات ليست علنية أبدًا ولا تظهر على جهاز الحضور، ولا يُحفظ أي وجه إلا بموافقة.")]),

 ("d", "D", "Every soul matters", "Every one of God's people, known and cared for.", {"type": "outro", "file": "d-welcome-back.jpg"}, None, [
   ("Because every soul matters, and no one should be forgotten.", "لأن كل نفس لها قيمة، ولا ينبغي أن يُنسى أحد."),
   ("Amoinee. Come, let us worship.", "أمويني. تعالوا نسجد.")]),
]

out = []
for sid, part, title, onscreen, visual, _x, sents in S:
    o = {"id": sid, "part": part, "title": title, "visual": visual, "onScreen": onscreen, "sentences": [{"en": e, "ar": a} for e, a in sents]}
    if sid == "c4": o["minDur"] = 0
    out.append(o)
pathlib.Path("scenes.json").write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf8")
words = sum(len(s["en"].split()) for o in out for s in o["sentences"])
print(len(out), "scenes,", words, "words")
