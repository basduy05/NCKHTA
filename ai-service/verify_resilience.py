import sys
import os
import unittest
from unittest.mock import MagicMock, patch

# Add the app directory to sys.path
sys.path.append(os.path.join(os.getcwd(), "ai-service"))

from app.utils.resilience import retry

class TestResilience(unittest.TestCase):
    def test_retry_success(self):
        self.counter = 0
        
        @retry(tries=3, delay=0.1)
        def failing_func():
            self.counter += 1
            if self.counter < 3:
                raise ValueError("Temporary failure")
            return "Success"
            
        result = failing_func()
        self.assertEqual(result, "Success")
        self.assertEqual(self.counter, 3)

    def test_retry_exhausted(self):
        self.counter = 0
        
        @retry(tries=2, delay=0.1)
        def always_fails():
            self.counter += 1
            raise ValueError("Permanent failure")
            
        with self.assertRaises(ValueError):
            always_fails()
        self.assertEqual(self.counter, 2)

if __name__ == "__main__":
    unittest.main()
