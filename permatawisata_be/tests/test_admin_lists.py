import os
import sys
import unittest
from unittest.mock import Mock, patch

import jwt

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from app import app
from security import JWT_ALGORITHM, JWT_SECRET


class AdminListTestCase(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()
        token = jwt.encode(
            {"user_id": 1, "role": "admin"},
            JWT_SECRET,
            algorithm=JWT_ALGORITHM,
        )
        self.headers = {"Authorization": f"Bearer {token}"}

    @patch("routes.manage_villas.get_db_connection")
    @patch("db.get_db_connection")
    def test_admin_villa_list_returns_saved_villas(self, db_connection, route_connection):
        admin_cursor = Mock()
        admin_cursor.fetchone.return_value = {"id": 1}
        db_connection.return_value.cursor.return_value = admin_cursor

        villas = [{"id": 1, "name": "Villa Test"}]
        list_cursor = Mock()
        list_cursor.fetchall.return_value = villas
        route_connection.return_value.cursor.return_value = list_cursor

        response = self.client.get(
            "/api/admin/villas",
            headers=self.headers,
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["data"], villas)

    @patch("routes.payment.get_db_connection")
    def test_admin_payment_list_includes_waiting_verification_bookings(
        self,
        get_db_connection,
    ):
        cursor = Mock()
        cursor.fetchone.return_value = {"id": 1}
        cursor.fetchall.return_value = [
            {
                "id": 22,
                "full_name": "Pelanggan Test",
                "villa_name": "Villa Test",
                "status": "Menunggu Verifikasi",
                "total_price": "1000000.00",
            }
        ]
        connection = Mock()
        connection.cursor.return_value = cursor
        get_db_connection.return_value = connection

        response = self.client.get(
            "/api/admin/payments",
            headers=self.headers,
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["data"][0]["id"], 22)
        self.assertEqual(
            response.get_json()["data"][0]["status"],
            "Menunggu Verifikasi",
        )


if __name__ == "__main__":
    unittest.main()
