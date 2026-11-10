# gupaicon (กูไปคอน)

แผนที่และรายการคอนเสิร์ตอินดี้ / ไลฟ์เฮาส์ ในกรุงเทพฯ และรังสิต/ปทุมธานี (Bangkok & Rangsit Livehouse Map)
พร้อมระบบตรวจสอบและแสดงสถานะบัตรด่วนแบบเรียลไทม์, ระบบรายงานสถานะจากฝูงชน (Crowd-Reported Ticket Status), ระบบค้นหาคอนเสิร์ตอัตโนมัติด้วย AI พร้อมหน้าตรวจสอบโดยแอดมิน (AI Event Discovery & Admin Review), ระบบนำเข้าข้อมูล CSV (Admin CSV Import) และจัดการล้างข้อมูลตัวอย่าง (SAMPLE Data Cleanup)

พัฒนาด้วย **React**, **TypeScript**, **Vite**, **Express Server**, **Leaflet** (OpenStreetMap tiles with dark CSS filter), และ **Firebase** (Firestore + Google Authentication) รองรับแผนฟรี Spark Plan ไม่ต้องใช้ Cloud Functions

---

## ฟีเจอร์หลัก (Features)

### 1. แผนที่และหมุดร้านอัจฉริยะ (Interactive Map & Urgent Status Pins)
- **พิกัดศูนย์กลาง**: กรุงเทพฯ (`13.80, 100.55`) พร้อมตีกรอบขอบเขตพื้นที่เฉพาะกรุงเทพฯ และรังสิต/ปทุมธานี
- **สีของ Pin ตามความเร่งด่วนของงานที่กำลังจะมาถึง**:
  - 🔴 **สีแดง (`sold_out`)**: มีงานที่บัตรหมดแล้ว
  - 🟡 **สีเหลือง (`low`)**: มีงานที่บัตรเหลือน้อย
  - 🟢 **สีเขียว (`available`)**: ยังมีบัตร
  - ⚪ **สีเทา (`not_open` / `cancelled`)**: ไม่มีงานที่กำลังจะมาถึง หรือยังไม่เปิดขาย / ยกเลิก
- **ตัวเลขบนหมุด**: แสดงจำนวนงานที่กำลังจะมาถึงของร้านนั้น
- **ระบบจัดกลุ่มหมุด (Marker Clustering)** และ Accessibility ครบถ้วน (touch target ≥ 44px, contrast ratio ≥ 4.5:1)

### 2. หน้ารายละเอียดร้าน & งาน (Venue Sheet & Event Sheet)
- **Venue Bottom Sheet (3 ระดับ)** พร้อมรายการงานที่กำลังจะมาถึง เรียงตามวันเวลา (ซ่อนงานที่ผ่านไปแล้วอัตโนมัติ)
- **Event Detail Sheet & Crowd Reporting**:
  - แสดงชื่อวง/งาน, ศิลปิน, แนวเพลง, ราคาบัตร, และ **ผู้จัดงาน (Promoter)** พร้อมติ๊กถูกสีฟ้า (`✓`) กรณี verified
  - **ระบบรายงานสถานะจากผู้ใช้**: ปุ่ม "Sign in with Google" สำหรับผู้ใช้งานทั่วไปเพื่อให้รายงานสถานะได้ (Available / Low / Sold out)
  - **Displayed Status Logic**: คำนวณฝั่ง client ตามเงื่อนไขแอดมินหรือรายงานจากฝูงชนอย่างน้อย 3 คนใน 90 นาที
  - **AI Source Attribution**: เมื่อเป็นงานที่ได้มาจาก AI (`origin = "ai"`), จะแสดงลิงก์แหล่งที่มา *"Source: <domain>"* เพื่อให้ผู้ใช้ตรวจสอบได้
  - **แจ้งปัญหา (Report a Problem)**: ลิงก์ `mailto:` ไปยัง `wanthawatjx@gmail.com` พร้อมระบุชื่องานในหัวข้ออีเมลอัตโนมัติ

