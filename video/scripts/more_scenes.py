"""Extra scenes that explain each feature in more detail. Imported by make_scenes.py."""

def mixp(f, w, part):
    return {"type": "mix", "parts": [{"type": "image", "file": f, "weight": w}, dict(part, weight=round(1 - w, 2))]}

def scr(mock, f, a, b):
    return {"type": "screen", "mockup": mock, "src": {"file": f, "from": a, "to": b}}

PAPER = {"type": "paper", "file": "report-page.png"}

# (insert after this id, scene)
EXTRA = [
 ("b2", ("b2b", "B", "Face setup", "Face setup, in under a minute", mixp("b2b-face-enroll.jpg", 0.55, scr("laptop", "members2", 28.8, 35.7)), None, [
   ("If you choose face check-in, the setup takes under a minute.", "إن اخترت تسجيل الحضور بالوجه، فالإعداد يستغرق أقل من دقيقة."),
   ("You look at the camera, then turn a little to the left, then to the right. Three short captures, and that's it.", "تنظر إلى الكاميرا، ثم تلتفت قليلًا يسارًا ثم يمينًا. ثلاث لقطات قصيرة وينتهي الأمر."),
   ("Amoinee keeps only a numeric template, never a photo, and if the picture is too dark or blurry, it simply asks you to try again.", "تحتفظ أمويني برقم تعريفي فقط ولا تحفظ صورة أبدًا، وإن كانت الصورة معتمة أو غير واضحة تطلب منك المحاولة مرة أخرى."),
   ("You can withdraw your consent any time, and the data is erased on the spot.", "ويمكنك سحب موافقتك في أي وقت، فتُمحى البيانات فورًا.")])),
 ("b3", ("b3b", "B", "Kiosk safety", "A kiosk for staff devices", scr("tablet", "kiosk-exit", 0.5, 12.8), None, [
   ("The kiosk is only for church devices, so an admin has to be signed in.", "جهاز الحضور مخصص لأجهزة الكنيسة فقط، لذلك يجب أن يكون مسؤول مسجّلًا الدخول."),
   ("To leave it, press and hold the logo for two seconds, then type the admin password, so no one wanders out of it by accident.", "للخروج منه اضغط مطولًا على الشعار ثانيتين ثم اكتب كلمة مرور المسؤول، فلا يخرج منه أحد بالخطأ.")])),
 ("c1", ("c1b", "C", "Check in by hand", "Check in by hand, one tap", mixp("c1b-welcome-desk.jpg", 0.4, scr("laptop", "today2", 4, 17)), None, [
   ("Someone forgot their phone? Under Not Here Yet, one tap checks them in by hand, and it's marked as added by an admin.", "نسي أحدهم هاتفه؟ تحت «لم يصل بعد» لمسة واحدة تسجّل حضوره يدويًا، ويُوسَم بأنه أضافه مسؤول."),
   ("You can also start a service yourself, choose the kind and the time, and end it when it's over. Everything is saved for the reports.", "ويمكنك أيضًا بدء خدمة بنفسك واختيار نوعها ووقتها وإنهاؤها عند انتهائها، ويُحفظ كل شيء للتقارير.")])),
 ("c3", ("c3b", "C", "Add and edit members", "Add a member in a minute", scr("laptop", "members2", 0.5, 26), None, [
   ("Adding a member takes about a minute: name, gender, birthday, phone, email, address, city and church.", "إضافة عضو تستغرق دقيقة تقريبًا: الاسم والنوع وتاريخ الميلاد والهاتف والبريد والعنوان والمدينة والكنيسة."),
   ("If they agree, add face consent, and parents can sign for their children under eighteen.", "وإن وافق يُضاف إقرار الوجه، ويستطيع الوالدان التوقيع عن أبنائهم دون الثامنة عشرة."),
   ("Open a profile for tabs on notes, attendance and consent, and make someone a deacon, or change their status, with one tap.", "افتح أي ملف لتجد تبويبات للملاحظات والحضور والموافقة، واجعل شخصًا شماسًا أو غيّر حالته بلمسة واحدة.")])),
 ("c6", ("c6b", "C", "Filters and views", "Filter anything. Light or dark.", scr("laptop", "attendance3", 4, 44), None, [
   ("Everything here can be filtered: any period, one kind of service, or one group, like the deacons or a family.", "كل شيء هنا يمكن تصفيته: أي فترة، أو نوع واحد من الخدمات، أو مجموعة واحدة مثل الشمامسة أو عائلة."),
   ("Each chart has a table view, and tapping a group like Absent shows exactly who is in it.", "ولكل رسم عرض جدولي، والضغط على مجموعة مثل «غائب» يُظهر بالضبط من فيها."),
   ("And one tap switches between the dark look and the parchment look.", "ولمسة واحدة تبدّل بين المظهر الداكن ومظهر الرق.")])),
 ("c7b", ("c7c", "C", "Your own labels", "Create your own labels", scr("laptop", "labels2", 3, 28), None, [
   ("You're not limited to our labels.", "لست مقيّدًا بعلاماتنا."),
   ("In Manage Labels, create your own, with a name in English and Arabic, an emoji, and a color.", "في «إدارة العلامات» أنشئ علامتك بالاسم بالإنجليزية والعربية ورمز وتعبيري ولون."),
   ("Tick this box for labels like Traveling or Sick, and Amoinee stops asking you to follow up while they are active.", "ضع علامة على هذا الخيار للعلامات مثل «مسافر» أو «مريض»، فتتوقف أمويني عن طلب المتابعة ما دامت فعّالة."),
   ("Reorder them or turn them off, and every change is kept in the history.", "رتّبها أو أوقفها، وكل تغيير يُحفظ في السجل.")])),
 ("c9", ("c9b", "C", "The one-page report", "The one-page report", mixp("c9b-report-desk.jpg", 0.4, PAPER), None, [
   ("Here is that one-page report. The church, the period, a plain summary, the big numbers, the charts, the top attenders, and the follow-up list.", "هذا هو التقرير من صفحة واحدة: الكنيسة والفترة وملخص بسيط والأرقام الكبيرة والرسوم وأعلى الحاضرين وقائمة المتابعة."),
   ("It's perfect for a meeting with the servants, or to keep in your archive. Choose the English or the Arabic version before you print.", "وهو مثالي لاجتماع مع الخدام أو للأرشيف. اختر النسخة الإنجليزية أو العربية قبل الطباعة.")])),
 ("c10", ("c10b", "C", "Admin requests", "Request access. Approve it.", mixp("c10b-approve.jpg", 0.4, scr("laptop", "approvals2", 0.5, 20.9)), None, [
   ("A priest or servant who wants access opens My Profile, chooses their church, and taps Request admin access.", "الكاهن أو الخادم الذي يريد صلاحية يفتح «ملفي» ويختار كنيسته ويضغط «طلب صلاحية مسؤول»."),
   ("The admin sees it under Approvals, with a red badge, and approves or declines it.", "يراه المسؤول تحت «الموافقات» مع شارة حمراء ويوافق عليه أو يرفضه."),
   ("You can also invite someone by email before they even have an account, and they become an admin the first time they sign up.", "ويمكنك أيضًا دعوة شخص بالبريد قبل أن يكون له حساب، فيصبح مسؤولًا عند أول تسجيل."),
   ("So there are three kinds of people: members, who need no approval; church admins, who manage one church; and one super admin, who can switch between all churches.", "فهناك ثلاثة أنواع: أعضاء لا يحتاجون موافقة، ومسؤولو كنائس يديرون كنيسة واحدة، ومسؤول أعلى واحد يتنقل بين كل الكنائس.")])),
 ("c10b", ("p", "C", "Privacy", "Trust comes first", {"type": "image", "file": "p-privacy.jpg"}, None, [
   ("Your people's trust matters most.", "ثقة شعبك هي الأهم."),
   ("Face data is only a number, never a photo, and only with consent. Notes and labels are visible to admins of that church alone, never to members, and never on the kiosk.", "بيانات الوجه رقم فقط وليست صورة، وبموافقة فقط. والملاحظات والعلامات يراها مسؤولو تلك الكنيسة وحدهم، ولا يراها الأعضاء ولا تظهر على جهاز الحضور."),
   ("Every change is logged, and each church only ever sees its own people.", "وكل تغيير يُسجَّل، وكل كنيسة ترى أولادها فقط.")])),
]
