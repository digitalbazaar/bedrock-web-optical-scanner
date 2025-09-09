# 🧪 Manual Testing Guide

## 🚀 Quick Start

### Set Up Test Environment

```bash
# From repository root
cd bedrock-web-optical-scanner

# Build the test bundle
npm run build

# Serve the manual test page (choose one):
# Option A: Python
python3 -m http.server 8000

# Option B: Node.js
npx serve .

# Option C: Any local server
```

### Open Test Page

Navigate to: `http://localhost:8000/manual-test.html`

You should see: **✅ Library loaded successfully!**

---

## 📋 Test Checklist

### ✅ **Test 1: Image Upload Scanning**

**What to test:**

- [ ] Upload/Camera Scan QR code images
- [ ] Upload/Camera Scan PDF417 images  
- [ ] Test different scan modes (first, all, exhaustive)
- [ ] Test format selection (QR only, PDF417 only, both)
