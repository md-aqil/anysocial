import pexpect
import sys
import os

def run_sudo_commands(commands, password):
    full_cmd = " && ".join(commands)
    ssh_cmd = f"ssh -o StrictHostKeyChecking=no aqil@187.127.154.55 \"sudo -S bash -c '{full_cmd}'\""
    
    print(f"Running deployment commands on VPS...")
    child = pexpect.spawn(ssh_cmd, encoding='utf-8')
    child.logfile = sys.stdout
    
    try:
        i = child.expect(['[Pp]assword:', '[P]assword:', pexpect.EOF, pexpect.TIMEOUT], timeout=120)
        if i in [0, 1]:
            child.sendline(password)
            # Use larger timeout since npm install takes time
            child.expect(pexpect.EOF, timeout=600)
            print("\nDeployment step complete.")
        else:
            print("\nCould not find password prompt or connection closed.")
    except Exception as e:
        print(f"\nAn error occurred: {e}")
    finally:
        child.close()

if __name__ == "__main__":
    password = "aqil@noon"
    
    # 0. Onboarding
    print("Setting up users and directories...")
    onboarding_commands = [
        "systemctl stop postiz || true",
        "systemctl disable postiz || true",
        "rm -f /etc/systemd/system/postiz.service",
        "rm -f /etc/nginx/sites-enabled/postiz",
        "rm -f /etc/nginx/sites-available/postiz",
        "systemctl daemon-reload",
        
        "groupadd -f socialsched-dev",
        "useradd -r -s /usr/sbin/nologin -g socialsched-dev socialsched || true",
        "usermod -aG socialsched-dev aqil",
        "usermod -aG docker socialsched || true",
        "mkdir -p /var/www/socialsched /etc/socialsched",
        "chown -R socialsched:socialsched-dev /var/www/socialsched /etc/socialsched",
        "chmod 775 /var/www/socialsched",
        "chmod 750 /etc/socialsched"
    ]
    run_sudo_commands(onboarding_commands, password)

    # 1. Transfer files
    print("Transferring configuration files...")
    os.system("scp /Users/mdaqil/Documents/socialsched.vibeship.in/scratch/socialsched_vps.env aqil@187.127.154.55:/tmp/.env.socialsched")
    os.system("scp /Users/mdaqil/Documents/socialsched.vibeship.in/scratch/docker-compose.yml aqil@187.127.154.55:/tmp/docker-compose.yml")
    os.system("scp /Users/mdaqil/Documents/socialsched.vibeship.in/scratch/socialsched-backend.service aqil@187.127.154.55:/tmp/socialsched-backend.service")
    os.system("scp /Users/mdaqil/Documents/socialsched.vibeship.in/scratch/socialsched-frontend.service aqil@187.127.154.55:/tmp/socialsched-frontend.service")
    os.system("scp /Users/mdaqil/Documents/socialsched.vibeship.in/scratch/socialsched-nginx.conf aqil@187.127.154.55:/tmp/socialsched-nginx.conf")
    
    # 2. Deploy configs and services
    deployment_commands = [
        "mv /tmp/.env.socialsched /etc/socialsched/.env",
        "chown root:socialsched-dev /etc/socialsched/.env",
        "chmod 640 /etc/socialsched/.env",
        
        "mv /tmp/docker-compose.yml /var/www/socialsched/docker-compose.yml",
        "mv /tmp/socialsched-backend.service /etc/systemd/system/",
        "mv /tmp/socialsched-frontend.service /etc/systemd/system/",
        "mv /tmp/socialsched-nginx.conf /etc/nginx/sites-available/socialsched",
        
        "cp -rT /tmp/socialsched_code /var/www/socialsched",
        "ln -sf /etc/socialsched/.env /var/www/socialsched/.env",
        "chown -R socialsched:socialsched-dev /var/www/socialsched",
        "chmod -R 775 /var/www/socialsched",
        
        # Start DB & Cache
        "cd /var/www/socialsched && docker compose up -d && sleep 10",
        
        # Build Backend
        "cd /var/www/socialsched && npm cache clean --force && npm install --legacy-peer-deps && npm run db:generate && npx prisma db push --accept-data-loss && npm run build",
        
        # Build Frontend
        "cd /var/www/socialsched/frontend && npm install && npm run build",
        
        # Set Nginx
        "ln -sf /etc/nginx/sites-available/socialsched /etc/nginx/sites-enabled/socialsched",
        "nginx -t",
        "systemctl reload nginx",
        
        # Start Backend and Frontend
        "systemctl daemon-reload",
        "systemctl enable socialsched-backend",
        "systemctl enable socialsched-frontend",
        "systemctl restart socialsched-backend",
        "systemctl restart socialsched-frontend"
    ]
    
    run_sudo_commands(deployment_commands, password)
