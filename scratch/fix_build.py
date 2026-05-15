import pexpect
import sys

def run_sudo_commands(commands, password):
    full_cmd = " && ".join(commands)
    ssh_cmd = f"ssh -o StrictHostKeyChecking=no aqil@187.127.154.55 \"sudo -S bash -c '{full_cmd}'\""
    
    child = pexpect.spawn(ssh_cmd, encoding='utf-8')
    child.logfile = sys.stdout
    
    try:
        i = child.expect(['[Pp]assword:', '[P]assword:', pexpect.EOF, pexpect.TIMEOUT], timeout=60)
        if i in [0, 1]:
            child.sendline(password)
            child.expect(pexpect.EOF, timeout=300)
    except Exception as e:
        print(e)
    finally:
        child.close()

if __name__ == "__main__":
    password = "aqil@noon"
    
    commands = [
        "cp -rT /tmp/socialsched_code /var/www/socialsched",
        "chown -R socialsched:socialsched-dev /var/www/socialsched",
        "cd /var/www/socialsched && npm run build",
        "systemctl restart socialsched-backend",
        "systemctl restart socialsched-frontend"
    ]
    run_sudo_commands(commands, password)
