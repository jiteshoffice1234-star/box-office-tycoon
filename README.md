# Box Office Tycoon 🎬

A movie studio management sim — write scripts, negotiate with stars, fund productions, let marketing run itself, and turn your indie into a Global Major.

## Play it

- **Android APK**: download the latest release from the [Releases page](https://github.com/jiteshoffice1234-star/box-office-tycoon/releases/latest) and sideload it (`app-release.apk`). Enable "install from unknown sources" when prompted.
- **Web**: `npm run dev` then open http://localhost:5173, or serve the production build (`npm run build` + `npm run preview`).

## Features

- Weekly time loop, studio reputation tiers (Indie → Global Major)
- Scripts (write your own or buy specs), talent market with negotiation
- 6-department production funding, automatic marketing campaigns
- Hype drives the box office: 50 hype = ×2, 100 hype = **×100** opening
- 5-month theatrical runs, awards, franchises/sequels
- 3 AI rival studios; loans and investments with **your** terms — no limits on amounts or count
- **Hire managers**: they take a weekly salary and run the whole pipeline themselves, one movie after another
- No limits on money — balances scale up to sextillions
- Auto-saves to localStorage

## Build

```bash
npm install
npm run build        # web build into dist/
npm run verify       # economy + finance assertions
```

### Android APK

```bash
npx cap sync android        # copy dist/ into the Android project
cd android && ./gradlew assembleRelease   # needs JDK 17+ and Android SDK
```

The APK lands at `android/app/build/outputs/apk/release/app-release.apk`.

Every `v*` tag triggers a [GitHub Actions workflow](.github/workflows/build-apk.yml) that builds the APK on GitHub's runners and attaches it to the release, so anyone can download the game without building anything.
