import pexpect
import sys

def add_ssh_key(pub_key, password):
    ssh_cmd = f"ssh -o StrictHostKeyChecking=no aqil@187.127.154.55 \"mkdir -p ~/.ssh && echo '{pub_key}' >> ~/.ssh/authorized_keys && chmod 700 ~/.ssh && chmod 600 ~/.ssh/authorized_keys\""
    
    child = pexpect.spawn(ssh_cmd, encoding='utf-8')
    child.logfile = sys.stdout
    
    try:
        i = child.expect(['[Pp]assword:', pexpect.EOF, pexpect.TIMEOUT], timeout=30)
        if i == 0:
            child.sendline(password)
            child.expect(pexpect.EOF, timeout=30)
            print("\nKey added successfully.")
        elif i == 1:
            print("\nConnection closed or key already added without password.")
    except Exception as e:
        print(f"\nError: {e}")
    finally:
        child.close()

if __name__ == "__main__":
    pub_key = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAINhCmWO9BmlhKxLAAhmcXV4fL+EeyLRPpo5jv8KdFj8+ mdaqil@Mds-MacBook-Pro-2.local"
    password = "aqil@noon"
    add_ssh_key(pub_key, password)
