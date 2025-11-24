#!/usr/bin/env python3
"""
FloodSense System Health Check
Verifies all services are running and properly configured
"""

import sys
import requests
import json
from typing import Dict, List, Tuple
from datetime import datetime
import os

# Color codes for terminal output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'


class HealthChecker:
    def __init__(self, base_url: str = "http://localhost"):
        self.base_url = base_url
        self.results: List[Dict] = []
        self.passed = 0
        self.failed = 0
        self.warnings = 0

    def check(self, name: str, url: str, expected_status: int = 200,
              timeout: int = 5, check_json: bool = True) -> bool:
        """Perform a health check on a service endpoint"""
        print(f"\n🔍 Checking {name}...", end=" ")

        try:
            response = requests.get(url, timeout=timeout)

            if response.status_code == expected_status:
                print(f"{GREEN}✓ PASS{RESET}")

                if check_json:
                    try:
                        data = response.json()
                        print(
                            f"   Response: {json.dumps(data, indent=2)[:200]}")
                    except:
                        pass

                self.passed += 1
                self.results.append({
                    "service": name,
                    "status": "PASS",
                    "url": url,
                    "response_time": response.elapsed.total_seconds()
                })
                return True
            else:
                print(f"{RED}✗ FAIL{RESET} (Status: {response.status_code})")
                self.failed += 1
                self.results.append({
                    "service": name,
                    "status": "FAIL",
                    "url": url,
                    "error": f"Unexpected status: {response.status_code}"
                })
                return False

        except requests.exceptions.Timeout:
            print(f"{RED}✗ FAIL{RESET} (Timeout)")
            self.failed += 1
            self.results.append({
                "service": name,
                "status": "FAIL",
                "url": url,
                "error": "Connection timeout"
            })
            return False

        except requests.exceptions.ConnectionError:
            print(f"{RED}✗ FAIL{RESET} (Connection refused)")
            self.failed += 1
            self.results.append({
                "service": name,
                "status": "FAIL",
                "url": url,
                "error": "Connection refused - service may not be running"
            })
            return False

        except Exception as e:
            print(f"{RED}✗ FAIL{RESET} ({str(e)})")
            self.failed += 1
            self.results.append({
                "service": name,
                "status": "FAIL",
                "url": url,
                "error": str(e)
            })
            return False

    def check_env_vars(self) -> bool:
        """Check critical environment variables"""
        print(f"\n{BLUE}=== Environment Variables ==={RESET}")

        required_vars = [
            "DATABASE_URL",
            "SECRET_KEY",
            "SAR_SERVICE_URL",
            "GEE_PROJECT_ID"
        ]

        optional_vars = [
            "VAPID_PUBLIC_KEY",
            "VAPID_PRIVATE_KEY",
            "CORS_ORIGINS"
        ]

        all_good = True

        # Check required variables
        for var in required_vars:
            value = os.getenv(var)
            if value:
                # Mask sensitive values
                display_value = value if var not in [
                    'SECRET_KEY', 'DATABASE_URL'] else f"{value[:10]}...***"
                print(f"{GREEN}✓{RESET} {var}: {display_value}")
            else:
                print(f"{RED}✗{RESET} {var}: NOT SET (Required)")
                all_good = False
                self.failed += 1

        # Check optional variables
        for var in optional_vars:
            value = os.getenv(var)
            if value:
                display_value = value if var not in [
                    'VAPID_PRIVATE_KEY'] else "***"
                print(f"{GREEN}✓{RESET} {var}: {display_value[:50]}...")
            else:
                print(f"{YELLOW}⚠{RESET} {var}: NOT SET (Optional)")
                self.warnings += 1

        return all_good

    def run_comprehensive_check(self):
        """Run all health checks"""
        print(f"\n{BLUE}{'='*60}{RESET}")
        print(f"{BLUE}FloodSense System Health Check{RESET}")
        print(f"{BLUE}{'='*60}{RESET}")
        print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")

        # Environment variables
        self.check_env_vars()

        # Core services health
        print(f"\n{BLUE}=== Core Services Health ==={RESET}")

        self.check(
            "Backend API",
            f"{self.base_url}:8000/health"
        )

        self.check(
            "SAR Detection Service",
            f"{self.base_url}:8080/health"
        )

        self.check(
            "Frontend",
            f"{self.base_url}:80/health"
        )

        # API Documentation
        print(f"\n{BLUE}=== API Documentation ==={RESET}")

        self.check(
            "Backend API Docs",
            f"{self.base_url}:8000/docs",
            check_json=False
        )

        self.check(
            "SAR API Docs",
            f"{self.base_url}:8080/docs",
            check_json=False
        )

        # Service integration tests
        print(f"\n{BLUE}=== Service Integration ==={RESET}")

        # Check GEE status
        self.check(
            "Google Earth Engine Status",
            f"{self.base_url}:8080/gee/status"
        )

        # Test backend root endpoint
        self.check(
            "Backend Root Endpoint",
            f"{self.base_url}:8000/"
        )

        # Database connectivity (through backend)
        print(f"\n🔍 Checking Database Connectivity...", end=" ")
        try:
            response = requests.get(f"{self.base_url}:8000/health", timeout=5)
            if response.status_code == 200:
                data = response.json()
                if data.get("status") == "healthy":
                    print(f"{GREEN}✓ PASS{RESET}")
                    self.passed += 1
                else:
                    print(f"{RED}✗ FAIL{RESET}")
                    self.failed += 1
            else:
                print(f"{RED}✗ FAIL{RESET}")
                self.failed += 1
        except Exception as e:
            print(f"{RED}✗ FAIL{RESET} ({str(e)})")
            self.failed += 1

        # Model loading check
        print(f"🔍 Checking ML Models...", end=" ")
        try:
            response = requests.get(f"{self.base_url}:8000/health", timeout=5)
            if response.status_code == 200:
                data = response.json()
                if data.get("models_loaded"):
                    print(f"{GREEN}✓ PASS{RESET} (Models loaded successfully)")
                    self.passed += 1
                else:
                    print(f"{YELLOW}⚠ WARNING{RESET} (Models not loaded)")
                    self.warnings += 1
            else:
                print(f"{RED}✗ FAIL{RESET}")
                self.failed += 1
        except Exception as e:
            print(f"{RED}✗ FAIL{RESET} ({str(e)})")
            self.failed += 1

        # Print summary
        self.print_summary()

    def print_summary(self):
        """Print test summary"""
        print(f"\n{BLUE}{'='*60}{RESET}")
        print(f"{BLUE}Test Summary{RESET}")
        print(f"{BLUE}{'='*60}{RESET}")
        print(f"{GREEN}Passed:{RESET} {self.passed}")
        print(f"{RED}Failed:{RESET} {self.failed}")
        print(f"{YELLOW}Warnings:{RESET} {self.warnings}")
        print(f"Total Tests: {self.passed + self.failed}")

        if self.failed == 0:
            print(f"\n{GREEN}✓ All services are healthy!{RESET}")
            return 0
        else:
            print(f"\n{RED}✗ Some services failed health checks{RESET}")
            print(f"\n{YELLOW}Troubleshooting tips:{RESET}")
            print(f"1. Check if all containers are running: docker-compose ps")
            print(f"2. View logs: docker-compose logs -f")
            print(f"3. Verify .env file configuration")
            print(f"4. Ensure all required ports are available")
            return 1


def main():
    """Main entry point"""
    import argparse

    parser = argparse.ArgumentParser(
        description="FloodSense System Health Check")
    parser.add_argument(
        "--host",
        default="http://localhost",
        help="Base URL for services (default: http://localhost)"
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Output results in JSON format"
    )

    args = parser.parse_args()

    checker = HealthChecker(base_url=args.host)
    checker.run_comprehensive_check()

    if args.json:
        print(f"\n{json.dumps(checker.results, indent=2)}")

    sys.exit(checker.failed)


if __name__ == "__main__":
    main()
