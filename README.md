# กูไกูปคอน (gupaicon)

เว็บแอปแผนที่และรายการคอนเสิร์ตอินดี้ / ไลฟ์เฮาส์ ในกรุงเทพฯ และรังสิต/ปทุมธานี (Bangkok & Rangsit Livehouse Map)
พร้อมระบบตรวจสอบและแสดงสถานะบัตรด่วนแบบเรียลไทม์ และระบบรายงานสถานะจากฝูงชน (Crowd-Reported Ticket Status)

พัฒนาด้วย **React**, **TypeScript**, **Vite**, **Leaflet** (OpenStreetMap tiles with dark theme CSS filter) และ **Firebase** (Firestore + Google Authentication) รองรับแผนฟรี Spark Plan ไม่ต้องใช้ Cloud Functions หรือ Firebase Storage

---

## ฟีเจอร์หลัก (Features)

### 1. แผนที่และหมุดร้านอัจฉริยะ (Interactive Map & Urgent Status Pins)
- **พิกัดศูนย์กลาง**: กรุงเทพฯ (`13.80, 100.55`) พร้อมตีกรอบขอบเขตพื้นที่เฉพาะกรุงเทพฯ และรังสิต/ปทุมธานี (`13.40, 100.20` ถึง `14.30, 100.95`)
- **สีของ Pin ตามความเร่งด่วนของงานที่กำลังจะมาถึง**:
  - 🔴 **สีแดง (`sold_out`)**: มีงานที่บัตรหมดแล้ว
  - 🟡 **สีเหลือง (`low`)**: มีงานที่บัตรเหลือน้อย
  - 🟢 **สีเขียว (`available`)**: ยังมีบัตร
  - ⚪ **สีเทา (`not_open` / `cancelled`)**: ไม่มีงานที่กำลังจะมาถึง หรือยังไม่เปิดขาย / ยกเลิก
- **ตัวเลขบนหมุด**: แสดงจำนวนงานที่กำลังจะมาถึงของร้านนั้น
- **ระบบจัดกลุ่มหมุด (Marker Clustering)**: เมื่อซูมออก หมุดที่อยู่ใกล้กันจะรวมกลุ่มกันแสดงจำนวนรวม ป้องกันการทับซ้อน
- **Accessibility & Contrast**: ทุกสถานะแสดงผลด้วย **สี + ไอคอนสัญลักษณ์ + ข้อความ** (`✓ ยังมีบัตร` · `◐ เหลือน้อย` · `✕ บัตรหมด` · `○ ยังไม่เปิดขาย` · `⊘ ยกเลิก`) ขนาด touch target ≥ 44px และ contrast ratio ≥ 4.5:1

### 2. หน้ารายละเอียดร้าน & งาน (Venue Sheet & Event Sheet)
- **Venue Bottom Sheet (3 ระดับ)**: ปรับระดับได้ 3 สเต็ป (`peek` ~130px, `half` ~50vh, `full` ~88vh) พร้อม gesture ลากปรับระดับ
  - แสดงชื่อร้าน, ที่อยู่, ปุ่มเปิดใน Maps และ Instagram
  - แสดงรายการงานที่กำลังจะมาถึง เรียงตามวันเวลา (ซ่อนงานที่ผ่านไปแล้วอัตโนมัติ)
  - แต่ละแถวแสดง วันที่-เวลาในเขตเวลา `Asia/Bangkok`, ชื่อวง, badge สถานะ
- **Event Detail Sheet & Crowd Reporting**:
  - แสดงชื่อวง/งาน, ศิลปินทั้งหมด, แนวเพลง, ราคาบัตร
  - **ผู้จัดงาน (Promoter)**: แสดงชื่อพร้อมติ๊กถูกสีฟ้า (`✓`) กรณี verified พร้อมลิงก์ไปหน้า IG
  - วันและเวลาแสดงในเขตเวลา `Asia/Bangkok` (เช่น *"ศุกร์ 14 มี.ค. 2025 · 20:00 น."*)
  - **ระบบรายงานสถานะจากผู้ใช้ (Crowd-Reported Status)**:
    - ปุ่ม **"Sign in with Google"** สำหรับผู้ใช้งานทั่วไปเพื่อให้รายงานสถานะได้
    - ส่วนรายงานสถานะบัตรประกอบด้วย 3 ปุ่มใหญ่ (min 44px): **Available / Low / Sold out** (`ยังมีบัตร / เหลือน้อย / บัตรหมด`)
    - หลังรายงานแล้วแสดงข้อความ *"Thanks, you reported: X"* และให้เปลี่ยนสถานะได้
  - **Displayed Status Logic**:
    - หากแอดมินหรือผู้จัดตั้งสถานะ (`statusSource = "admin"` หรือ `"organizer"`) และใหม่กว่ารายงานล่าสุด แสดงสถานะแอดมินพร้อมเครื่องหมาย Verified
    - มิฉะนั้น หากมีผู้ใช้เห็นพ้องต้องกันอย่างน้อย **3 คน** ภายใน **90 นาที** แสดงเป็นสถานะยืนยันพร้อม *"Confirmed by N people"* และเวลาอัปเดต
    - หากน้อยกว่า 3 คน แสดงสถานะสีเทาเป็นกลาง *"Unconfirmed"* ไม่แสดงเป็นข้อเท็จจริง
