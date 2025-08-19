# 🧪 Manual Testing Guide

## 🚀 Quick Start

### 1. Set Up Test Environment

```bash
# From repository root
cd bedrock-web-optical-scanner

# Serve the manual test page (choose one):
# Option A: Python
python3 -m http.server 8000

# Option B: Node.js
npx serve .

# Option C: Any local server
```

### 2. Open Test Page

Navigate to: `http://localhost:8000/manual-test.html`

You should see: **✅ Library loaded successfully!**

---

## 📋 Test Checklist

### ✅ **Test 1: Image Upload Scanning**

**What to test:**

- [ ] Upload QR code images
- [ ] Upload PDF417 images  
- [ ] Test different scan modes (first, all, exhaustive)
- [ ] Test format selection (QR only, PDF417 only, both)

**How to get test images:**

1. **Generate QR Codes Online:**

   - TBD

2. **Use Existing Test Images:**

   ```bash
   # Copy from your test directory
   cp test/images/qr_code/001.gif .
   cp test/images/pdf417/001.png .
   ```

3. **Create PDF417 Online:**
   - TBD

**Expected Results:**

- ✅ QR codes detected with correct text
- ✅ PDF417 codes detected with correct text
- ✅ Scan times under 100ms for small images
- ✅ Different modes return appropriate results

---

### ✅ **Test 2: Live Camera Scanning**

**What to test:**

- [ ] Start camera stream
- [ ] Camera permissions granted
- [ ] Video displays correctly
- [ ] Start continuous scanning
- [ ] Detect QR codes in real-time
- [ ] Stop scanning gracefully

**Test Materials Needed:**

1. **Phone with QR codes** - Display QR on phone screen
2. **Printed QR codes** - More reliable than screens
3. **ID cards with PDF417** - Driver's licenses, etc.

**How to test:**

1. Click "📷 Start Camera"
2. Grant camera permissions
3. Hold QR code/PDF417 up to camera
4. Click "🔍 Start Scanning"
5. Move code until detected
6. Test stop/start functionality

**Expected Results:**

- ✅ Camera starts without errors
- ✅ Real-time video stream
- ✅ Codes detected within 2-3 seconds
- ✅ Results display correctly
- ✅ Clean stop/start cycle

---