### 3. ระบบค้นหาคอนเสิร์ตอัตโนมัติด้วย AI และแอดมินรีวิว (AI Event Discovery & Review)
- **สถาปัตยกรรมความปลอดภัย (Server-Side AI)**:
  - คีย์ Gemini API (`GEMINI_API_KEY`) ถูกเก็บไว้เป็นเซิร์ฟเวอร์ซีเคร็ตฝั่ง backend เท่านั้น (`process.env.GEMINI_API_KEY`, จัดการโดย AI Studio / Cloud Run) **ไม่มีวันปรากฏในโค้ดฝั่ง client หรือเบราว์เซอร์**
  - เซิร์ฟเวอร์ Express (`/api/discover`) ตรวจสอบความถูกต้องของ Firebase ID Token ผ่าน Firebase Admin SDK และจำกัดสิทธิ์เฉพาะแอดมิน `wanthawatjx@gmail.com` ที่ยืนยันอีเมลแล้วเท่านั้น (`email_verified == true`)
  - จำกัดการรันทีละ 1 งาน (Mutex lock), จำกัดอัตราเรียกใช้งาน (Rate limiting 5 ครั้ง/นาที), และเรียก Gemini สูงสุดไม่เกิน 15 ครั้งต่อการรัน
- **Gemini Flash Model & Grounding**: ใช้โมเดล `gemini-3.8-flash` พร้อม Google Search Grounding และ URL Context เพื่อค้นหาคอนเสิร์ตอินดี้ในกรุงเทพฯ และปทุมธานีล่วงหน้า 90 วันตามเงื่อนไขที่กำหนด
- **Firestore Collections สำหรับ AI**:
  - `sources`: แหล่งข้อมูล (search query หรือ URL) สำหรับให้ AI ค้นหา
  - `eventDrafts`: ร่างข้อมูลคอนเสิร์ตที่ AI ดึงมาได้ พร้อมระบบคำนวณ Warnings และการตรวจจับรายการซ้ำ (Fingerprint)
- **Admin AI Review Console**:
  - ปุ่ม "Find Events Now" เรียกใช้งาน discovery API พร้อมแสดงผลจำนวนที่พบ
  - หน้าตรวจสอบร่างข้อมูล (Drafts) พร้อมป้ายระดับความมั่นใจ, Warning chips, และปุ่ม **Approve**, **Reject**, และ **Edit**
  - ปุ่ม **"Approve All Valid"** สำหรับอนุมัติร่างที่มีความมั่นใจ ≥ 0.8 และไม่มีคำเตือนในคลิกเดียว

### 4. ระบบนำเข้าข้อมูล CSV (Admin CSV Import)
แอดมินสามารถไปที่แท็บ **"Import"** ใน Admin Console เพื่อนำเข้าไฟล์ CSV (รองรับ UTF-8, UTF-8 BOM, ฟิลด์ที่มีคอมม่าและขึ้นบรรทัดใหม่ในเครื่องหมายคำพูด, สูงสุด 500 แถว):
- **Venues CSV Format & Validation**:
  - คอลัมน์: `name,lat,lng,address,igUrl,mapsUrl`
  - กฎการตรวจสอบ: ชื่อความยาว 2-100 ตัวอักษร, ที่อยู่ 2-250 ตัวอักษร, พิกัด Lat (13.40 ถึง 14.30) และ Lng (100.20 ถึง 100.95), `mapsUrl` จำเป็นต้องระบุและขึ้นต้นด้วย `https://`, ข้ามชื่อซ้ำ (case-insensitive)
  - ตัวอย่างแถว:
    ```csv
    name,lat,lng,address,igUrl,mapsUrl
    SAMPLE Livehouse Bangkok,13.7500,100.5000,123 Rama I Rd Pathum Wan Bangkok,https://instagram.com/samplelivehouse,https://maps.app.goo.gl/sample
    ```
