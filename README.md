# กูไกูปคอน (gupaicon)

เว็บแอปแผนที่และรายการคอนเสิร์ตอินดี้ / ไลฟ์เฮาส์ ในกรุงเทพฯ และรังสิต/ปทุมธานี (Bangkok & Rangsit Livehouse Map)
พร้อมระบบตรวจสอบและแสดงสถานะบัตรด่วนแบบเรียลไทม์

พัฒนาด้วย **React**, **TypeScript**, **Vite**, **Leaflet** (OpenStreetMap tiles with dark theme CSS filter) และ **Firebase** (Firestore + Google Authentication) รองรับแผนฟรี Spark Plan ไม่ต้องใช้ Cloud Functions หรือ Firebase Storage

---

## ฟีเจอร์หลัก (Features)

### 1. แผนที่และหมุดร้านอัจฉริยะ (Interactive Map & Urgent Status Pins)
- **พิกัดศูนย์กลาง**: กรุงเทพฯ (`13.80, 100.55`) พร้อมตีกรอบขอบเขตพื้นที่เฉพาะกรุงเทพฯ และรังสิต/ปทุมธานี (`13.40, 100.20` ถึง `14.30, 100.95`)
- **สีของ Pin ตามความเร่งด่วนของงานที่กำลังจะมาถึง**:
  - 🔴 **สีแดง (soldout)**: มีงานที่บัตรหมดแล้ว
  - 🟡 **สีเหลือง (low)**: มีงานที่บัตรเหลือน้อย
  - 🟢 **สีเขียว (available)**: ยังมีบัตร
  - ⚪ **สีเทา (none / notopen / cancelled)**: ไม่มีงานที่กำลังจะมาถึง หรือยังไม่เปิดขาย / ยกเลิก
- **ตัวเลขบนหมุด**: แสดงจำนวนงานที่กำลังจะมาถึงของร้านนั้น
- **ระบบจัดกลุ่มหมุด (Marker Clustering)**: เมื่อซูมออก หมุดที่อยู่ใกล้กันจะรวมกลุ่มกันแสดงจำนวนรวม ป้องกันการทับซ้อน
- **Accessibility & Contrast**: ทุกสถานะแสดงผลด้วย **สี + ไอคอนสัญลักษณ์ + ข้อความ** (✓ ยังมีบัตร · ◐ เหลือน้อย · ✕ บัตรหมด · ○ ยังไม่เปิดขาย · ⊘ ยกเลิก) ขนาด touch target ≥ 44px และ contrast ratio ≥ 4.5:1

### 2. หน้ารายละเอียดร้าน & งาน (Venue Sheet & Event Sheet)
- **Venue Bottom Sheet (3 ระดับ)**: ปรับระดับได้ 3 สเต็ป (`peek` ~130px, `half` ~50vh, `full` ~88vh) พร้อม gesture ลากปรับระดับ
  - แสดงชื่อร้าน, ที่อยู่, ปุ่มเปิดใน Maps และ Instagram
  - แสดงรายการงานที่กำลังจะมาถึง เรียงตามวันเวลา (ซ่อนงานที่ผ่านไปแล้วอัตโนมัติ)
  - แต่ละแถวแสดง วันที่-เวลาในเขตเวลา `Asia/Bangkok`, ชื่อวง, badge สถานะ
- **Event Detail Sheet**:
  - แสดงชื่อวง/งาน, ศิลปินทั้งหมด, แนวเพลง, ราคาบัตร
  - **ผู้จัดงาน (Promoter)**: แสดงชื่อพร้อมติ๊กถูกสีฟ้า (`✓`) กรณี verified พร้อมลิงก์ไปหน้า IG
  - วันที่และเวลาแสดงในเขตเวลา `Asia/Bangkok` (เช่น "ศุกร์ 14 มี.ค. 2025 · 20:00 น.")
  - Badge สถานะบัตรพร้อมเวลาอัปเดตล่าสุด ("อัปเดตล่าสุด X นาทีที่แล้ว")
  - **ข้อความความจริงใจ (Sincerity Notice)**: *"สถานะบัตรมาจากผู้ใช้/แอดมิน อาจคลาดเคลื่อน เช็กกับหน้าขายบัตรอีกครั้ง"* พร้อมแท็ก "ยังไม่ยืนยัน"
  - ปุ่ม **"ซื้อบัตร"** (`ticketUrl`) และ **"ดูโพสต์ IG"** (`igPostUrl`) เปิดแท็บใหม่ (ไม่ embed)
