# GitHub Actions Setup

This project has been converted from Bitbucket Pipelines to GitHub Actions. The workflow will automatically deploy to production on every push to the `master` branch.

## Required GitHub Secrets

You need to configure the following secrets in your GitHub repository:

1. **SSH_PRIVATE_KEY_BASE64**: Your SSH private key encoded in base64 for connecting to the deployment server
2. **DEPLOY_USER**: Username for SSH connection to the deployment server
3. **DEPLOY_HOST**: Hostname or IP address of the deployment server
4. **DEPLOY_PATH**: Path on the deployment server where the application should be deployed

## How to Set Up Secrets

1. Go to your GitHub repository
2. Click on **Settings** tab
3. In the left sidebar, click **Secrets and variables** → **Actions**
4. Click **New repository secret** for each required secret
5. Add the secrets with the exact names listed above

## SSH Key Setup

1. Generate an SSH key pair if you don't have one:
   ```bash
   ssh-keygen -t rsa -b 4096 -C "your-email@example.com"
   ```

2. Add the public key to your deployment server's `~/.ssh/authorized_keys`:
   ```bash
   ssh-copy-id -i ~/.ssh/id_rsa.pub user@your-server
   ```

3. Encode the private key in base64 and add it as the `SSH_PRIVATE_KEY_BASE64` secret in GitHub:
   ```bash
   cat ~/.ssh/id_rsa | base64 -w 0
   ```

## Workflow Details

The GitHub Action workflow:
- Runs on every push to the `master` branch
- Uses Ubuntu latest runner
- Sets up Node.js 18 with npm caching
- Installs project dependencies
- Compiles TypeScript code
- Deploys to your server using rsync
- Installs dependencies on the server
- Reloads the PM2 process

## Differences from Bitbucket Pipeline

- **Trigger**: Changed from `dev` branch to `master` branch
- **SSH Setup**: Uses GitHub's SSH agent action for secure key management
- **Known Hosts**: Automatically adds the deployment server to known hosts
- **Caching**: Added npm dependency caching for faster builds
- **Security**: Uses GitHub secrets instead of Bitbucket variables

## Troubleshooting

- Ensure your SSH key has the correct permissions on the deployment server
- Verify the deployment path exists and is writable
- Check that PM2 is installed and configured on the deployment server
- Ensure the deployment user has the necessary permissions