# AISER Authentication Service

This is the authentication service for AISER. It is a microservice-based project that provides email and password-based authentication, email verification, and user invitation via email.

## Features

- **Email Password-Based Authentication**: Secure authentication using email and password.
- **Email Verification**: Verify user email addresses to ensure valid and active email accounts.
- **Invite User via Email**: Send invitations to users via email to join the platform.
- **Microservice Architecture**: Designed as a microservice to ensure scalability and maintainability.

## Getting Started

### Clone Repository

```sh
git clone git@github.com:bigstack-analytics/authentication.git
```

### Setup Environment

#### Using Conda

1. Install [Miniconda](https://docs.conda.io/en/latest/miniconda.html) if you don't have it installed.
2. Create a new conda environment:

   ```sh
   conda create --name aiser-authentication python=3.8
   ```

3. Activate the conda environment:

   ```sh
   conda activate aiser-authentication
   ```

4. Install dependencies:

   ```sh
   pip install -e .
   pip install -r requirements.txt
   ```

#### Using Virtual Environment

1. Create a virtual environment:

   ```sh
   python -m venv venv
   ```

2. Activate the virtual environment:

   ```sh
   ## Linux
   source venv/bin/activate

   ## Windows
   venv\Scripts\activate
   ```

3. Install dependencies:

   ```sh
   pip install -e .
   pip install -r requirements.txt
   ```

### Start Server

```sh
fastrun start
```

### Database Migrations

#### Create a New Migration

```sh
fastrun db revision -m "message"
```

#### Apply Migrations

```sh
fastrun db upgrade
```

#### Rollback Migrations

```sh
fastrun db downgrade "revision_id"
```

## Configuration

Configuration is managed using environment variables. Refer to the `.env.example` file for the required configuration variables.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
