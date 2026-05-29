# Welcome to your Rork app

## Project info

This is a native cross-platform mobile app created with [Rork](https://rork.com)

**Platform**: Native iOS & Android app, exportable to web
**Framework**: Expo Router + React Native

## Rebuilding native iOS & Android projects

If you ever delete or need to regenerate the `ios/` or `android/` folders (for example after changing `app.json` splash, icons, or bundle IDs), follow these steps.

### Prerequisites (once per machine)

- Node.js, Bun, Xcode (for iOS), Android Studio (for Android)
- Shell config (recommended):

```bash
echo 'export LANG=en_US.UTF-8' >> ~/.zshrc
echo 'export LC_ALL=en_US.UTF-8' >> ~/.zshrc
source ~/.zshrc
```

### 1. Regenerate native projects from `app.json`

From the project root:

```bash
# iOS and Android
npx expo prebuild
```

This reads `app.json` (icons, splash, scheme `selenesleepapp`, bundle IDs, etc.) and regenerates the native projects. Avoid `--clean` unless you intentionally want to wipe **all** native changes.

### 2. iOS: install pods and set signing

```bash
cd ios
pod install
open SeleneSleepApp.xcworkspace
```

In Xcode:

1. Select the `SeleneSleepApp` target.
2. Go to **Signing & Capabilities**.
3. Check **Automatically manage signing**.
4. Choose your **Team** (Apple ID / org).

Each developer will do this once on their own machine.

### 3. Android: rebuild the app

You can use either CLI or Android Studio.

**CLI:**

```bash
cd /Users/joaquinbrown/Developer/selene-sleep-rn
npx expo run:android
```

**Android Studio:**

1. Open the `android/` folder.
2. From the menu: **Build → Clean Project**, then **Build → Rebuild Project**.

If you change splash or icons and they don’t update, uninstall the app from the emulator/device and rebuild.

## Authentication: Supabase email, Google, and Apple

This app uses Supabase for authentication, with three sign-in options:

- Magic link via email
- Google OAuth
- Apple OAuth

### Supabase configuration

In your Supabase project:

- Go to **Authentication → URL Configuration** and ensure:
  - Your app deep link scheme is allowed (e.g. `selenesleepapp://`), and/or
  - Your hosted confirmation page `https://selene-sleep-app.s3.us-east-1.amazonaws.com/selene-confirmed.html` is configured if you use it as a bridge.
- Enable **Google** and **Apple** providers under **Authentication → Providers**:
  - Google: create OAuth credentials in Google Cloud Console with redirect URI:
    - `https://<your-project>.supabase.co/auth/v1/callback`
    - Paste the Client ID and Client secret into Supabase and toggle Google **ON**.
  - Apple: create a Services ID, Sign in with Apple key (`.p8`), and configure redirect URI:
    - `https://<your-project>.supabase.co/auth/v1/callback`
    - Fill Client ID (Services ID), Key ID, Team ID, and private key in Supabase and toggle Apple **ON**.

### Environment variables

The app expects the following env vars (Expo `EXPO_PUBLIC_*` style):

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `EXPO_PUBLIC_SUPABASE_OAUTH_REDIRECT_URL` (optional; e.g. `selenesleepapp://` or your confirmation page URL)

Email magic links currently use the confirmation page on S3; Google/Apple OAuth use `EXPO_PUBLIC_SUPABASE_OAUTH_REDIRECT_URL` if set, otherwise they fall back to `selenesleepapp://`.

Deep links are handled in `stores/authStore.ts` by parsing `access_token` and `refresh_token` from the callback URL and calling `supabase.auth.setSession`.

## Push Notifications

Selene uses Expo + Supabase to deliver push notifications for community activity and new content.

### Expo client setup

- The app uses `expo-notifications` to register the device and obtain an Expo push token.
- On sign-in, `stores/authStore.ts`:
  - Requests OS notification permission (with graceful handling on simulators).
  - Calls `getExpoPushToken()` from `lib/notifications.ts`.
  - Registers the token with Supabase via `registerPushTokenForUser()` in `lib/services/notificationService.ts`.

You must rebuild native apps after adding `expo-notifications`:

- iOS: `npx expo prebuild --platform ios` then `cd ios && pod install`.
- Android: `npx expo prebuild --platform android` or `npx expo run:android`.

### Supabase schema

Create these tables in your Supabase project (SQL example, adjust as needed):

```sql
create table public.user_push_tokens (
  user_id uuid references auth.users not null,
  expo_push_token text not null,
  platform text not null default 'unknown',
  is_active boolean not null default true,
  last_seen_at timestamptz default now(),
  primary key (user_id, expo_push_token)
);

create table public.notification_preferences (
  user_id uuid references auth.users primary key,
  likes_enabled boolean not null default true,
  comments_enabled boolean not null default true,
  new_content_enabled boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

Recommended RLS (simplified):

```sql
alter table public.user_push_tokens enable row level security;
alter table public.notification_preferences enable row level security;

create policy "Users manage own tokens"
  on public.user_push_tokens
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage own notification preferences"
  on public.notification_preferences
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

### Edge Functions

In `supabase/functions` the following functions are scaffolded:

- `send-push`: generic helper that:
  - Looks up `user_push_tokens` for a `userId`.
  - Calls the Expo Push API (`https://exp.host/--/api/v2/push/send`).
  - Is intended to be called **only from other Edge Functions** using the service role key.
- `notify-like`:
  - Accepts `{ postOwnerId, actorUserId, messageSnippet }`.
  - Checks `notification_preferences.likes_enabled`.
  - Sends a push like “New like on your post” via `send-push`.
- `notify-comment`:
  - Accepts `{ postOwnerId, actorUserId, messageSnippet }`.
  - Checks `notification_preferences.comments_enabled`.
  - Sends a push like “New comment on your post” via `send-push`.
- `notify-new-content`:
  - Accepts `{ title, body, deepLink }`.
  - Selects all users with `new_content_enabled = true`.
  - Sends a generic “New session/article available” push to each.

Deploy these with the Supabase CLI from the project root:

```bash
supabase functions deploy send-push
supabase functions deploy notify-like
supabase functions deploy notify-comment
supabase functions deploy notify-new-content
```

Ensure the Edge Functions have `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` set in their environment.

### In-app notification settings

- `app/(tabs)/settings/index.tsx` adds a **Settings → Notifications** screen.
- It reads/writes the `notification_preferences` row for the current user via Supabase.
- Toggles:
  - Likes on my posts
  - Comments/replies on my posts
  - New sessions & articles

### Community triggers

- Community feed likes (`app/(tabs)/community/index.tsx`):
  - After a like is successfully sent to Stream, the app fires a best-effort POST to `notify-like` for the post owner (if Supabase is configured).
- Thread likes and replies (`app/(tabs)/community/thread.tsx`):
  - Likes call `notify-like` for the parent or reply author.
  - New replies are good candidates to call `notify-comment` if you want per-reply notifications.

### Handling notification taps

- `app/_layout.tsx` registers a `Notifications.addNotificationResponseReceivedListener`.
- Today it logs the notification data and is ready to be extended to:
  - Navigate into the relevant community thread or content screen based on `data.type` / `data.deepLink`.

## How can I edit this code?

There are several ways of editing your native mobile application.

### **Use Rork**

Simply visit [rork.com](https://rork.com) and prompt to build your app with AI.

Changes made via Rork will be committed automatically to this GitHub repo.

Whenever you make a change in your local code editor and push it to GitHub, it will be also reflected in Rork.

### **Use your preferred code editor**

If you want to work locally using your own code editor, you can clone this repo and push changes. Pushed changes will also be reflected in Rork.

If you are new to coding and unsure which editor to use, we recommend Cursor. If you're familiar with terminals, try Claude Code.

The only requirement is having Node.js & Bun installed - [install Node.js with nvm](https://github.com/nvm-sh/nvm) and [install Bun](https://bun.sh/docs/installation)

Follow these steps:

```bash
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
bun i

# Step 4: Start the instant web preview of your Rork app in your browser, with auto-reloading of your changes
bun run start-web

# Step 5: Start iOS preview
# Option A (recommended):
bun run start  # then press "i" in the terminal to open iOS Simulator
# Option B (if supported by your environment):
bun run start -- --ios
```

### **Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

## What technologies are used for this project?

This project is built with the most popular native mobile cross-platform technical stack:

- **React Native** - Cross-platform native mobile development framework created by Meta and used for Instagram, Airbnb, and lots of top apps in the App Store
- **Expo** - Extension of React Native + platform used by Discord, Shopify, Coinbase, Telsa, Starlink, Eightsleep, and more
- **Expo Router** - File-based routing system for React Native with support for web, server functions and SSR
- **TypeScript** - Type-safe JavaScript
- **React Query** - Server state management
- **Lucide React Native** - Beautiful icons

## How can I test my app?

### **On your phone (Recommended)**

1. **iOS**: Download the [Rork app from the App Store](https://apps.apple.com/app/rork) or [Expo Go](https://apps.apple.com/app/expo-go/id982107779)
2. **Android**: Download the [Expo Go app from Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent)
3. Run `bun run start` and scan the QR code from your development server

### **In your browser**

Run `bun start-web` to test in a web browser. Note: The browser preview is great for quick testing, but some native features may not be available.

### **iOS Simulator / Android Emulator**

You can test Rork apps in Expo Go or Rork iOS app. You don't need XCode or Android Studio for most features.

**When do you need Custom Development Builds?**

- Native authentication (Face ID, Touch ID, Apple Sign In)
- In-app purchases and subscriptions
- Push notifications
- Custom native modules

Learn more: [Expo Custom Development Builds Guide](https://docs.expo.dev/develop/development-builds/introduction/)

If you have XCode (iOS) or Android Studio installed:

```bash
# iOS Simulator
bun run start -- --ios

# Android Emulator
bun run start -- --android
```

## How can I deploy this project?

### **Publish to App Store (iOS)**

1. **Install EAS CLI**:

   ```bash
   bun i -g @expo/eas-cli
   ```

2. **Configure your project**:

   ```bash
   eas build:configure
   ```

3. **Build for iOS**:

   ```bash
   eas build --platform ios
   ```

4. **Submit to App Store**:
   ```bash
   eas submit --platform ios
   ```

For detailed instructions, visit [Expo's App Store deployment guide](https://docs.expo.dev/submit/ios/).

### **Publish to Google Play (Android)**

1. **Build for Android**:

   ```bash
   eas build --platform android
   ```

2. **Submit to Google Play**:
   ```bash
   eas submit --platform android
   ```

For detailed instructions, visit [Expo's Google Play deployment guide](https://docs.expo.dev/submit/android/).

### **Publish as a Website**

Your React Native app can also run on the web:

1. **Build for web**:

   ```bash
   eas build --platform web
   ```

2. **Deploy with EAS Hosting**:
   ```bash
   eas hosting:configure
   eas hosting:deploy
   ```

Alternative web deployment options:

- **Vercel**: Deploy directly from your GitHub repository
- **Netlify**: Connect your GitHub repo to Netlify for automatic deployments

## App Features

This template includes:

- **Cross-platform compatibility** - Works on iOS, Android, and Web
- **File-based routing** with Expo Router
- **Tab navigation** with customizable tabs
- **Modal screens** for overlays and dialogs
- **TypeScript support** for better development experience
- **Async storage** for local data persistence
- **Vector icons** with Lucide React Native

## Project Structure

```
├── app/                    # App screens (Expo Router)
│   ├── (tabs)/            # Tab navigation screens
│   │   ├── _layout.tsx    # Tab layout configuration
│   │   └── index.tsx      # Home tab screen
│   ├── _layout.tsx        # Root layout
│   ├── modal.tsx          # Modal screen example
│   └── +not-found.tsx     # 404 screen
├── assets/                # Static assets
│   └── images/           # App icons and images
├── constants/            # App constants and configuration
├── app.json             # Expo configuration
├── package.json         # Dependencies and scripts
└── tsconfig.json        # TypeScript configuration
```

## Custom Development Builds

For advanced native features, you'll need to create a Custom Development Build instead of using Expo Go.

### **When do you need a Custom Development Build?**

- **Native Authentication**: Face ID, Touch ID, Apple Sign In, Google Sign In
- **In-App Purchases**: App Store and Google Play subscriptions
- **Advanced Native Features**: Third-party SDKs, platform-specifc features (e.g. Widgets on iOS)
- **Background Processing**: Background tasks, location tracking

### **Creating a Custom Development Build**

```bash
# Install EAS CLI
bun i -g @expo/eas-cli

# Configure your project for development builds
eas build:configure

# Create a development build for your device
eas build --profile development --platform ios
eas build --profile development --platform android

# Install the development build on your device and start developing
bun start --dev-client
```

**Learn more:**

- [Development Builds Introduction](https://docs.expo.dev/develop/development-builds/introduction/)
- [Creating Development Builds](https://docs.expo.dev/develop/development-builds/create-a-build/)
- [Installing Development Builds](https://docs.expo.dev/develop/development-builds/installation/)

## Advanced Features

### **Add a Database**

Integrate with backend services:

- **Supabase** - PostgreSQL database with real-time features
- **Firebase** - Google's mobile development platform
- **Custom API** - Connect to your own backend

### **Add Authentication**

Implement user authentication:

**Basic Authentication (works in Expo Go):**

- **Expo AuthSession** - OAuth providers (Google, Facebook, Apple) - [Guide](https://docs.expo.dev/guides/authentication/)
- **Supabase Auth** - Email/password and social login - [Integration Guide](https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native)
- **Firebase Auth** - Comprehensive authentication solution - [Setup Guide](https://docs.expo.dev/guides/using-firebase/)

**Native Authentication (requires Custom Development Build):**

- **Apple Sign In** - Native Apple authentication - [Implementation Guide](https://docs.expo.dev/versions/latest/sdk/apple-authentication/)
- **Google Sign In** - Native Google authentication - [Setup Guide](https://docs.expo.dev/guides/google-authentication/)

### **Add Push Notifications**

Send notifications to your users:

- **Expo Notifications** - Cross-platform push notifications
- **Firebase Cloud Messaging** - Advanced notification features

### **Add Payments**

Monetize your app:

**Web & Credit Card Payments (works in Expo Go):**

- **Stripe** - Credit card payments and subscriptions - [Expo + Stripe Guide](https://docs.expo.dev/guides/using-stripe/)
- **PayPal** - PayPal payments integration - [Setup Guide](https://developer.paypal.com/docs/checkout/mobile/react-native/)

**Native In-App Purchases (requires Custom Development Build):**

- **RevenueCat** - Cross-platform in-app purchases and subscriptions - [Expo Integration Guide](https://www.revenuecat.com/docs/expo)
- **Expo In-App Purchases** - Direct App Store/Google Play integration - [Implementation Guide](https://docs.expo.dev/versions/latest/sdk/in-app-purchases/)

**Paywall Optimization:**

- **Superwall** - Paywall A/B testing and optimization - [React Native SDK](https://docs.superwall.com/docs/react-native)
- **Adapty** - Mobile subscription analytics and paywalls - [Expo Integration](https://docs.adapty.io/docs/expo)

## I want to use a custom domain - is that possible?

For web deployments, you can use custom domains with:

- **EAS Hosting** - Custom domains available on paid plans
- **Netlify** - Free custom domain support
- **Vercel** - Custom domains with automatic SSL

For mobile apps, you'll configure your app's deep linking scheme in `app.json`.

## Troubleshooting

### **App not loading on device?**

1. Make sure your phone and computer are on the same WiFi network
2. Try using tunnel mode: `bun start -- --tunnel`
3. Check if your firewall is blocking the connection

### **Build failing?**

1. Clear your cache: `bunx expo start --clear`
2. Delete `node_modules` and reinstall: `rm -rf node_modules && bun install`
3. Check [Expo's troubleshooting guide](https://docs.expo.dev/troubleshooting/build-errors/)

### **Need help with native features?**

- Check [Expo's documentation](https://docs.expo.dev/) for native APIs
- Browse [React Native's documentation](https://reactnative.dev/docs/getting-started) for core components
- Visit [Rork's FAQ](https://rork.com/faq) for platform-specific questions

## About Rork

Rork builds fully native mobile apps using React Native and Expo - the same technology stack used by Discord, Shopify, Coinbase, Instagram, and nearly 30% of the top 100 apps on the App Store.

Your Rork app is production-ready and can be published to both the App Store and Google Play Store. You can also export your app to run on the web, making it truly cross-platform.
