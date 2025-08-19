# Vue Scanner Demo

This is a reference Vue 3 app demonstrating usage of `@bedrock/web-optical-scanner`.

> **Note:** For local development, since `@bedrock/web-optical-scanner` is not published to npm, you must install it from your local source directory. See setup instructions below.

## Setup

Run the following commands from the `examples/vue-scanner-demo` directory:

```bash
npm install
npm install ../../
```

## Run the Demo

From the same `examples/vue-scanner-demo` directory:

```bash
npm run dev
```

## Usage

- Open the app in your browser.
- Use the file input to select an image containing a QR code or PDF417 barcode.
- The scan results will be displayed below.

## Reference

See `components/Scanner.vue` for a minimal integration example.
