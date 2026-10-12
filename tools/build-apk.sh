#!/usr/bin/env bash
# Збирає Android APK (WebView + гра з game/ всередині, працює без інтернету).
# Потрібні: Java 17+, Maven, Python 3, Node. Інструменти Android качаються з Maven Central:
#   aapt2 + ресурси фреймворку (з apktool-lib), smali (classes.dex), apksig (підпис).
# Результат: dist/chotyry-kuty.apk
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TOOLS="${TOOLS:-$HOME/.cache/chotyry-kuty-android}"
BUILD="$ROOT/build/android"
KS="$ROOT/android/chotyry-kuty.p12"
KS_PASS="chotyrykuty"
mkdir -p "$TOOLS" "$ROOT/dist"

# --- інструменти
if [ ! -x "$TOOLS/aapt2" ]; then
  echo "• завантажую інструменти…"
  cat > "$TOOLS/pom.xml" <<'POM'
<project xmlns="http://maven.apache.org/POM/4.0.0"><modelVersion>4.0.0</modelVersion>
<groupId>local</groupId><artifactId>tools</artifactId><version>1</version>
<dependencies>
  <dependency><groupId>org.smali</groupId><artifactId>smali</artifactId><version>2.5.2</version></dependency>
  <dependency><groupId>com.android.tools.build</groupId><artifactId>apksig</artifactId><version>2.3.0</version></dependency>
</dependencies></project>
POM
  (cd "$TOOLS" && mvn -q -B dependency:copy-dependencies -DoutputDirectory=lib)
  curl -fsSL -o "$TOOLS/apktool-lib.jar" https://repo1.maven.org/maven2/org/apktool/apktool-lib/3.0.3/apktool-lib-3.0.3.jar
  (cd "$TOOLS" && unzip -o -q apktool-lib.jar prebuilt/linux/aapt2 prebuilt/android-framework.jar \
    && mv prebuilt/linux/aapt2 aapt2 && mv prebuilt/android-framework.jar android-framework.jar && rm -rf prebuilt && chmod +x aapt2)
fi
CP="$TOOLS/lib/*"

# --- підготовка
rm -rf "$BUILD" && mkdir -p "$BUILD/assets/www"
(cd "$ROOT/game" && cp -r index.html css js fonts icons manifest.webmanifest "$BUILD/assets/www/")

# --- ресурси й маніфест
"$TOOLS/aapt2" compile --dir "$ROOT/android/res" -o "$BUILD/res.zip"
"$TOOLS/aapt2" link -o "$BUILD/base.apk" -I "$TOOLS/android-framework.jar" \
  --manifest "$ROOT/android/AndroidManifest.xml" -A "$BUILD/assets" "$BUILD/res.zip"

# --- код
java -cp "$CP" org.jf.smali.Main assemble --api 24 -o "$BUILD/classes.dex" "$ROOT/android/smali"

# --- додати classes.dex і вирівняти нестиснені файли по 4 байти (як zipalign)
python3 - "$BUILD/base.apk" "$BUILD/classes.dex" "$BUILD/unsigned.apk" <<'PY'
import sys, zipfile
src, dex, out = sys.argv[1:4]
zin = zipfile.ZipFile(src)
with zipfile.ZipFile(out, 'w') as zout:
    items = [(i, zin.read(i.filename)) for i in zin.infolist()]
    items.append((zipfile.ZipInfo('classes.dex', (2008, 1, 1, 0, 0, 0)), open(dex, 'rb').read()))
    for info, data in items:
        zi = zipfile.ZipInfo(info.filename, info.date_time)
        stored = info.compress_type == zipfile.ZIP_STORED or info.filename == 'resources.arsc'
        zi.compress_type = zipfile.ZIP_STORED if stored else zipfile.ZIP_DEFLATED
        zi.external_attr = info.external_attr
        if stored:
            off = zout.fp.tell() + 30 + len(zi.filename.encode())
            zi.extra = b'\0' * ((4 - off % 4) % 4)
        zout.writestr(zi, data)
PY

# --- підпис (схема v2)
if [ ! -f "$KS" ]; then
  keytool -genkeypair -keystore "$KS" -storetype PKCS12 -storepass "$KS_PASS" -alias ck \
    -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Chotyry Kuty" >/dev/null 2>&1
fi
javac -nowarn -cp "$CP" -d "$BUILD" "$ROOT/android/Sign.java"
java --add-exports java.base/sun.security.x509=ALL-UNNAMED --add-exports java.base/sun.security.pkcs=ALL-UNNAMED --add-exports java.base/sun.security.util=ALL-UNNAMED \
  -cp "$BUILD:$CP" Sign "$KS" "$KS_PASS" ck "$BUILD/unsigned.apk" "$ROOT/dist/chotyry-kuty.apk"
ls -la "$ROOT/dist/chotyry-kuty.apk"
