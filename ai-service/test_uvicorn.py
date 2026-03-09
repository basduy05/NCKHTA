import subprocess
result = subprocess.run(["python", "-m", "uvicorn", "app.main:app", "--port", "8008"], capture_output=True, text=True)
print("STDOUT:")
print(result.stdout)
print("STDERR:")
print(result.stderr)
