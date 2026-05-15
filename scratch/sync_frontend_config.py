import pexpect
import sys
import os

def run_scp(src, dest):
    os.system(f"scp /Users/mdaqil/Documents/socialsched.vibeship.in/{src} {dest}")

def run_sudo_commands(commands, password):
    full_cmd = " && ".join(commands)
    ssh_cmd = f"ssh -o StrictHostKeyChecking=no aqil@187.127.154.55 \"sudo -S bash -c '{full_cmd}'\""
    
    child = pexpect.spawn(ssh_cmd, encoding='utf-8')
    child.logfile = sys.stdout
    
    try:
        i = child.expect(['[Pp]assword:', '[P]assword:', pexpect.EOF, pexpect.TIMEOUT], timeout=30)
        if i in [0, 1]:
            child.sendline(password)
            child.expect(pexpect.EOF, timeout=60)
    except Exception as e:
        print(f"\nError: {e}")
    finally:
        child.close()

if __name__ == "__main__":
    password = "aqil@noon"
    run_scp("frontend/next.config.js", "aqil@187.127.154.55:/tmp/next.config.js")
    
    commands = [
        "mv /tmp/next.config.js /var/www/socialsched/frontend/next.config.js",
        "chown socialsched:socialsched-dev /var/www/socialsched/frontend/next.config.js",
        "systemctl restart socialsched-frontend",
        "systemctl status socialsched-frontend --no-pager"
    ]
    run_sudo_commands(commands, password)
