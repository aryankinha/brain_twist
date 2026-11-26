#!/usr/bin/env bash
set -euo pipefail

app=com.aryankinha.braintwist
adb install android/app/build/outputs/apk/release/app-release.apk

for display in '720x1280 360 1.25' '1080x2400 440 1.0'; do
  read -r dimensions density font_scale <<< "$display"
  echo "Android onboarding at $dimensions, density $density, font scale $font_scale"
  adb shell am force-stop "$app"
  adb shell wm size "$dimensions"
  adb shell wm density "$density"
  adb shell settings put system font_scale "$font_scale"
  adb shell am start -W -n "$app/.MainActivity"

  ready=false
  for ((attempt = 0; attempt < 15; attempt++)); do
    if adb shell uiautomator dump /sdcard/brain-twist-window.xml >/dev/null 2>&1; then
      ui=$(adb shell cat /sdcard/brain-twist-window.xml)
      if [[ "$ui" == *'Create your profile'* && "$ui" == *'Save'* ]]; then
        ready=true
        break
      fi
    fi
    sleep 1
  done
  if [[ "$ready" == false ]]; then
    adb logcat -d -t 250 ReactNativeJS:E AndroidRuntime:E '*:S'
    echo "Brain Twist onboarding did not become accessible at $dimensions" >&2
    exit 1
  fi
done
