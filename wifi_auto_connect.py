#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import subprocess
import socket
import time
import sys

SSID = "4G-MIFI-6663"
PASSWORD = "1234567890"


def has_internet():
    try:
        socket.create_connection(("8.8.8.8", 53), timeout=2)
        return True
    except:
        return False


def get_wifi():
    try:
        r = subprocess.run(["netsh", "wlan", "show", "interfaces"],
                           capture_output=True, text=True, encoding='cp866')
        for line in r.stdout.split('\n'):
            if "SSID" in line and "BSSID" not in line:
                return line.split(":")[1].strip()
        return None
    except:
        return None


def create_profile():
    xml = f'''<?xml version="1.0"?>
<WLANProfile xmlns="http://www.microsoft.com/networking/WLAN/profile/v1">
    <name>{SSID}</name>
    <SSIDConfig><SSID><name>{SSID}</name></SSID></SSIDConfig>
    <connectionType>ESS</connectionType>
    <connectionMode>auto</connectionMode>
    <MSM>
        <security>
            <authEncryption>
                <authentication>WPA2PSK</authentication>
                <encryption>AES</encryption>
            </authEncryption>
            <sharedKey>
                <keyType>passPhrase</keyType>
                <protected>false</protected>
                <keyMaterial>{PASSWORD}</keyMaterial>
            </sharedKey>
        </security>
    </MSM>
</WLANProfile>'''
    with open(f"{SSID}.xml", "w") as f:
        f.write(xml)
    subprocess.run(f"netsh wlan add profile filename=\"{SSID}.xml\"", shell=True)


def connect():
    subprocess.run(f"netsh wlan connect name=\"{SSID}\"", shell=True)


def main():
    print(f"Wi-Fi Monitor - {SSID}")
    create_profile()
    print("Monitoring... (Ctrl+C to stop)\n")

    last_connect = 0
    last_confirm = 0

    while True:
        now = time.time()
        internet = has_internet()
        wifi = get_wifi()

        if not internet:
            if now - last_connect > 10:  # Не чаще раза в 10 секунд
                print(f"\n[{time.strftime('%H:%M:%S')}] No internet (Wi-Fi: {wifi}) -> connecting to {SSID}")
                connect()
                last_connect = now
        else:
            if now - last_confirm > 30:  # Подтверждаем каждые 30 секунд
                print(f"[{time.strftime('%H:%M:%S')}] Internet OK (Wi-Fi: {wifi})")
                last_confirm = now
            else:
                # Просто показываем что работаем
                print(".", end="", flush=True)

        time.sleep(5)  # Проверяем каждые 5 секунд


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nStopped")