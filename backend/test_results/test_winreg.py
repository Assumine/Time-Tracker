import winreg

uninstall_keys = [
    r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall",
    r"SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall"
]

results = []

for key_path in uninstall_keys:
    try:
        with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, key_path) as key:
            for i in range(winreg.QueryInfoKey(key)[0]):
                subkey_name = winreg.EnumKey(key, i)
                with winreg.OpenKey(key, subkey_name) as subkey:
                    try:
                        name = winreg.QueryValueEx(subkey, "DisplayName")[0]
                        version = winreg.QueryValueEx(subkey, "DisplayVersion")[0]
                        install_location = winreg.QueryValueEx(subkey, "InstallLocation")[0]
                        results.append({
                            "name": name,
                            "version": version,
                            "install_location": install_location
                        })
                    except FileNotFoundError:
                        continue
                    except Exception as e:
                        print(f"Error: {e}")
                        continue
    except Exception as e:
        print(f"Error: {e}")
        continue

print(results[:5])