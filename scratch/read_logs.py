import pexpect
import sys

ssh_cmd = "ssh -o StrictHostKeyChecking=no aqil@187.127.154.55 \"sudo -S bash -c 'journalctl -u socialsched-backend -n 200 --no-pager'\""

child = pexpect.spawn(ssh_cmd, encoding='utf-8', timeout=60)
child.logfile = sys.stdout

try:
    i = child.expect(['[Pp]assword:', '[P]assword:', pexpect.EOF, pexpect.TIMEOUT], timeout=15)
    if i in [0, 1]:
        child.sendline("aqil@noon")
        child.expect(pexpect.EOF, timeout=60)
except Exception as e:
    print(f"\n❌ Error: {e}")
finally:
    child.close()
