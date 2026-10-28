import os
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from app import app


class OwnerChangeRequestReplyTestCase(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()

    @patch("routes.owner_change_requests.get_db_connection")
    @patch("routes.owner_change_requests._get_admin_user_id", return_value=1)
    def test_approval_requires_admin_reply(self, _get_admin_user_id, get_db_connection):
        for payload in ({}, {"admin_note": "   "}):
            with self.subTest(payload=payload):
                response = self.client.put(
                    "/api/admin/change-requests/1/approve",
                    json=payload,
                )

                self.assertEqual(response.status_code, 400)
                self.assertIn("wajib diisi", response.get_json()["error"])

        get_db_connection.assert_not_called()


if __name__ == "__main__":
    unittest.main()