- **Direct Link Support**: รองรับ deep link เข้าผ่าน URL เช่น `#/event/{id}` เปิดหน้ารายละเอียดงานทันทีพร้อม pan แผนที่ไปยังร้าน

### 3. หน้ารายการงาน & ตัวกรอง (List View & Filter)
- **สลับโหมดแผนที่และรายการ**: สลับได้สะดวกรวดเร็วด้วยปุ่มลอย (Floating Switch Button) ที่ด้านล่าง
- **แถบตัวกรอง (Filter Bar)**: เลื่อนแนวนอนได้ (Horizontal Scroll) ไม่ล้นจอ 390px
  - ตัวเลือกวัน: **ทั้งหมด** (All), **วันนี้** (Today), **สัปดาห์นี้** (This week), **เดือนนี้** (This month)
  - สวิตช์ toggle: **"เฉพาะที่ยังมีบัตร"** (กรองเอาเฉพาะ `available` และ `low`)
  - ตัวกรองมีผลทั้งบนแผนที่ (สีหมุดและตัวเลขงานเปลี่ยนตามตัวกรอง) และในหน้ารายการ
- **Empty State & Skeleton Loader**:
  - แสดง Skeleton loader สวยงามขณะโหลดข้อมูลจาก Firestore
  - เมื่อกรองแล้วไม่เจองาน แสดงข้อความ *"ยังไม่มีงานในช่วงนี้"* พร้อมปุ่ม *"ล้างตัวกรอง"*

### 4. แอดมินคอนโซล (`#/admin`)
- **การรักษาความปลอดภัยสูงสุด**: จำกัดสิทธิ์เฉพาะอีเมล `wantawachjz@gmail.com` ที่ยืนยันอีเมลแล้วเท่านั้น (`email_verified == true`) ลบอีเมลอื่นทั้งหมด
- **แท็บจัดการ 3 หมวด**:
  - **งาน (Events)**: เพิ่ม/แก้ไข/ลบงาน, เลือกร้านจาก dropdown, เลือกผู้จัดจาก dropdown, เลือกวันเวลา Asia/Bangkok
  - **เปลี่ยนสถานะด่วน (Quick Status)**: กดเปลี่ยนสถานะบัตรด้วยการแตะครั้งเดียว บันทึก `statusUpdatedAt` เป็น server timestamp ทันที
  - **ร้าน (Venues)**: จัดการพิกัด, ที่อยู่, ลิงก์แผนที่, Instagram
  - **ผู้จัด (Promoters)**: จัดการชื่อ, IG, สถานะ verified
- **ปุ่ม Seed ข้อมูลตัวอย่าง (SAMPLE)**: กด 1 คลิก สร้าง 4-5 งานตัวอย่าง SAMPLE ผูกกับร้าน SAMPLE 3 ร้านเดิม

### 5. สองภาษา (TH/EN) & ไทโปกราฟี
- ปุ่มสลับภาษาบน Header (`TH | EN`) ค่าเริ่มต้นเป็น **TH** และบันทึกค่าไว้ใน `localStorage`
- รวมข้อความ UI ทั้งหมดไว้ในไฟล์เดียว `src/i18n.ts`
- ข้อมูลงาน/ร้าน/ผู้จัด แสดงผลตามที่กรอกจริง
- ฟอนต์ Google Fonts **Noto Sans Thai** (น้ำหนัก 400, 500, 600, 700) พร้อม fallback `system-ui`
- ปรับ `line-height` เป็น 1.6 สำหรับภาษาไทย ขนาดตัวอักษรไม่ต่ำกว่า 15px รองรับจอ iPhone 14 (390px) สมบูรณ์

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
- `status`: `"available"` | `"low"` | `"soldout"` | `"notopen"` | `"cancelled"`
- `statusUpdatedAt`: timestamp
- `statusSource`: `"admin"`
- `createdAt`, `updatedAt`: timestamp

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