- **Events CSV Format & Validation**:
  - คอลัมน์: `title,artists,venueName,promoterName,startAt,priceText,genres,ticketUrl,igPostUrl,status`
  - กฎการตรวจสอบ: ชื่อความยาว 1-120 ตัวอักษร, ศิลปินอย่างน้อย 1 คนแยกด้วย `|`, `venueName` ต้องตรงกับร้านในระบบ, `startAt` รูปแบบ `YYYY-MM-DD HH:mm` ตามเวลาประเทศไทย (Asia/Bangkok) และไม่เป็นอดีต, สถานะหนึ่งใน `available`, `low`, `sold_out`, `not_open`, `cancelled`, โปรโมเตอร์ optional (หากไม่พบระบบจะสร้างใหม่ให้อัตโนมัติโดย `verified = false`), ข้ามงานที่ซ้ำ
  - ตัวอย่างแถว:
    ```csv
    title,artists,venueName,promoterName,startAt,priceText,genres,ticketUrl,igPostUrl,status
    SAMPLE Indie Showcase,Band A|Band B,SAMPLE Livehouse Bangkok,SAMPLE Promoter,2026-12-31 20:00,350 THB,Indie Rock|Shoegaze,https://ticketmelon.com/sample,https://instagram.com/p/sample,available
    ```
- **Preview First, Write Second**: ระบบตรวจสอบความถูกต้องและแสดงผลแถวพร้อมสถานะ (OK / Duplicate / Error) ก่อนกดปุ่มยืนยันการเขียนลง Firestore แบบ Batched Write (สูงสุด 400 แถวต่อแบตช์)

### 5. ระบบล้างข้อมูลตัวอย่าง (SAMPLE Data Cleanup)
ในแท็บ Import หรือส่วนจัดการแอดมิน มีปุ่ม **"Delete all SAMPLE data"**:
- เมื่อคลิก จะต้องพิมพ์ยืนยันคำว่า `DELETE` ในหน้าต่างยืนยัน
- ระบบจะลบทิ้งทั้ง ร้าน (Venues), ผู้จัดงาน (Promoters), และงานคอนเสิร์ต (Events) ที่มีชื่อหรือชื่อเรื่องขึ้นต้นด้วยคำว่า `"SAMPLE"` (ไม่สนใจตัวพิมพ์เล็ก/ใหญ่) รวมถึงซับคอลเลกชัน `reports` ของงานเหล่านั้นทั้งหมดอย่างหมดจด

### 6. ระบบบันทึกลงปฏิทิน (Add to Calendar: .ics & Google Calendar)
- **ไฟล์ปฏิทินมาตรฐาน (.ics)**: สร้างและดาวน์โหลดไฟล์มาตรฐาน RFC 5545 ในเบราว์เซอร์ผ่าน Blob และ Temporary Object URL รองรับทั้ง iOS Safari, Android Chrome และ Desktop (CRLF line endings, line folding 75 octets, escaping, DTSTART/DTEND แปลงเป็น UTC จากเวลาเริ่ม + 3 ชั่วโมง, แจ้งเตือนล่วงหน้า 1 วันด้วย `VALARM`) พร้อมลิงก์สำรอง "Open calendar file" หากเบราว์เซอร์บล็อกการดาวน์โหลด
- **Google Calendar Template URL**: ปุ่มบันทึกลง Google Calendar โดยตรงผ่านเทมเพลต URL ระบุชื่องาน วันเวลา พิกัด/ที่อยู่ร้าน และรายละเอียดศิลปินครบถ้วน
- **ระบบป้องกันงานในอดีต (Past Events)**: ปิดการทำงานของปุ่มอัตโนมัติพร้อมข้อความระบุเมื่อคอนเสิร์ตผ่านไปแล้ว

