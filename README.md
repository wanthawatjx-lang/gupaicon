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

## การตั้งค่าความปลอดภัยและคีย์ในเครื่อง (Security & Multi-Key Setup)

> ⚠️ **คำเตือนด้านความปลอดภัยสำหรับ Public Repository**:
> **ห้าม Commit หรือ Push ไฟล์ `.env` ที่มีคีย์จริงขึ้นบน GitHub เด็ดขาด!** 
> โปรเจกต์นี้มีกฎ `.gitignore` ที่ครอบคลุมไฟล์ `.env*`, ซีเคร็ต, และไฟล์ใบรับรองต่างๆ ไว้แล้ว

### 1. การสร้างไฟล์ `.env` สำหรับ Local Development
คัดลอกไฟล์เทมเพลต `.env.example` ไปเป็น `.env`:
```bash
cp .env.example .env
```

### 2. การกำหนดค่า Multi-Key Rotation สำหรับ Gemini API
โมดูล `geminiClient.js` รองรับการสลับคีย์อัตโนมัติเมื่อเกิด HTTP 429 (Rate Limit):
```bash
# กำหนดคีย์ได้หลายชุดเพื่อการสลับใช้งานอัตโนมัติ (Failover & Load distribution)
GEMINI_API_KEY_1="AIzaSyYourFirstGeminiApiKey"
GEMINI_API_KEY_2="AIzaSyYourSecondGeminiApiKey"
GEMINI_API_KEY_3="AIzaSyYourThirdGeminiApiKey"

# หรือใช้คีย์เดี่ยวพื้นฐาน
GEMINI_API_KEY="AIzaSyYourSingleGeminiApiKey"
```

### 3. กลไกการทำงานของ Multi-Key Rotation
- **ตรวจจับ 429 / Quota Exhausted**: หากคีย์ที่ 1 ติด Rate Limit ระบบจะเข้าสู่ cooldown ชั่วคราว และสลับไปยังคีย์ที่ 2 หรือ 3 โดยอัตโนมัติทันที
- **ป้องกันการรั่วไหลของคีย์**: ข้อมูลคีย์จะถูก Mask ใน Log เสมอ (เช่น `AIzaSy1...stuv`) และไม่มีการส่งคีย์ไปยังฝั่งเบราว์เซอร์
- **กรณีคีย์ทั้งหมดหมดโควตา**: ระบบจะแจ้งเตือนผู้ใช้ด้วยข้อความที่ชัดเจนพร้อมสถานะ HTTP 429 และแนะนำให้รอสักครู่ก่อนลองใหม่

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
