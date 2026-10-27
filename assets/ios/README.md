# iOS store assets — NectarPay POS (merchant app)

## App icon

`AppIcon.appiconset/` holds the single-size (1024×1024, no alpha) icon Xcode 15+
expects. `bun run sync:merchant` (or `bun run ios:prepare`) copies it over Capacitor's
default grey placeholder automatically — no manual step needed. Manual equivalent:

```bash
rm -rf ios/App/App/Assets.xcassets/AppIcon.appiconset
cp -R assets/ios/AppIcon.appiconset ios/App/App/Assets.xcassets/
```

In Xcode confirm: target → General → App Icons Source = `AppIcon`, then Archive
again — the icon is native, so a live web reload will not change it.

## App Store Connect screenshots

Generated to `/mnt/documents/appstore/`:

| File | Size | Slot |
| --- | --- | --- |
| `iphone-6.7-1..4.png` | 1290×2796 | iPhone 6.7" (also accepted for 6.5") |
| `ipad-12.9-1..4.png` | 2048×2732 | iPad Pro 12.9" |

Order: amount keypad → tip → rail chooser → payment QR. Upload in that order;
App Store Connect uses the first as the primary listing image.