### 7. ระบบโปรไฟล์คอมมูนิตี้และบอร์ดหาเพื่อนไปคอน (Community Profiles & Concert Buddy Board)
- **โปรไฟล์ผู้ใช้แบบไร้ข้อมูลส่วนบุคคล (Zero-PII Community Profile)**:
  - รองรับการเข้าสู่ระบบด้วย Google โดย**ไม่มีการเก็บหรือเปิดเผยอีเมลและรูปโปรไฟล์จริง**
  - แสดงผลด้วยชื่อที่กำหนดเอง (`displayName` 2-24 ตัวอักษร ไม่อนุญาต URL หรือเครื่องหมาย `@`) คู่กับแท็กตัวเลข 4 หลักสุ่มครั้งเดียว (`Name#1234`)
  - เลือกอีโมจิประจำตัว (`avatarEmoji`) จากรายการที่กำหนด, คำแนะนำตัวย่อ (`bio` ไม่เกิน 140 ตัวอักษร), แนวเพลงที่ชอบ (`favoriteGenres` สูงสุด 5 แนว)
  - กล่องยืนยันอายุจำเป็น: *"I am 18 or older, or I have my parent's consent"* (สองภาษา TH/EN)
  - หน้าจัดการโปรไฟล์ส่วนตัว `#/me` พร้อมปุ่มลบบัญชีและโพสต์ทั้งหมด (Self-service deletion) พร้อมกล่องยืนยัน
- **บอร์ดหาเพื่อนไปคอนเสิร์ต (Concert Buddy Board - `#/buddies`)**:
  - รายการ 30 โพสต์เปิดล่าสุดจากทุกคอนเสิร์ต กรองตามประเภทได้:
    - 🤝 **หาเพื่อนไปคอน (`looking_for_buddy`)**
    - 🎫 **มีบัตรเกิน / หาคนหาร (`have_extra_ticket`)**
    - 🙋 **หาบัตรคอน (`need_ticket`)**
  - แสดงชื่องาน วันที่ และพิกัดร้านที่จัดงานอย่างชัดเจน
- **กล่องไปด้วยกันไหมในหน้ารายละเอียดงาน (Event Detail Sheet Integration)**:
  - แสดง 10 โพสต์เปิดล่าสุดสำหรับคอนเสิร์ตนั้นโดยเฉพาะ
  - ปุ่มโพสต์หาเพื่อนสำหรับผู้ใช้ที่ล็อกอินแล้ว (จำกัด 1 โพสต์ต่อคนต่องาน โดยใช้ Document ID รูปแบบ `{eventId}_{authorUid}`)
- **ระบบความปลอดภัยและการกลั่นกรอง (Safety, Report & Moderation)**:
  - **เนื้อหาเป็นข้อความล้วน (Plain Text Only)**: ป้องกัน HTML injection, ปิดการทำ clickable links และไม่อนุญาตการอัปโหลดรูปภาพ
  - **คำเตือนความปลอดภัย (Safety Notice)**: เน้นย้ำให้นัดเจอกันในที่สาธารณะ ไม่เปิดเผยข้อมูลส่วนบุคคลหรือเบอร์โทรศัพท์ และรายงานผู้ใช้ที่น่าสงสัย
  - **การรายงานเนื้อหา (Content Report)**: ปุ่มแจ้งรายงานโพสต์หรือคอมเมนต์พร้อมเหตุผล (`spam`, `harassment`, `inappropriate`, `scam`, `other`) บันทึกลง `/contentReports/{reportId}`
  - **การบล็อกผู้ใช้ (Block User)**: ซ่อนโพสต์และคอมเมนต์ของผู้ใช้ที่ถูกบล็อกทันที บันทึกลง `/profiles/{myUid}/blocks/{otherUid}`
  - **Admin Moderation & Ban**: แอดมิน (`wanthawatjx@gmail.com`) มีแท็บ Moderation ใน Admin Console เพื่อตรวจสอบคำร้อง ลบเนื้อหา หรือระงับบัญชี (`bans/{uid}`) ซึ่งจะถูกปฏิเสธการสร้างหรือแก้ไขเนื้อหาใดๆ ใน Firestore Security Rules ทันที
- **ประสิทธิภาพและการประหยัดโควตา (Low Read Quota)**:
  - ใช้ One-time queries พร้อมจำกัดจำนวน (`limit`) และปุ่มกดรีเฟรช ไม่เปิดใช้งาน Realtime listeners ตลอดเวลา

