# FloodSense Deployment Plan

This document outlines the plan for deploying the FloodSense application to DigitalOcean.

## 1. Infrastructure on DigitalOcean

The following resources will be created on DigitalOcean:

*   **Droplet:** A single Droplet will be used to host the application services.
    *   **Image:** Docker on Ubuntu 22.04 (or a similar Docker-ready image).
    *   **Plan:** Basic (4GB RAM, 2vCPUs) - to be adjusted based on performance monitoring.
*   **Managed PostgreSQL Database:** A managed PostgreSQL database will be used for the backend data store, replacing the local SQLite database.
*   **Container Registry:** A private container registry will be used to store the Docker images for the `backend`, `sar-detection`, and `frontend` services.
*   **Firewall:** A firewall will be configured to control inbound traffic to the Droplet, only allowing HTTP (port 80), HTTPS (port 443), and SSH (port 22).
*   **Domain & DNS:** A domain name will be configured with A records pointing to the Droplet's IP address.

## 2. CI/CD Pipeline with GitHub Actions

A CI/CD pipeline will be set up using GitHub Actions to automate the build and deployment process. The workflow will be triggered on pushes to the `master` branch.

### Workflow Steps:

1.  **Build and Push Docker Images:**
    *   Check out the repository.
    *   Log in to the DigitalOcean Container Registry.
    *   Build, tag, and push the Docker images for `backend`, `sar-detection`, and `frontend` to the registry. Images will be tagged with the Git commit SHA.

2.  **Deploy to Droplet:**
    *   SSH into the Droplet.
    *   Navigate to the application directory.
    *   Pull the latest Docker images from the registry.
    *   Run `docker-compose up -d` to restart the services with the new images.

## 3. Manual Deployment Steps (First-Time Setup)

The following steps will be performed manually for the initial setup:

1.  **Provision DigitalOcean Resources:**
    *   Create the Droplet, Managed PostgreSQL Database, and Container Registry.
    *   Configure the firewall.
    *   Set up the domain and DNS records.

2.  **Configure the Droplet:**
    *   Install Docker and Docker Compose.
    *   Clone the application repository from GitHub.
    *   Create a `.env` file in the application directory to store environment variables (database credentials, secret keys, etc.).
    *   Create a `docker-compose.prod.yml` file with production-specific configurations, including the PostgreSQL database connection string and references to the images in the container registry.

3.  **Initial Application Launch:**
    *   Manually build and push the Docker images to the container registry for the first time.
    *   Run `docker-compose -f docker-compose.prod.yml up -d` to start the application.

## 4. Secrets Management

All sensitive information, such as the `SECRET_KEY`, database credentials, and API keys, will be managed using environment variables on the Droplet and passed to the Docker containers. A `.env` file will be used to store these variables, and this file will be excluded from version control.