- **Direct Link Support**: รองรับ deep link เข้าผ่าน URL เช่น `#/event/{id}` เปิดหน้ารายละเอียดงานทันทีพร้อม pan แผนที่ไปยังร้าน

### 3. หน้ารายการงาน & ตัวกรอง (List View & Filter)
- **สลับโหมดแผนที่และรายการ**: สลับได้สะดวกรวดเร็วด้วยปุ่มลอย (Floating Switch Button) ที่ด้านล่าง
- **แถบตัวกรอง (Filter Bar)**: เลื่อนแนวนอนได้ (Horizontal Scroll) ไม่ล้นจอ 390px
  - ตัวเลือกวัน: **ทั้งหมด** (All), **วันนี้** (Today), **สัปดาห์นี้** (This week), **เดือนนี้** (This month)
  - สวิตช์ toggle: **"เฉพาะที่ยังมีบัตร"** (กรองเอาเฉพาะ `available` และ `low`)
  - ตัวกรองมีผลทั้งบนแผนที่และในหน้ารายการ
- **Empty State & Skeleton Loader**:
  - แสดง Skeleton loader สวยงามขณะโหลดข้อมูลจาก Firestore
  - เมื่อกรองแล้วไม่เจองาน แสดงข้อความ *"ยังไม่มีงานในช่วงนี้"* พร้อมปุ่ม *"ล้างตัวกรอง"*

### 4. แอดมินคอนโซล (`#/admin`)
- **การรักษาความปลอดภัยสูงสุด**: จำกัดสิทธิ์เฉพาะอีเมล `wantawachjz@gmail.com` ที่ยืนยันอีเมลแล้วเท่านั้น (`email_verified == true`)
- **แท็บจัดการ 3 หมวด (Events, Venues, Promoters)**:
  - **Events Tab**: แสดงจำนวน crowd reports ในรอบ 90 นาทีของแต่ละงาน พร้อมปุ่ม **"Delete all reports"** สำหรับเคลียร์สแปม
  - ฟอร์มสร้าง/แก้ไขงานมี dropdown เลือกร้านและผู้จัด, วันเวลา Asia/Bangkok
  - ปุ่มเปลี่ยนสถานะด่วน (Quick Status) แบบ one-tap บันทึก `statusUpdatedAt` เป็น server timestamp ทันที

---

## โครงสร้างข้อมูล Firestore (Data Model)

### 1. `/venues/{venueId}`
- `name`: string (2..100)
- `lat`: number
- `lng`: number
- `address`: string (2..250)
- `igUrl`: string (0..300)
- `mapsUrl`: string (0..500)
- `createdAt`, `updatedAt`: timestamp

### 2. `/promoters/{promoterId}`
- `name`: string (1..80)
- `igUrl`: string (optional, 0..300)
- `verified`: boolean (default: false)
- `createdAt`, `updatedAt`: timestamp

### 3. `/events/{eventId}`
- `title`: string (1..120)
- `artists`: array of string (1..20)
- `venueId`: string (references `/venues/{venueId}`)
- `promoterId`: string (optional, references `/promoters/{promoterId}`)
- `startAt`: timestamp
- `priceText`: string (0..60)
- `genres`: array of string (0..8)
- `ticketUrl`: string (optional, 0..500)
- `igPostUrl`: string (optional, 0..500)
- `posterUrl`: string (optional, 0..1000)
- `status`: `"available"` | `"low"` | `"sold_out"` | `"not_open"` | `"cancelled"`
- `statusUpdatedAt`: timestamp
- `statusSource`: `"admin"` | `"organizer"`
- `createdAt`, `updatedAt`: timestamp

### 4. `/events/{eventId}/reports/{uid}` (Crowd Reports)
- `status`: `"available"` | `"low"` | `"sold_out"`
- `createdAt`: server timestamp (document ID equals user's UID)

---

## การตั้งค่ากฎความปลอดภัย (Firestore Rules)

กฎถูกคอมไพล์และอัปเดตไว้ใน `firestore.rules`:
```javascript
function isAdmin() {
  return isSignedIn()
    && request.auth.token.email_verified == true
    && request.auth.token.email == 'wantawachjz@gmail.com';
}
```
- **Venues, Promoters, Events**: สาธารณะอ่านได้ (`read: true`), เฉพาะแอดมินเขียนได้ (`write: isAdmin()`)
- **Reports (`/events/{eventId}/reports/{uid}`)**:
  - `read`: สาธารณะ
  - `create`, `update`: เฉพาะผู้ใช้ที่ล็อกอิน (`isSignedIn()`), `request.auth.uid == uid`, สถานะถูกต้อง (`available`, `low`, `sold_out`), และ `createdAt == request.time`
  - `delete`: เฉพาะเจ้าของรายงาน (`request.auth.uid == uid`) หรือแอดมิน (`isAdmin()`)

---

## การรันโปรเจกต์ในเครื่อง

```bash
# ติดตั้ง dependencies
npm install

# รันโหมด dev
npm run dev

# บิลด์สำหรับ production
npm run build
```
เข้าชมผ่านเบราว์เซอร์ที่ [http://localhost:3000](http://localhost:3000)