### 8. ระบบข้อความส่วนตัวและการสนทนาแบบยินยอม (Private Messages / DM with Consent & Safety)
- **กระบวนการขอเริ่มสนทนา (Chat Request & Consent Flow)**:
  - ปุ่ม **"ส่งข้อความ" (Message)** ปรากฏบนการ์ดโพสต์หาเพื่อนและโปรไฟล์ เฉพาะผู้ใช้ที่เข้าสู่ระบบ มีโปรไฟล์ และยืนยันอายุแล้วเท่านั้น (`ageConfirmed == true`)
  - **รูปแบบ Chat ID**: สร้างจากการเรียง UID ของสมาชิกทั้งสองคนตามตัวอักษรแล้วเชื่อมด้วย `_` (`[uidA, uidB].sort().join('_')`) ป้องกันการสร้างห้องแชทซ้ำซ้อน
  - **จำกัดข้อความเปิดกล่อง**: ขณะสถานะเป็น `"pending"` ผู้ริเริ่ม (Initiator) สามารถส่งข้อความเปิดได้เพียง **1 ข้อความเท่านั้น** (บังคับใน Security Rules ให้ Message Document ID เป็น `"first"`)
  - **กล่องคำขอ (Requests Inbox)**: ผู้รับจะเห็นคำขอพร้อมปุ่ม **ยอมรับ (Accept)**, **ปฏิเสธ (Decline)** และ **บล็อกและรายงาน (Block & report)**
  - เมื่อกดยอมรับ สถานะจะเปลี่ยนเป็น `"accepted"` (ทำได้เฉพาะผู้รับ) จากนั้นทั้งสองฝ่ายจึงจะสามารถสนทนากันได้อย่างอิสระ แชทที่ถูกปฏิเสธหรือบล็อกจะไม่สามารถส่งข้อความใหม่ได้
- **ข้อความและการแสดงผล (Messages & Plain Text Guarantee)**:
  - ข้อความถูกจำกัดความยาว 1–1,000 ตัวอักษร เป็นข้อความธรรมดา (Plain text) เท่านั้น ป้องกัน HTML injection และแสดงผล URL เป็นข้อความธรรมดาโดยไม่แปลงเป็นลิงก์คลิกได้อัตโนมัติ เพื่อป้องกัน Phishing และ Scams
  - ผู้ส่งสามารถลบข้อความของตนเองได้
- **คำชี้แจงความเป็นส่วนตัวที่ตรงไปตรงมา (Honest Privacy Disclosure)**:
  - ข้อความส่วนตัวถูกจัดเก็บไว้ในฐานข้อมูล Firestore ของโปรเจกต์ และ**ไม่ได้เข้ารหัสจากต้นทางถึงปลายทาง (Not End-to-End Encrypted)**
  - ผู้ดูแลระบบ/เจ้าของโปรเจกต์สามารถเข้าถึงคอนโซลฐานข้อมูลของ Firebase ได้ในทางเทคนิค แต่ระบบไม่มีหน้าแสดงรายการแชทส่วนตัวของผู้ใช้ และจะตรวจสอบเฉพาะเมื่อมีผู้ใช้งานรายงานข้อความที่ไม่เหมาะสมเท่านั้น
  - ผู้ใช้งานสามารถลบข้อความของตนเอง ซ่อนแชทจากมุมมองของตน ("Delete chat for me") หรือลบโปรไฟล์และโพสต์ทิ้งทั้งหมดได้ตลอดเวลา
- **ระบบความปลอดภัยและการรายงาน (Safety & Abuse Reporting)**:
  - ป้ายแจ้งเตือนความปลอดภัยในทุกห้องแชท: *"Be careful with personal info. Report abuse."* (TH/EN)
  - ปุ่มรายงานข้อความ (Report) จะคัดลอกข้อความ 10 ข้อความล่าสุดที่ผู้รายงานมองเห็นลงใน `/contentReports/{reportId}` เพื่อให้ผู้ดูแลระบบตรวจสอบหลักฐานได้ โดยที่แอดมินไม่ต้องเปิดอ่านแชทส่วนตัวของผู้ใช้อื่น
  - การบล็อกผู้ใช้จะบันทึกลง `/profiles/{myUid}/blocks/{otherUid}` และซ่อนแชททันที
