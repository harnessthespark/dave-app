# Dave App

Mental health companion app built with Expo/React Native.

## Project Info

- **Bundle ID:** com.lisagills.dave
- **Current Version:** 1.11.0
- **iOS Build:** 13
- **Android Version Code:** 9
- **EAS Project ID:** beac671b-4e29-43db-87c6-4cd755df1108

## Commands

```bash
# Build for iOS
eas build --platform ios --profile production

# Build for Android
eas build --platform android --profile production

# Submit to App Store
eas submit --platform ios --latest

# Submit to Google Play
eas submit --platform android --latest

# OTA update
eas update --branch production
```

## App Store URLs

- **App Store Connect ID:** 6757913823
- **Privacy Policy:** https://app.harnessthespark.ai/dave/privacy.html
- **Support:** https://app.harnessthespark.ai/dave/support.html
- **Marketing Page:** https://app.harnessthespark.ai/dave/

## Marketing Pages Repo

`https://github.com/harnessthespark/dave-pages` - deployed to app.harnessthespark.ai via Coolify

## TODO

### Deployment
- [ ] Deploy dave-pages to Coolify (static site from harnessthespark/dave-pages, domain: app.harnessthespark.ai)
- [ ] Configure DNS for app.harnessthespark.ai (A record or CNAME to Coolify server)

### Google Play
- [ ] Resolve Google Play account issues (check for payment, identity verification, or policy acknowledgments)
- [ ] Complete Google Play Console app listing:
  - Store listing (title, description, screenshots)
  - Privacy policy URL: https://app.harnessthespark.ai/dave/privacy.html
  - Data safety form
  - Content rating questionnaire
  - Target audience declaration
  - App category
- [ ] Submit Android app to Google Play (AAB ready: https://expo.dev/artifacts/eas/cheTGpx7MpBjKngE7WpX2Q.aab)

### iOS
- [ ] Monitor iOS App Store submission (Build 13, v1.11.0)
  - Submission: https://expo.dev/accounts/lisagills/projects/dave-app/submissions/461ac397-6faf-4407-928e-839c673436b6
