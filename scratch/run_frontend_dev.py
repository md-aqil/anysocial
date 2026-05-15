import pexpect
import sys

def run_sudo_commands(commands, password):
    full_cmd = " && ".join(commands)
    ssh_cmd = f"ssh -o StrictHostKeyChecking=no aqil@187.127.154.55 \"sudo -S bash -c '{full_cmd}'\""
    
    child = pexpect.spawn(ssh_cmd, encoding='utf-8')
    child.logfile = sys.stdout
    
    try:
        i = child.expect(['[Pp]assword:', '[P]assword:', pexpect.EOF, pexpect.TIMEOUT], timeout=30)
        if i in [0, 1]:
            child.sendline(password)
            # Wait for some time to see the output of the dev server
            child.expect(pexpect.EOF, timeout=120)
    except Exception as e:
        print(f"\nError: {e}")
    finally:
        child.close()

if __name__ == "__main__":
    password = "aqil@noon"
    
    # Stop the service and run npm run dev
    # We use -p 3000 to match the service
    commands = [
        "systemctl stop socialsched-frontend",
        "cd /var/www/socialsched/frontend && export NEXT_PUBLIC_API_URL=https://socialsched.vibeship.in && npm run dev -- -p 3000"
    ]
    run_sudo_commands(commands, password)