- **การประหยัดโควตาการอ่าน Firestore (Low Read Cost Architecture)**:
  - **ไม่มี Listener ในหน้ารายการแชท**: ดึงข้อมูลแชท 20 รายการล่าสุดแบบ One-time query เท่านั้น
  - **Realtime Listener เฉพาะห้องแชทที่กำลังเปิดใช้งาน**: จำกัดข้อความล่าสุด 50 ข้อความ (`limit(50)`) และยกเลิก Subscription ทันทีที่ปิดห้องแชท
  - บันทึกสถานะการอ่านแยกรายบุคคลใน `/chats/{chatId}/reads/{uid}` สำหรับจุดแจ้งเตือนข้อความใหม่ (Unread dot)
  - ระบุและบันทึก Read Cost ของทุก `get()` และ `exists()` ไว้อย่างชัดเจนใน `firestore.rules`

---

## ความปลอดภัยของเซิร์ฟเวอร์ (Server Security)

1. **การตรวจสอบสิทธิ์ผู้ดูแลระบบ (Admin Authentication)**:
   - เซิร์ฟเวอร์ตรวจสอบ Firebase ID Token ของผู้เรียกใช้งานผ่าน Firebase Admin SDK
   - ตรวจสอบว่า `email_verified === true` และ `email === 'wanthawatjx@gmail.com'`
   - คำขอที่ไม่ผ่านการตรวจสอบจะถูกปฏิเสธด้วย HTTP 401 หรือ 403 ทันที
2. **การป้องกันและจำกัดการใช้งาน (Rate Limiting & Security Headers)**:
   - จำกัด 30 คำขอต่อนาทีต่อ IP สำหรับ `/api/*` ทั่วไป และ 5 คำขอต่อนาทีสำหรับ `/api/discover`
   - บังคับใช้ Same-Origin CORS ป้องกันการเรียกใช้ข้ามโดเมน
   - ตั้งค่า Security Headers มาตรฐาน (`X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin`)
3. **Healthcheck Endpoint**:
   - `GET /healthz` ให้บริการสำหรับระบบตรวจสอบสถานะตู้คอนเทนเนอร์ (Cloud Run) คืนค่า HTTP 200

---

## โครงสร้างข้อมูล Firestore (Data Model)

1. `/venues/{venueId}`: ข้อมูลร้าน (name, lat, lng, address, igUrl, mapsUrl)
2. `/promoters/{promoterId}`: ข้อมูลผู้จัดงาน (name, igUrl, verified)
3. `/events/{eventId}`: ข้อมูลคอนเสิร์ต (title, artists, venueId, promoterId, startAt, priceText, genres, ticketUrl, status, statusSource, origin, sourceUrl)
4. `/events/{eventId}/reports/{uid}`: รายงานสถานะจากผู้ใช้
5. `/sources/{sourceId}`: แหล่งข้อมูลสำหรับการค้นหาของ AI (name, type, value, active)
6. `/eventDrafts/{draftId}`: ร่างคอนเสิร์ตจาก AI รอแอดมินตรวจสอบ
7. `/profiles/{uid}`: โปรไฟล์ผู้ใช้คอมมูนิตี้ (displayName, tag, avatarEmoji, bio, favoriteGenres, ageConfirmed, createdAt, updatedAt)
8. `/profiles/{uid}/blocks/{otherUid}`: รายการบล็อกผู้ใช้ (บล็อกแบบส่วนตัว)
9. `/buddyPosts/{postId}`: โพสต์หาเพื่อนไปคอนเสิร์ต (postId = `{eventId}_{authorUid}`, authorUid, authorName, avatarEmoji, kind, body, meetUpNote, status, createdAt, updatedAt)
10. `/buddyPosts/{postId}/comments/{commentId}`: คอมเมนต์ใต้โพสต์หาเพื่อน (authorUid, authorName, body, createdAt)
11. `/contentReports/{reportId}`: รายงานเนื้อหาไม่เหมาะสม (reporterUid, targetType, targetPath, chatId, excerpt, reason, createdAt)
12. `/bans/{uid}`: บัญชีที่ถูกระงับสิทธิ์การใช้งาน (reason, bannedAt, bannedBy)
13. `/chats/{chatId}`: ห้องแชทข้อความส่วนตัว (members, initiator, status, createdAt, lastMessageAt, lastMessagePreview, names, hiddenBy, updatedAt)
14. `/chats/{chatId}/messages/{messageId}`: ข้อความในการสนทนา (senderUid, text, createdAt)
15. `/chats/{chatId}/reads/{uid}`: เวลาที่ผู้ใช้อ่านข้อความล่าสุด (lastReadAt)

