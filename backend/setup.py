from setuptools import setup, find_packages

setup(
    name="flood-sense-backend",
    version="1.0.0",
    packages=find_packages(),
    author="John Akech",
    author_email="john.akech@example.com",
    description="The backend service for the FloodSense application.",
    install_requires=[
        # Add dependencies from requirements.txt if any are not just for dev
    ],
    entry_points={
        'console_scripts': [
            'create_locust_user=scripts.create_locust_user:create_test_user',
        ],
    },
)
