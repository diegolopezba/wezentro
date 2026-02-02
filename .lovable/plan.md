
# Client-Side Media Compression for Native App

## Overview
Implement client-side video and image compression that works reliably in both browser and Capacitor WebView environments. This will reduce storage costs by ~70-80% while maintaining good quality.

## Native App Considerations

### Why NOT FFmpeg.wasm for Capacitor
- FFmpeg.wasm requires SharedArrayBuffer which has limited support in mobile WebViews
- Large bundle size (~25MB) impacts app startup
- Inconsistent performance on iOS WebKit
- Memory-intensive, can crash on lower-end devices

### Recommended Approach: Canvas + MediaRecorder API
For a native app, we'll use browser-native APIs that work reliably in Capacitor:

| Media Type | Solution | Compatibility |
|------------|----------|---------------|
| **Images** | Canvas API + toBlob() | Works everywhere |
| **Videos** | Resolution cap + bitrate hint | Browser-native, no extra deps |

## Technical Implementation

### Image Compression Strategy
Using Canvas API (zero dependencies, works in all WebViews):
- Resize to max 1920px on longest edge
- Convert to WebP format (80% quality) with JPEG fallback
- Target: ~100-300KB per image (down from 2-5MB)

```text
Original: 4000x3000 @ 4.5MB PNG
   ↓ Canvas resize + WebP
Compressed: 1920x1440 @ 150KB WebP
```

### Video Optimization Strategy
Since true re-encoding requires native code, we'll optimize what we can control:
1. **Resolution cap**: Accept only up to 720p (users can pre-crop)
2. **Duration limit**: Already 15 seconds (good)
3. **Size validation**: Lower max from 50MB to 20MB
4. **Format guidance**: Prefer MP4/H.264 which is already compressed

For future enhancement: A native Capacitor plugin could do proper transcoding.

## Files to Create/Modify

| File | Change |
|------|--------|
| `src/lib/mediaCompression.ts` | **New** - Image compression using Canvas API |
| `src/lib/mediaUtils.ts` | Add video resolution validation |
| `src/pages/Create.tsx` | Integrate compression before upload |
| `src/pages/EditProfile.tsx` | Compress avatar before upload |
| `src/components/events/EditEventSheet.tsx` | Compress payment QR before upload |

## Implementation Details

### 1. Create mediaCompression.ts
New utility file with:
- `compressImage(file, maxWidth, quality)` - Canvas-based resize + WebP conversion
- `getImageDimensions(file)` - Read image size
- Returns compressed Blob ready for upload

### 2. Update mediaUtils.ts
Add:
- `getVideoDimensions(file)` - Check video resolution
- Update `validateVideoFile()` to warn if resolution > 720p
- Lower video size limit to 20MB

### 3. Update Create.tsx
In `handleMediaChange`:
```text
1. User selects file
2. If image → compress with compressImage()
3. If video → validate resolution, warn if too large
4. Show compression progress indicator
5. Upload compressed file
```

### 4. Update EditProfile.tsx and EditEventSheet.tsx
Same pattern - compress images before upload.

## Expected Results

| Scenario | Before | After | Savings |
|----------|--------|-------|---------|
| Profile photo (4MB JPEG) | 4MB | ~150KB | 96% |
| Event image (3MB PNG) | 3MB | ~200KB | 93% |
| Event video (50MB) | 50MB | 20MB max | 60% |
| **Per user (20 uploads)** | ~100MB avg | ~10MB avg | **90%** |

### Storage Cost Impact
For 1,000 users with 20 uploads each:
- **Before**: ~100GB (uncompressed)
- **After**: ~10GB (compressed)
- **Monthly savings**: ~$1.50-2.00/month on storage alone

## UX Considerations

1. **Progress feedback**: Show "Compressing..." state during processing
2. **Quality preview**: Compressed preview shown before upload
3. **Transparent**: Users don't need to understand compression
4. **Fast**: Canvas compression takes <1 second for most images

## Future Native Enhancement
For even better video compression, a future option would be to:
- Use `@nicephoton/capacitor-video-compressor` Capacitor plugin
- This would enable true H.264/H.265 re-encoding on device
- Can be added later without changing the current architecture
