# iOS store assets — NectarPay POS (merchant app)

## App icon

`AppIcon.appiconset/` holds the single-size (1024×1024, no alpha) icon Xcode 15+
expects. After `bun run ios:merchant:add`, copy it over the generated set:

```bash
rm -rf ios/App/App/Assets.xcassets/AppIcon.appiconset
cp -R assets/ios/AppIcon.appiconset ios/App/App/Assets.xcassets/
```

Then in Xcode: target → General → App Icons Source = `AppIcon`.

## App Store Connect screenshots

Generated to `/mnt/documents/appstore/`:

| File | Size | Slot |
| --- | --- | --- |
| `iphone-6.7-1..4.png` | 1290×2796 | iPhone 6.7" (also accepted for 6.5") |
| `ipad-12.9-1..4.png` | 2048×2732 | iPad Pro 12.9" |

Order: amount keypad → tip → rail chooser → payment QR. Upload in that order;
App Store Connect uses the first as the primary listing image.