---

## การเผยแพร่และติดตั้งใช้งาน (Deployment)

1. **เผยแพร่ผ่าน Google AI Studio**:
   - กดปุ่ม **Publish** ใน Google AI Studio เพื่อสร้างและรันแอปพลิเคชันบน Cloud Run (Starter Tier)
   - สคริปต์ `build` จะคอมไพล์ไคลเอนต์ด้วย Vite และ `start` จะรันเซิร์ฟเวอร์ Express ในโหมด production เพื่อให้บริการทั้ง API และไฟล์ static
2. **ตั้งค่า Authorized Domains ใน Firebase Authentication**:
   - เมื่อได้ URL ของแอปพลิเคชันที่เผยแพร่แล้ว (เช่น `https://your-app-domain.run.app`)
   - ให้เปิด Firebase Console > **Authentication** > **Settings** > **Authorized domains**
   - เพิ่มโดเมนของแอปพลิเคชันลงในรายการ เพื่อให้ระบบล็อกอิน Google Sign-In ทำงานได้อย่างสมบูรณ์

---

## การตั้งค่าความปลอดภัยและคีย์ในเครื่อง (Security & Environment Setup)

> ⚠️ **คำเตือนด้านความปลอดภัยสำหรับ Public Repository**:
> **ห้าม Commit หรือ Push ไฟล์ `.env` ที่มีคีย์จริงขึ้นบน GitHub เด็ดขาด!** 
> โปรเจกต์นี้มีกฎ `.gitignore` ที่ครอบคลุมไฟล์ `.env*`, ซีเคร็ต, และไฟล์ใบรับรองต่างๆ ไว้แล้ว และไม่มีการบันทึกหรือพิมพ์คีย์ใดๆ ลงใน Log

### 1. การสร้างไฟล์ `.env` สำหรับ Local Development
คัดลอกไฟล์เทมเพลต `.env.example` ไปเป็น `.env`:
```bash
cp .env.example .env
```

### 2. การกำหนดค่าคีย์ Gemini API (Server-Side)
โมดูล `geminiClient.js` ทำงานบนเซิร์ฟเวอร์เท่านั้น พร้อมระบบตรวจจับ Rate Limit (HTTP 429):
```bash
GEMINI_API_KEY="AIzaSyYourGeminiApiKeyHere"
```

- **ความปลอดภัย**: ตัวแปรคีย์จะทำงานเฉพาะฝั่งเซิร์ฟเวอร์ Express เท่านั้น และจะไม่มีวันถูกส่งต่อไปยังเบราว์เซอร์หรือพิมพ์ลงใน Log
- **การจัดการ Rate Limit (429)**: หากเกินโควตา ระบบจะตอบกลับด้วยข้อความแจ้งเตือนที่เข้าใจง่ายทั้งภาษาไทยและอังกฤษ พร้อมส่ง HTTP Status 429


---

## การรันโปรเจกต์ในเครื่อง (Local Development)

```bash
# ติดตั้ง dependencies
npm install

# รันโหมด dev (รันทั้ง Express server และ Vite middleware)
npm run dev

# บิลด์สำหรับ production
npm run build

# รันในโหมด production
npm run start
```
เข้าชมผ่านเบราว์เซอร์ที่ [http://localhost:3000](http://localhost:3000)
