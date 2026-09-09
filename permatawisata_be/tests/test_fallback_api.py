import os
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))

from app import app


class FallbackApiTestCase(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()

    def test_villas_endpoint_returns_fallback_data_when_db_is_unavailable(self):
        with patch('routes.detailvillas.get_db_connection', side_effect=RuntimeError('db down')):
            response = self.client.get('/api/villas')

        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertIsInstance(data, list)
        self.assertGreaterEqual(len(data), 1)
        self.assertIn('name', data[0])

    def test_villa_detail_endpoint_returns_fallback_data_when_db_is_unavailable(self):
        with patch('routes.detailvillas.get_db_connection', side_effect=RuntimeError('db down')):
            response = self.client.get('/api/villas/1')

        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertIn('name', data)
        self.assertIn('rooms', data)


if __name__ == '__main__':
    unittest.main()
