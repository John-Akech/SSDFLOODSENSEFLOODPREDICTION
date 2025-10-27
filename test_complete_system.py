"""
FloodSense Complete System Test
Tests all components: Backend, Frontend, ee-fastapi
"""
import requests
import time
import sys

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    END = '\033[0m'

def print_header(text):
    print(f"\n{Colors.BLUE}{'='*60}{Colors.END}")
    print(f"{Colors.BLUE}{text.center(60)}{Colors.END}")
    print(f"{Colors.BLUE}{'='*60}{Colors.END}\n")

def test_service(name, url, expected_keys=None):
    """Test if a service is running and responding"""
    try:
        response = requests.get(url, timeout=5)
        if response.status_code == 200:
            data = response.json()
            if expected_keys:
                missing = [k for k in expected_keys if k not in data]
                if missing:
                    print(f"{Colors.YELLOW}[WARN]{Colors.END} {name}: Missing keys {missing}")
                    return False
            print(f"{Colors.GREEN}[PASS]{Colors.END} {name} is running")
            return True
        else:
            print(f"{Colors.RED}[FAIL]{Colors.END} {name}: Status {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print(f"{Colors.RED}[FAIL]{Colors.END} {name}: Not running (Connection refused)")
        return False
    except Exception as e:
        print(f"{Colors.RED}[FAIL]{Colors.END} {name}: {str(e)}")
        return False

def test_backend_api():
    """Test Backend ML API"""
    print_header("Testing Backend API (Port 8000)")
    
    # Health check
    if not test_service("Backend Health", "http://localhost:8000/health", ["status", "models_loaded"]):
        return False
    
    # Root endpoint
    if not test_service("Backend Root", "http://localhost:8000/", ["message", "version"]):
        return False
    
    # API docs
    try:
        response = requests.get("http://localhost:8000/docs", timeout=5)
        if response.status_code == 200:
            print(f"{Colors.GREEN}[PASS]{Colors.END} API Documentation accessible")
        else:
            print(f"{Colors.YELLOW}[WARN]{Colors.END} API docs returned {response.status_code}")
    except:
        print(f"{Colors.RED}[FAIL]{Colors.END} API docs not accessible")
        return False
    
    return True

def test_sar_api():
    """Test SAR Detection API"""
    print_header("Testing SAR Detection API (Port 8080)")
    
    # Health check
    if not test_service("SAR Health", "http://localhost:8080/health", ["status", "gee_initialized"]):
        return False
    
    # UI endpoint
    try:
        response = requests.get("http://localhost:8080/", timeout=5)
        if response.status_code == 200 and "FloodSense" in response.text:
            print(f"{Colors.GREEN}[PASS]{Colors.END} SAR UI is accessible")
        else:
            print(f"{Colors.RED}[FAIL]{Colors.END} SAR UI not loading correctly")
            return False
    except:
        print(f"{Colors.RED}[FAIL]{Colors.END} SAR UI not accessible")
        return False
    
    return True

def test_frontend():
    """Test Frontend React App"""
    print_header("Testing Frontend (Port 3000)")
    
    try:
        response = requests.get("http://localhost:3000/", timeout=5)
        if response.status_code == 200:
            if "FloodSense" in response.text or "vite" in response.text.lower():
                print(f"{Colors.GREEN}[PASS]{Colors.END} Frontend is running")
                return True
            else:
                print(f"{Colors.YELLOW}[WARN]{Colors.END} Frontend running but content unexpected")
                return True
        else:
            print(f"{Colors.RED}[FAIL]{Colors.END} Frontend returned {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print(f"{Colors.RED}[FAIL]{Colors.END} Frontend not running")
        return False
    except Exception as e:
        print(f"{Colors.RED}[FAIL]{Colors.END} Frontend error: {str(e)}")
        return False

def test_integration():
    """Test integration between services"""
    print_header("Testing Service Integration")
    
    # Test CORS - Backend should allow frontend
    try:
        response = requests.options(
            "http://localhost:8000/health",
            headers={"Origin": "http://localhost:3000"}
        )
        if response.status_code in [200, 204]:
            print(f"{Colors.GREEN}[PASS]{Colors.END} Backend CORS configured for frontend")
        else:
            print(f"{Colors.YELLOW}[WARN]{Colors.END} Backend CORS may have issues")
    except:
        print(f"{Colors.YELLOW}[WARN]{Colors.END} Could not test CORS")
    
    # Test SAR CORS
    try:
        response = requests.options(
            "http://localhost:8080/health",
            headers={"Origin": "http://localhost:3000"}
        )
        if response.status_code in [200, 204]:
            print(f"{Colors.GREEN}[PASS]{Colors.END} SAR CORS configured for frontend")
        else:
            print(f"{Colors.YELLOW}[WARN]{Colors.END} SAR CORS may have issues")
    except:
        print(f"{Colors.YELLOW}[WARN]{Colors.END} Could not test SAR CORS")
    
    return True

def main():
    print(f"\n{Colors.BLUE}{'='*60}{Colors.END}")
    print(f"{Colors.BLUE}{'FloodSense System Test'.center(60)}{Colors.END}")
    print(f"{Colors.BLUE}{'BSc. Software Engineering - John Akech'.center(60)}{Colors.END}")
    print(f"{Colors.BLUE}{'='*60}{Colors.END}")
    
    results = {
        "Backend API": test_backend_api(),
        "SAR Detection": test_sar_api(),
        "Frontend": test_frontend(),
        "Integration": test_integration()
    }
    
    # Summary
    print_header("Test Summary")
    passed = sum(results.values())
    total = len(results)
    
    for name, result in results.items():
        status = f"{Colors.GREEN}PASS{Colors.END}" if result else f"{Colors.RED}FAIL{Colors.END}"
        print(f"{name:20} [{status}]")
    
    print(f"\n{Colors.BLUE}{'='*60}{Colors.END}")
    if passed == total:
        print(f"{Colors.GREEN}ALL TESTS PASSED ({passed}/{total}){Colors.END}")
        print(f"{Colors.GREEN}System is ready for deployment! 🚀{Colors.END}")
        sys.exit(0)
    else:
        print(f"{Colors.RED}SOME TESTS FAILED ({passed}/{total}){Colors.END}")
        print(f"{Colors.YELLOW}Please check failed services and restart them{Colors.END}")
        sys.exit(1)

if __name__ == "__main__":
    print(f"\n{Colors.YELLOW}NOTE: Make sure all services are running:{Colors.END}")
    print(f"  1. Backend:  cd backend/app && python main.py")
    print(f"  2. SAR:      cd ee-fastapi && python app.py")
    print(f"  3. Frontend: cd frontend && npm run dev")
    print(f"\nOr run: START_SYSTEM.bat\n")
    
    input("Press Enter to start testing...")
    main()
