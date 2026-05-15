import pexpect
import sys

password = "aqil@noon"
cmd = "rsync -avz --exclude 'node_modules' --exclude '.git' --exclude '.env' --exclude 'tunnel-config' -e 'ssh -o StrictHostKeyChecking=no' /Users/mdaqil/Documents/socialsched.vibeship.in/ aqil@187.127.154.55:/tmp/socialsched_code"

print("Syncing files...")
child = pexpect.spawn(cmd, encoding='utf-8', timeout=600)
child.logfile = sys.stdout

try:
    i = child.expect(['[Pp]assword:', '[P]assword:', pexpect.EOF, pexpect.TIMEOUT])
    if i in [0, 1]:
        child.sendline(password)
        child.expect(pexpect.EOF, timeout=600)
except Exception as e:
    print(f"\nError: {e}")
finally:
    child.close()
